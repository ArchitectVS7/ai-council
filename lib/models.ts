/**
 * The provider and model vocabulary, in one client-safe place.
 *
 * `lib/llm.ts` is `server-only`, so the curated picker lists cannot live there:
 * the "New session" form on `/` has to render them in the browser. This module
 * imports nothing and is therefore safe on either side of the boundary — the
 * same convention as `lib/chamber/types.ts` and `lib/home/types.ts`.
 *
 * No key material is named here, only provider names and public model ids.
 */

export const PROVIDER_NAMES = ['anthropic', 'openai', 'local', 'mock'] as const

export type ProviderName = (typeof PROVIDER_NAMES)[number]

/** The model used when `LLM_MODEL` is unset — the app default per provider. */
export const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o-mini',
  local: 'llama3.3',
  mock: 'mock',
}

/**
 * The per-provider model list offered by the session picker (PRD Amendment A1).
 *
 * It has two renderings. For the cloud providers the list is *exhaustive* and
 * the picker is a `<select>`: those ids are fixed and public. For `local`
 * (PRD Amendment A2) it is only a *suggestion* list behind a free-text input,
 * because which models an installation has pulled is its own business — the
 * ids here are the common ones, not a closed set.
 *
 * Empty for `mock`: there is one mock model and nothing to choose between, so
 * the picker is hidden rather than shown with a single option that does nothing.
 *
 * One record rather than two keeps a second model vocabulary from drifting away
 * from this one.
 */
export const MODEL_CHOICES: Record<ProviderName, readonly string[]> = {
  anthropic: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  local: ['llama3.3', 'qwen2.5', 'mistral'],
  mock: [],
}

/** Bound shared by the `sessions.model` column, the zod schema, and `getModel`. */
export const MAX_MODEL_LENGTH = 100
