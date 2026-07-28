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

export const PROVIDER_NAMES = ['anthropic', 'openai', 'mock'] as const

export type ProviderName = (typeof PROVIDER_NAMES)[number]

/** The model used when `LLM_MODEL` is unset — the app default per provider. */
export const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o-mini',
  mock: 'mock',
}

/**
 * The curated per-provider list offered by the session model picker
 * (PRD Amendment A1). Empty for `mock`: there is one mock model and nothing to
 * choose between, so the picker is hidden rather than shown with a single
 * option that does nothing.
 */
export const MODEL_CHOICES: Record<ProviderName, readonly string[]> = {
  anthropic: ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  mock: [],
}

/** Bound shared by the `sessions.model` column, the zod schema, and `getModel`. */
export const MAX_MODEL_LENGTH = 100
