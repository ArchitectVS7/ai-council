import 'server-only'

import { z } from 'zod'

import { DEFAULT_MODELS, MAX_MODEL_LENGTH, PROVIDER_NAMES } from '@/lib/models'
import type { ProviderName } from '@/lib/models'
import { readServerEvents } from '@/lib/sse'

/**
 * Server-only LLM provider module.
 *
 * One provider is selected per process by `LLM_PROVIDER` and one model by
 * `LLM_MODEL`. Both are read lazily at call time so that importing this module
 * (typecheck, lint, unit tests, `next build`) never requires an environment.
 * A single call may override the model — that is how a session's own model
 * (PRD Amendment A1) reaches the provider.
 *
 * Streaming is the *only* code path (T-030): `generateStream` talks to the
 * provider, and `generate` is a thin accumulator over it. There is no second,
 * non-streaming request shape that could drift from the first — the whole-text
 * result a caller gets is by construction the concatenation of the deltas.
 *
 * The provider/model vocabulary itself lives in `lib/models.ts`, which is
 * client-safe, so the picker on `/` and this module cannot disagree about what
 * a provider is called or what its default model is.
 *
 * There are no silent fallbacks (PRD R4): a missing key throws, a bad provider
 * name throws, a malformed provider payload throws. The `mock` provider runs
 * only when `LLM_PROVIDER=mock` is set explicitly — never as a rescue path.
 *
 * Providers are called with plain `fetch`; no vendor SDKs are used, keeping the
 * production dependency budget small (PRD §9: "~50 lines, not a framework").
 */

export type GenerateOptions = {
  system: string
  prompt: string
  maxTokens: number
  /** Defaults to 0.7. Honoured by OpenAI; deliberately not sent to Anthropic. */
  temperature?: number
}

export type GenerateResult = {
  text: string
  promptTokens: number
  completionTokens: number
}

/**
 * One step of a streamed completion: either more text, or the finished result.
 *
 * Module-local until a caller names it (R2 / knip): `generateStream`'s consumers
 * read `chunk.type` and infer the rest.
 */
type StreamChunk = { type: 'delta'; text: string } | { type: 'done'; result: GenerateResult }

const providerNameSchema = z.enum(PROVIDER_NAMES)

const API_KEY_VARS: Record<'anthropic' | 'openai', string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
}

const REQUEST_TIMEOUT_MS = 120_000

/**
 * Upper bounds are generous on purpose: a persona prompt carries the council
 * charter plus the running transcript, which the PRD budgets at ~24,000 chars.
 */
const generateOptionsSchema = z.object({
  system: z.string().min(1).max(20_000),
  prompt: z.string().min(1).max(80_000),
  maxTokens: z.number().int().min(1).max(8_192),
  temperature: z.number().min(0).max(2).default(0.7),
})

type PreparedOptions = {
  system: string
  prompt: string
  maxTokens: number
  temperature: number
}

type AnthropicRequestBody = {
  model: string
  max_tokens: number
  system: string
  messages: { role: 'user'; content: string }[]
}

type OpenAIRequestBody = {
  model: string
  max_tokens: number
  temperature: number
  messages: { role: 'system' | 'user'; content: string }[]
}

/** Selects the provider from `LLM_PROVIDER`; unset means `anthropic`. */
export function getProviderName(): ProviderName {
  const raw = process.env.LLM_PROVIDER?.trim()
  if (!raw) return 'anthropic'
  const parsed = providerNameSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(
      `LLM_PROVIDER has an unsupported value ${JSON.stringify(raw)}. ` +
        `Valid values are: ${PROVIDER_NAMES.join(', ')}. Leave it unset to use anthropic.`,
    )
  }
  return parsed.data
}

/**
 * Resolves the model id to use for one call.
 *
 * Precedence: an explicit `override` (a session's own model, PRD Amendment A1)
 * beats `LLM_MODEL`, which beats the provider default. `null`/`undefined` means
 * "no override" and is the ordinary case.
 *
 * A malformed override throws rather than falling back to the env default (R4):
 * silently running a session on a different model than it was created with is
 * exactly the kind of quiet substitution the PRD forbids. Idempotent on an
 * already-resolved id, so the model recorded on a turn is the model sent.
 */
export function getModel(override?: string | null): string {
  if (override !== undefined && override !== null) {
    const trimmed = override.trim()
    if (trimmed.length === 0) {
      throw new Error('Model override is empty. Omit it to use LLM_MODEL or the provider default.')
    }
    if (trimmed.length > MAX_MODEL_LENGTH) {
      throw new Error(
        `Model override is ${trimmed.length} characters; the maximum is ${MAX_MODEL_LENGTH}.`,
      )
    }
    return trimmed
  }

  const configured = process.env.LLM_MODEL?.trim()
  if (configured) return configured
  return DEFAULT_MODELS[getProviderName()]
}

/**
 * Anthropic Messages API body.
 *
 * `temperature` is deliberately omitted: `claude-sonnet-5` (the default model)
 * rejects non-default sampling parameters with a 400, so sending one would
 * break every real call. The option is still honoured by the OpenAI provider
 * and is recorded alongside the turn.
 */
export function buildAnthropicRequest(options: GenerateOptions, model: string): AnthropicRequestBody {
  const prepared = prepareOptions(options)
  return {
    model,
    max_tokens: prepared.maxTokens,
    system: prepared.system,
    messages: [{ role: 'user', content: prepared.prompt }],
  }
}

/** OpenAI chat-completions body. */
export function buildOpenAIRequest(options: GenerateOptions, model: string): OpenAIRequestBody {
  const prepared = prepareOptions(options)
  return {
    model,
    max_tokens: prepared.maxTokens,
    temperature: prepared.temperature,
    messages: [
      { role: 'system', content: prepared.system },
      { role: 'user', content: prepared.prompt },
    ],
  }
}

/**
 * The subset of an Anthropic stream event this module reads.
 *
 * Every field beyond `type` is optional because one schema covers all of
 * `message_start`, `content_block_delta`, `message_delta` and the frames that
 * carry nothing useful; the *presence* rules are enforced per event type below.
 */
const anthropicStreamEventSchema = z.object({
  type: z.string(),
  message: z.object({ usage: z.object({ input_tokens: z.number() }) }).optional(),
  delta: z.object({ type: z.string().optional(), text: z.string().optional() }).optional(),
  usage: z.object({ output_tokens: z.number() }).optional(),
})

const openAIStreamChunkSchema = z.object({
  choices: z.array(z.object({ delta: z.object({ content: z.string().nullish() }).optional() })),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).nullish(),
})

const MOCK_OPENERS = [
  'The mock provider answers this turn offline.',
  'Offline stand-in output for one council turn.',
  'This text is derived only from the request, with no network call.',
  'A deterministic stand-in reply for the current turn.',
  'No provider was contacted to produce this turn.',
]

const MOCK_MIDDLES = [
  'It restates the charter in one line and stops there.',
  'It names the strongest objection and leaves it on the record.',
  'It keeps to a single claim so the round stays readable.',
  'It marks one open question for the next persona to pick up.',
  'It repeats the seat brief so the reader can follow along.',
  'It notes where the evidence is thin.',
]

const MOCK_CLOSERS = [
  'Set LLM_PROVIDER to a real provider for genuine output.',
  'Nothing here reflects a model judgement.',
  'Use this only for offline runs and tests.',
  'The Chair should treat this as filler, not substance.',
]

/**
 * Deterministic offline output: identical options always yield an identical
 * result, and any change to the options changes the text. Pure — no clock, no
 * randomness, no environment reads.
 */
export function mockGenerate(options: GenerateOptions): GenerateResult {
  const prepared = prepareOptions(options)
  const seed = hash32(
    [prepared.system, prepared.prompt, String(prepared.maxTokens), prepared.temperature.toFixed(4)].join(' '),
  )
  const sentences = [
    MOCK_OPENERS[seed % MOCK_OPENERS.length],
    MOCK_MIDDLES[seed % MOCK_MIDDLES.length],
    MOCK_CLOSERS[seed % MOCK_CLOSERS.length],
  ]
  // Rough word budget so `maxTokens` visibly shapes the output length.
  const wordBudget = Math.max(4, Math.floor(prepared.maxTokens * 0.75))
  const body = sentences.join(' ').split(' ').slice(0, wordBudget).join(' ')
  const text = `MOCK[${seed.toString(36)}]\n${body}`
  return {
    text,
    promptTokens: Math.ceil((prepared.system.length + prepared.prompt.length) / 4),
    completionTokens: Math.ceil(text.length / 4),
  }
}

/**
 * How many characters of the mock's deterministic output go in one chunk.
 *
 * Purely cosmetic — it only decides how many pieces the offline provider hands
 * back. The concatenation is byte-identical to `mockGenerate(...).text` because
 * the text is *sliced*, never re-joined.
 */
const MOCK_CHUNK_CHARS = 40

function sliceForStream(text: string): string[] {
  // At least two pieces whenever there is anything to split, so a test that
  // asserts "chunks accumulate" is actually exercising accumulation.
  const size = Math.max(1, Math.min(MOCK_CHUNK_CHARS, Math.ceil(text.length / 2)))
  const pieces: string[] = []
  for (let index = 0; index < text.length; index += size) {
    pieces.push(text.slice(index, index + size))
  }
  return pieces
}

/**
 * Streams one completion from the configured provider (PRD §10, M3).
 *
 * The single provider entry point: `generate` accumulates this, so there is no
 * separate non-streaming request to keep in step. Throws — never yields a
 * placeholder — when the provider is unknown, its key is absent, the options are
 * invalid, or the provider sends anything this module cannot read.
 *
 * `signal` aborts the in-flight request. The caller decides what an abort means;
 * this module only stops and lets the error out (R4).
 */
export async function* generateStream(
  options: GenerateOptions,
  modelOverride?: string | null,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const provider = getProviderName()

  if (provider === 'mock') {
    // Deliberately not part of the mock hash seed: mock output is a function of
    // the prompt alone, so switching model must not shift a deterministic fixture.
    const result = mockGenerate(options)
    for (const piece of sliceForStream(result.text)) {
      signal?.throwIfAborted()
      yield { type: 'delta', text: piece }
    }
    signal?.throwIfAborted()
    yield { type: 'done', result }
    return
  }

  const key = requireApiKey(provider)
  const model = getModel(modelOverride)

  if (provider === 'anthropic') {
    yield* streamAnthropic(options, model, key, signal)
    return
  }
  yield* streamOpenAI(options, model, key, signal)
}

/**
 * Runs one completion and returns it whole.
 *
 * A pure accumulation of `generateStream`, which is what makes "the streamed
 * chunks equal the non-streamed output" true by construction rather than by
 * two implementations agreeing.
 */
export async function generate(
  options: GenerateOptions,
  modelOverride?: string | null,
): Promise<GenerateResult> {
  for await (const chunk of generateStream(options, modelOverride)) {
    if (chunk.type === 'done') return chunk.result
  }
  throw new Error('The provider stream ended without a completion event.')
}

async function* streamAnthropic(
  options: GenerateOptions,
  model: string,
  key: string,
  signal: AbortSignal | undefined,
): AsyncGenerator<StreamChunk> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ ...buildAnthropicRequest(options, model), stream: true }),
    signal: requestSignal(signal),
  })
  const body = await requireStreamBody(response, 'Anthropic')

  let text = ''
  let promptTokens: number | null = null
  let completionTokens: number | null = null

  for await (const frame of readServerEvents(body)) {
    signal?.throwIfAborted()
    // Verbatim provider text: the caller records it on the failed turn.
    if (frame.event === 'error') throw new Error(`Anthropic stream error: ${frame.data}`)
    if (frame.event === 'ping') continue

    const event = parseStreamPayload(anthropicStreamEventSchema, frame.data, 'Anthropic')
    if (event.type === 'message_start') {
      promptTokens = event.message?.usage.input_tokens ?? null
    } else if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      const piece = event.delta.text ?? ''
      text += piece
      yield { type: 'delta', text: piece }
    } else if (event.type === 'message_delta') {
      completionTokens = event.usage?.output_tokens ?? completionTokens
    }
  }

  yield { type: 'done', result: finish(text, promptTokens, completionTokens, 'Anthropic') }
}

async function* streamOpenAI(
  options: GenerateOptions,
  model: string,
  key: string,
  signal: AbortSignal | undefined,
): AsyncGenerator<StreamChunk> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      ...buildOpenAIRequest(options, model),
      stream: true,
      // Without this the usage totals never arrive and the turn would record no
      // token counts at all.
      stream_options: { include_usage: true },
    }),
    signal: requestSignal(signal),
  })
  const body = await requireStreamBody(response, 'OpenAI')

  let text = ''
  let promptTokens: number | null = null
  let completionTokens: number | null = null

  for await (const frame of readServerEvents(body)) {
    signal?.throwIfAborted()
    if (frame.data === '[DONE]') break

    const chunk = parseStreamPayload(openAIStreamChunkSchema, frame.data, 'OpenAI')
    const piece = chunk.choices[0]?.delta?.content
    if (typeof piece === 'string' && piece.length > 0) {
      text += piece
      yield { type: 'delta', text: piece }
    }
    // Usage rides on the final chunk, whose `choices` array is empty.
    if (chunk.usage) {
      promptTokens = chunk.usage.prompt_tokens
      completionTokens = chunk.usage.completion_tokens
    }
  }

  yield { type: 'done', result: finish(text, promptTokens, completionTokens, 'OpenAI') }
}

/**
 * The request's abort signal: the caller's, the timeout, or both.
 *
 * `AbortSignal.any` needs Node ≥20.3; `package.json` requires ≥20 and CI runs 22.
 */
function requestSignal(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}

async function requireStreamBody(response: Response, label: string): Promise<NonNullable<Response['body']>> {
  if (!response.ok) {
    // Verbatim provider text, in the wording the transcript has always stored:
    // the caller records it on the failed turn.
    throw new Error(`${label} request failed (${response.status}): ${await response.text()}`)
  }
  if (!response.body) {
    throw new Error(`${label} accepted the request but returned no stream to read.`)
  }
  return response.body
}

function parseStreamPayload<T>(schema: z.ZodType<T>, raw: string, label: string): T {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error(`${label} sent a stream frame that is not JSON: ${summarize(raw)}`)
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`${label} stream frame is malformed: ${issuesOf(parsed.error)}. Payload: ${summarize(json)}`)
  }
  return parsed.data
}

/** Turns the accumulated stream state into a result, or throws saying why it cannot. */
function finish(
  text: string,
  promptTokens: number | null,
  completionTokens: number | null,
  label: string,
): GenerateResult {
  if (text.length === 0) {
    throw new Error(`${label} stream contained no text.`)
  }
  if (promptTokens === null || completionTokens === null) {
    throw new Error(`${label} stream ended without usage totals; the turn's token counts are unknown.`)
  }
  return { text, promptTokens, completionTokens }
}

function requireApiKey(provider: 'anthropic' | 'openai'): string {
  const name = API_KEY_VARS[provider]
  const key = process.env[name]?.trim()
  if (!key) {
    throw new Error(
      `${name} is not set. LLM_PROVIDER=${provider} requires it. Set the key in .env.local, ` +
        `or set LLM_PROVIDER=mock to run offline — there is no automatic fallback to the mock provider.`,
    )
  }
  return key
}

function prepareOptions(options: GenerateOptions): PreparedOptions {
  const parsed = generateOptionsSchema.safeParse(options)
  if (!parsed.success) {
    throw new Error(`Invalid generate options: ${issuesOf(parsed.error)}`)
  }
  return {
    system: sanitize(parsed.data.system, 'system'),
    prompt: sanitize(parsed.data.prompt, 'prompt'),
    maxTokens: parsed.data.maxTokens,
    temperature: parsed.data.temperature,
  }
}

/**
 * Strips script blocks and control characters, then trims.
 *
 * Narrower than the v1 helper on purpose: v1 also stripped every `<...>` tag
 * (which would mangle transcript prose) and silently truncated at 10,000 chars
 * (a silent fallback). Length is enforced by the schema above, which throws.
 */
function sanitize(value: string, field: string): string {
  const cleaned = stripControlChars(value.replace(SCRIPT_BLOCK, '')).trim()
  if (cleaned.length === 0) {
    throw new Error(`Invalid generate options: ${field} is empty after sanitization.`)
  }
  return cleaned
}

const SCRIPT_BLOCK = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi

function stripControlChars(value: string): string {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (code === 0x7f) continue
    if (code < 0x20 && char !== '\n' && char !== '\r' && char !== '\t') continue
    out += char
  }
  return out
}

/** djb2, salvaged from v1. 32-bit unsigned so the marker is stable everywhere. */
function hash32(value: string): number {
  let h = 5381
  for (let i = 0; i < value.length; i += 1) {
    h = (((h << 5) + h + value.charCodeAt(i)) & 0xffffffff) >>> 0
  }
  return h
}

function issuesOf(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')
}

function summarize(json: unknown): string {
  let text: string
  try {
    text = JSON.stringify(json) ?? String(json)
  } catch {
    text = String(json)
  }
  return text.length > 400 ? `${text.slice(0, 400)}…` : text
}
