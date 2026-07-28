import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildAnthropicRequest,
  buildOpenAIRequest,
  generate,
  getModel,
  getProviderName,
  mockGenerate,
  parseAnthropicResponse,
  parseOpenAIResponse,
  type GenerateOptions,
  type GenerateResult,
} from './llm'
import { MAX_MODEL_LENGTH, type ProviderName } from './models'

const ENV_KEYS = ['LLM_PROVIDER', 'LLM_MODEL', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY'] as const

const OPTIONS: GenerateOptions = {
  system: 'You are the Chair of a three-seat council.',
  prompt: 'Open the round and state the question under review.',
  maxTokens: 700,
}

let saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}
let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  saved = {}
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  // Unit tests must never touch the network; any call is a hard failure.
  fetchSpy = vi.fn(() => {
    throw new Error('fetch must not be called in unit tests')
  })
  vi.stubGlobal('fetch', fetchSpy)
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  vi.unstubAllGlobals()
})

describe('getProviderName', () => {
  it('defaults to anthropic when LLM_PROVIDER is unset or blank', () => {
    expect(getProviderName()).toBe('anthropic')
    process.env.LLM_PROVIDER = '   '
    expect(getProviderName()).toBe('anthropic')
  })

  it('returns each supported provider', () => {
    const providers: ProviderName[] = ['anthropic', 'openai', 'mock']
    for (const provider of providers) {
      process.env.LLM_PROVIDER = provider
      expect(getProviderName()).toBe(provider)
    }
  })

  it('throws loudly on an unsupported value — no fallback (R4)', () => {
    process.env.LLM_PROVIDER = 'gemini'
    expect(() => getProviderName()).toThrowError(/LLM_PROVIDER/)
    expect(() => getProviderName()).toThrowError(/anthropic, openai, mock/)
  })
})

describe('getModel', () => {
  it('falls back to the per-provider default model', () => {
    expect(getModel()).toBe('claude-sonnet-5')
    process.env.LLM_PROVIDER = 'openai'
    expect(getModel()).toBe('gpt-4o-mini')
    process.env.LLM_PROVIDER = 'mock'
    expect(getModel()).toBe('mock')
  })

  it('prefers LLM_MODEL when it is set', () => {
    process.env.LLM_MODEL = ' claude-opus-5 '
    expect(getModel()).toBe('claude-opus-5')
  })

  it('prefers an explicit override over LLM_MODEL and the provider default (A1)', () => {
    process.env.LLM_MODEL = 'gpt-4o-mini'
    expect(getModel('claude-opus-5')).toBe('claude-opus-5')
    expect(getModel('  claude-opus-5  ')).toBe('claude-opus-5')
  })

  it('is idempotent, so the model recorded on a turn is the model that was sent', () => {
    expect(getModel(getModel('claude-haiku-4-5-20251001'))).toBe('claude-haiku-4-5-20251001')
  })

  it('treats null and undefined as "no override" and falls back as before', () => {
    expect(getModel(null)).toBe('claude-sonnet-5')
    expect(getModel(undefined)).toBe('claude-sonnet-5')
    process.env.LLM_MODEL = 'gpt-4o'
    expect(getModel(null)).toBe('gpt-4o')
  })

  it('throws on a blank override instead of silently using the env default (R4)', () => {
    process.env.LLM_MODEL = 'gpt-4o'
    expect(() => getModel('')).toThrowError(/empty/i)
    expect(() => getModel('   ')).toThrowError(/empty/i)
  })

  it('throws on an oversized override', () => {
    expect(() => getModel('x'.repeat(MAX_MODEL_LENGTH + 1))).toThrowError(
      new RegExp(String(MAX_MODEL_LENGTH)),
    )
    expect(getModel('x'.repeat(MAX_MODEL_LENGTH))).toHaveLength(MAX_MODEL_LENGTH)
  })
})

describe('generate honours a per-call model override (Amendment A1)', () => {
  /** Captures the request body a provider call would have sent. */
  function stubAnthropic() {
    const spy = vi.fn(async (_url: string, init: RequestInit) => {
      void init
      return {
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ type: 'text', text: 'A measured opening.' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      } as unknown as Response
    })
    vi.stubGlobal('fetch', spy)
    return spy
  }

  beforeEach(() => {
    process.env.LLM_PROVIDER = 'anthropic'
    process.env.ANTHROPIC_API_KEY = 'sk-test'
  })

  it('sends the override as the request model', async () => {
    const spy = stubAnthropic()
    await generate(OPTIONS, 'claude-haiku-4-5-20251001')

    const body = JSON.parse(String(spy.mock.calls[0][1].body)) as { model: string }
    expect(body.model).toBe('claude-haiku-4-5-20251001')
  })

  it('sends the env default when no override is given', async () => {
    process.env.LLM_MODEL = 'claude-sonnet-5'
    const spy = stubAnthropic()
    await generate(OPTIONS)

    const body = JSON.parse(String(spy.mock.calls[0][1].body)) as { model: string }
    expect(body.model).toBe('claude-sonnet-5')
  })

  it('refuses a malformed override before reaching the provider', async () => {
    const spy = stubAnthropic()
    await expect(generate(OPTIONS, '   ')).rejects.toThrowError(/empty/i)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('mock provider determinism', () => {
  beforeEach(() => {
    process.env.LLM_PROVIDER = 'mock'
  })

  it('returns identical output for identical input', async () => {
    const first = await generate(OPTIONS)
    const second = await generate({ ...OPTIONS })
    expect(first).toEqual(second)
    expect(first.text.length).toBeGreaterThan(0)
    expect(Number.isInteger(first.promptTokens)).toBe(true)
    expect(first.promptTokens).toBeGreaterThan(0)
    expect(Number.isInteger(first.completionTokens)).toBe(true)
    expect(first.completionTokens).toBeGreaterThan(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('changes the output when any input changes', () => {
    const base: GenerateResult = mockGenerate(OPTIONS)
    const texts = new Set([
      base.text,
      mockGenerate({ ...OPTIONS, prompt: `${OPTIONS.prompt} Also note the dissent.` }).text,
      mockGenerate({ ...OPTIONS, system: `${OPTIONS.system} Keep it short.` }).text,
      mockGenerate({ ...OPTIONS, maxTokens: 701 }).text,
      mockGenerate({ ...OPTIONS, temperature: 0.2 }).text,
    ])
    expect(texts.size).toBe(5)
  })

  it('never reaches the network', async () => {
    await generate(OPTIONS)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('ignores a model override — mock output is a function of the prompt alone', async () => {
    const plain = await generate(OPTIONS)
    const overridden = await generate(OPTIONS, 'claude-opus-5')
    expect(overridden).toEqual(plain)
  })
})

describe('missing provider key', () => {
  it('names ANTHROPIC_API_KEY and the offline escape hatch', async () => {
    process.env.LLM_PROVIDER = 'anthropic'
    await expect(generate(OPTIONS)).rejects.toThrowError(/ANTHROPIC_API_KEY/)
    await expect(generate(OPTIONS)).rejects.toThrowError(/mock/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('names OPENAI_API_KEY and the offline escape hatch', async () => {
    process.env.LLM_PROVIDER = 'openai'
    await expect(generate(OPTIONS)).rejects.toThrowError(/OPENAI_API_KEY/)
    await expect(generate(OPTIONS)).rejects.toThrowError(/mock/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('treats a blank key as missing', async () => {
    process.env.LLM_PROVIDER = 'anthropic'
    process.env.ANTHROPIC_API_KEY = '   '
    await expect(generate(OPTIONS)).rejects.toThrowError(/ANTHROPIC_API_KEY/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('option validation', () => {
  it('rejects an empty prompt', () => {
    expect(() => buildOpenAIRequest({ ...OPTIONS, prompt: '' }, 'm')).toThrowError(/prompt/)
  })

  it('rejects an empty system charter', () => {
    expect(() => buildOpenAIRequest({ ...OPTIONS, system: '' }, 'm')).toThrowError(/system/)
  })

  it('rejects out-of-range maxTokens', () => {
    expect(() => buildOpenAIRequest({ ...OPTIONS, maxTokens: 0 }, 'm')).toThrowError(/maxTokens/)
    expect(() => buildOpenAIRequest({ ...OPTIONS, maxTokens: 99_999 }, 'm')).toThrowError(/maxTokens/)
    expect(() => buildOpenAIRequest({ ...OPTIONS, maxTokens: 12.5 }, 'm')).toThrowError(/maxTokens/)
  })

  it('rejects out-of-range temperature', () => {
    expect(() => buildOpenAIRequest({ ...OPTIONS, temperature: 3 }, 'm')).toThrowError(/temperature/)
  })

  it('rejects an over-length prompt instead of truncating it', () => {
    expect(() => buildOpenAIRequest({ ...OPTIONS, prompt: 'a'.repeat(80_001) }, 'm')).toThrowError(/prompt/)
  })

  it('defaults temperature to 0.7', () => {
    expect(buildOpenAIRequest(OPTIONS, 'gpt-4o-mini').temperature).toBe(0.7)
  })
})

describe('sanitization', () => {
  it('removes script blocks but keeps the surrounding prose', () => {
    const body = buildOpenAIRequest(
      { ...OPTIONS, prompt: '<script>alert(1)</script>real content' },
      'gpt-4o-mini',
    )
    expect(body.messages[1].content).toBe('real content')
  })

  it('keeps angle brackets that are not script blocks', () => {
    const body = buildOpenAIRequest({ ...OPTIONS, prompt: 'compare a < b to a > b' }, 'gpt-4o-mini')
    expect(body.messages[1].content).toBe('compare a < b to a > b')
  })

  it('throws when the prompt is empty after sanitization', () => {
    expect(() => buildOpenAIRequest({ ...OPTIONS, prompt: '<script>alert(1)</script>' }, 'm')).toThrowError(
      /empty after sanitization/,
    )
  })
})

describe('request builders', () => {
  it('builds an Anthropic body without temperature', () => {
    const body = buildAnthropicRequest(OPTIONS, 'claude-sonnet-5')
    expect(body).toEqual({
      model: 'claude-sonnet-5',
      max_tokens: 700,
      system: OPTIONS.system,
      messages: [{ role: 'user', content: OPTIONS.prompt }],
    })
    // claude-sonnet-5 rejects non-default sampling parameters with a 400.
    expect(body).not.toHaveProperty('temperature')
  })

  it('builds an OpenAI body with system and user turns', () => {
    const body = buildOpenAIRequest({ ...OPTIONS, temperature: 0.3 }, 'gpt-4o-mini')
    expect(body).toEqual({
      model: 'gpt-4o-mini',
      max_tokens: 700,
      temperature: 0.3,
      messages: [
        { role: 'system', content: OPTIONS.system },
        { role: 'user', content: OPTIONS.prompt },
      ],
    })
  })
})

describe('response parsers', () => {
  it('reads text and usage from an Anthropic payload', () => {
    const result = parseAnthropicResponse({
      content: [
        { type: 'thinking', thinking: 'ignored' },
        { type: 'text', text: 'A measured opening.' },
      ],
      usage: { input_tokens: 120, output_tokens: 34 },
    })
    expect(result).toEqual({ text: 'A measured opening.', promptTokens: 120, completionTokens: 34 })
  })

  it('throws on an Anthropic payload with no text block', () => {
    expect(() =>
      parseAnthropicResponse({ content: [{ type: 'thinking' }], usage: { input_tokens: 1, output_tokens: 1 } }),
    ).toThrowError(/no text block/)
  })

  it('throws on an Anthropic payload with no usage', () => {
    expect(() => parseAnthropicResponse({ content: [{ type: 'text', text: 'hi' }] })).toThrowError(/malformed/)
  })

  it('reads text and usage from an OpenAI payload', () => {
    const result = parseOpenAIResponse({
      choices: [{ message: { content: 'A measured opening.' } }],
      usage: { prompt_tokens: 90, completion_tokens: 21 },
    })
    expect(result).toEqual({ text: 'A measured opening.', promptTokens: 90, completionTokens: 21 })
  })

  it('throws on an OpenAI payload with null content instead of defaulting to empty text', () => {
    expect(() =>
      parseOpenAIResponse({
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    ).toThrowError(/malformed/)
  })

  it('throws on an OpenAI payload with no usage instead of defaulting to zero', () => {
    expect(() => parseOpenAIResponse({ choices: [{ message: { content: 'hi' } }] })).toThrowError(/malformed/)
  })
})
