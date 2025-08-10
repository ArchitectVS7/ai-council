import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit'
import { completionRequestSchema, validateAndSanitizePrompt } from '../../../lib/validation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Body = {
  prompt: string
  system?: string
  model?: string
  temperature?: number
  max_tokens?: number
}

export async function POST(req: Request) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(req)
    const rateLimitResult = await rateLimit(clientId, defaultRateLimits.completion, 'completion')
    
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        }
      )
    }

    // Input validation
    const body = await req.json()
    const validationResult = completionRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { prompt, system, model, temperature = 0.7, maxTokens: max_tokens = 512 } = validationResult.data

    // Sanitize prompt
    const sanitizedPrompt = validateAndSanitizePrompt(prompt)
    const sanitizedSystem = system ? validateAndSanitizePrompt(system) : undefined

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    // Choose provider by env/model hint, else mock.
    // Prioritize OpenAI if both keys are present
    if (openaiKey) {
      const openaiModel = model || 'gpt-4o-mini'
      const body = {
        model: openaiModel,
        temperature,
        max_tokens,
        messages: [
          ...(sanitizedSystem ? [{ role: 'system', content: sanitizedSystem }] : []),
          { role: 'user', content: sanitizedPrompt },
        ],
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text()
        return Response.json({ error: `OpenAI error: ${text}` }, { status: res.status })
      }
      const data = (await res.json()) as any
      const text: string = data?.choices?.[0]?.message?.content ?? ''
      return Response.json({ text }, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      })
    }

    if (anthropicKey) {
      const anthropicModel = model || 'claude-3-5-sonnet-latest'
      const body = {
        model: anthropicModel,
        max_tokens: max_tokens,
        temperature,
        messages: [{ role: 'user', content: sanitizedPrompt }],
        ...(sanitizedSystem ? { system: sanitizedSystem } : {}),
      }
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text()
        return Response.json({ error: `Anthropic error: ${text}` }, { status: res.status })
      }
      const data = (await res.json()) as any
      const text: string = data?.content?.[0]?.text ?? ''
      return Response.json({ text }, {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      })
    }

    // Mock fallback for local dev without keys
    const mock = mockComplete({ prompt: sanitizedPrompt, system: sanitizedSystem })
    return Response.json({ text: mock }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    })
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}

function mockComplete({ prompt, system }: { prompt: string; system?: string }) {
  const header = system ? `[SYS:${hash(system)}]` : '[SYS:none]'
  const p = prompt.slice(0, 140).replace(/\s+/g, ' ').trim()
  return `${header} MOCK: ${p}\n\n- Point A derived from context\n- Point B considers counterarguments\n- Point C suggests next steps`
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}
