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
    const { prompt, system, model, temperature = 0.7, max_tokens = 512 } = (await req.json()) as Body
    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'Missing prompt' }, { status: 400 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    // Choose provider by env/model hint, else mock.
    if (anthropicKey) {
      const anthropicModel = model || 'claude-3-5-sonnet-latest'
      const body = {
        model: anthropicModel,
        max_tokens: max_tokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
        ...(system ? { system } : {}),
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
      return Response.json({ text })
    }

    if (openaiKey) {
      const openaiModel = model || 'gpt-4o-mini'
      const body = {
        model: openaiModel,
        temperature,
        max_tokens,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
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
      return Response.json({ text })
    }

    // Mock fallback for local dev without keys
    const mock = mockComplete({ prompt, system })
    return Response.json({ text: mock })
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
