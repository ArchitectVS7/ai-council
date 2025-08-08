"use client"

import { useCallback, useMemo, useState } from 'react'
import { AppConfig, Message, buildPrompt, defaultConfig, nextStep } from '@/lib/stateMachine'

async function complete({ prompt, system }: { prompt: string; system: string }) {
  const res = await fetch('/api/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, system }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Completion failed')
  return (data?.text as string) || ''
}

export default function DebateArena() {
  const cfg = useMemo<AppConfig>(() => defaultConfig(), [])
  const [topic, setTopic] = useState('')
  const [cursor, setCursor] = useState(0)
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [debug, setDebug] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const step = nextStep(cfg, cursor)

  const onStart = useCallback(async () => {
    setMessages([])
    setContext('')
    setCursor(0)
    setDebug((d) => [...d, `Start: topic=${topic || '(empty)'}`])
    if (!topic.trim()) return
    await run()
  }, [topic])

  const run = useCallback(async () => {
    const s = nextStep(cfg, cursor)
    if (!s) {
      setDebug((d) => [...d, 'Flow complete. Final analysis to be added in later phase.'])
      return
    }
    setBusy(true)
    try {
      const { system, user } = buildPrompt({ persona: s.persona, context, topic })
      setDebug((d) => [...d, `Step ${s.index + 1} (Round ${s.round}) → ${s.persona.name}`])
      const output = await complete({ prompt: user, system })
      const ts = new Date().toISOString()
      setMessages((m) => [
        ...m,
        { persona: s.persona.name, personaId: s.persona.id, content: output, timestamp: ts, round: s.round },
      ])
      setContext(output)
      setCursor((c) => c + 1)
    } catch (e: any) {
      setDebug((d) => [...d, `Error: ${e?.message || e}`])
    } finally {
      setBusy(false)
    }
  }, [cfg, cursor, context, topic])

  const onContinue = useCallback(async () => {
    await run()
  }, [run])

  return (
    <div className="w-full max-w-5xl">
      <section className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Topic</label>
        <textarea
          className="w-full h-28 rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-gray-800"
          placeholder="e.g., What are the societal impacts of widespread AI adoption?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={busy}
        />
        <div className="flex gap-3">
          <button
            onClick={onStart}
            className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? 'Working…' : 'Start'}
          </button>
          <button
            onClick={onContinue}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
            disabled={busy || !step || !topic.trim()}
          >
            Continue
          </button>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 p-4 bg-white/30 backdrop-blur-lg">
          <h2 className="text-lg font-semibold mb-2">Transcript</h2>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-600">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="text-sm">
                  <div className="font-medium">{m.persona} <span className="text-gray-500">(Round {m.round})</span></div>
                  <pre className="whitespace-pre-wrap text-gray-800">{m.content}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 p-4 bg-white/30 backdrop-blur-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Log</h2>
          <div className="text-xs text-gray-700 space-y-1 max-h-56 overflow-auto">
            {debug.length === 0 && (
              <p className="text-gray-500">No events yet.</p>
            )}
            {debug.map((line, i) => (
              <div key={i}>• {line}</div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
