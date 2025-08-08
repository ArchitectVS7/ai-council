export type PersonaConfig = { id: number; name: string; role: string; task: string }
export type Message = { persona: string; personaId: number; content: string; timestamp: string; round: number | 'Final' }

export type AppConfig = {
  personas: PersonaConfig[]
  stateFlow: number[] // indices into personas
  numRounds: number
}

export function defaultConfig(): AppConfig {
  const personas: PersonaConfig[] = [
    { id: 1, name: 'Moderator', role: 'Moderator', task: 'Extract concise bullet points and ensure clarity.' },
    { id: 2, name: 'Empathy Advocate', role: 'Empathy Advocate', task: 'Consider human impact, ethics, and inclusion.' },
    { id: 3, name: 'Skeptical Academic', role: 'Skeptical Academic', task: 'Challenge assumptions with evidence and rigor.' },
  ]
  // one cycle: empathy -> moderator -> skeptic -> moderator
  const stateFlow = [2, 1, 3, 1].map((pid) => personas.findIndex((p) => p.id === pid))
  return { personas, stateFlow, numRounds: 2 }
}

export type Step = {
  index: number
  round: number
  persona: PersonaConfig
}

export function computeRound(index: number, flowLen: number, numRounds: number): number {
  if (flowLen === 0 || numRounds <= 0) return 1
  const perRound = Math.max(1, Math.floor(flowLen))
  return Math.floor(index / perRound) + 1
}

export function nextStep(cfg: AppConfig, cursor: number): Step | null {
  const total = cfg.stateFlow.length * cfg.numRounds
  if (cursor >= total) return null
  const flowIdx = cursor % cfg.stateFlow.length
  const personaIdx = cfg.stateFlow[flowIdx]
  const persona = cfg.personas[personaIdx]
  const round = computeRound(cursor, cfg.stateFlow.length, cfg.numRounds)
  return { index: cursor, round, persona }
}

export function buildPrompt({ persona, context, topic }: { persona: PersonaConfig; context: string; topic: string }) {
  const system = `${persona.role}: ${persona.task}`
  const user = `Topic: ${topic}\n\nContext:\n${context || '(none)'}\n\nRespond as ${persona.name}. Be concise.`
  return { system, user }
}

export function extractBullets(text: string): string[] {
  const lines = text.split(/\r?\n/)
  const bullets = lines
    .map((l) => l.trim())
    .filter((l) => /^[-*•]/.test(l))
    .map((l) => l.replace(/^[-*•]\s?/, ''))
  return bullets.slice(0, 10)
}
