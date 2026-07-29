/**
 * The provider/model vocabulary (PRD Amendment A1).
 *
 * Pure data, so these are consistency checks: the picker can only offer models
 * for providers that exist, and "Provider default" must never name a model the
 * curated list disowns.
 */
import { describe, expect, it } from 'vitest'

import { DEFAULT_MODELS, MAX_MODEL_LENGTH, MODEL_CHOICES, PROVIDER_NAMES } from './models'

describe('model vocabulary', () => {
  it('covers exactly the supported providers', () => {
    expect(Object.keys(MODEL_CHOICES).sort()).toEqual([...PROVIDER_NAMES].sort())
    expect(Object.keys(DEFAULT_MODELS).sort()).toEqual([...PROVIDER_NAMES].sort())
  })

  it.each(['anthropic', 'openai', 'local'] as const)(
    'offers %s a list that contains its own default model',
    (provider) => {
      expect(MODEL_CHOICES[provider].length).toBeGreaterThan(0)
      expect(MODEL_CHOICES[provider]).toContain(DEFAULT_MODELS[provider])
    },
  )

  it('offers nothing for mock, so the picker is hidden rather than inert', () => {
    expect(MODEL_CHOICES.mock).toEqual([])
  })

  it('offers local a suggestion list, since installed models vary by machine (A2)', () => {
    expect(MODEL_CHOICES.local).toEqual(['llama3.3', 'qwen2.5', 'mistral'])
  })

  it('lists only ids the session schema and the column will accept', () => {
    for (const provider of PROVIDER_NAMES) {
      for (const id of MODEL_CHOICES[provider]) {
        expect(id.trim()).toBe(id)
        expect(id.length).toBeGreaterThan(0)
        expect(id.length).toBeLessThanOrEqual(MAX_MODEL_LENGTH)
      }
    }
  })

  it('lists each id once per provider', () => {
    for (const provider of PROVIDER_NAMES) {
      const ids = MODEL_CHOICES[provider]
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
