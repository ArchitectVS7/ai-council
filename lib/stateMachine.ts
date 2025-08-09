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
  const bullets: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Match bullet points with various formats: •, -, *, 1., etc.
    const bulletMatch = trimmed.match(/^(?:[•\-\*]|\d+\.)\s+(.+)/)
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim())
    }
    // Also capture lines that start with capital letters and end with periods/colons
    else if (trimmed.length > 10 && /^[A-Z].*[.:]$/.test(trimmed)) {
      bullets.push(trimmed)
    }
  }
  
  return bullets.slice(0, 10) // Limit to 10 most important bullets
}

export function buildFinalAnalysisPrompt({ 
  topic, 
  messages, 
  bulletPoints 
}: { 
  topic: string
  messages: Message[]
  bulletPoints: string[]
}) {
  const system = `You are a Final Moderator responsible for synthesizing debate discussions into comprehensive analysis. 
Your task is to:
1. Summarize the key arguments and perspectives
2. Identify points of consensus and disagreement
3. Extract the most valuable insights
4. Highlight outstanding questions
5. Provide balanced recommendations

Be objective, thorough, and constructive.`

  const transcript = messages.map((m, i) => 
    `**Round ${m.round} - ${m.persona}:**\n${m.content}`
  ).join('\n\n')

  const bullets = bulletPoints.length > 0 
    ? `\n\n**Key Points Identified:**\n${bulletPoints.map(b => `• ${b}`).join('\n')}`
    : ''

  const user = `**Topic:** ${topic}

**Debate Transcript:**
${transcript}${bullets}

**Please provide a comprehensive final analysis with the following sections:**

## Executive Summary
Brief overview of the debate and main findings.

## Key Arguments
### Arguments For
Main supporting arguments and evidence.

### Arguments Against  
Main opposing arguments and counterpoints.

## Points of Consensus
Areas where participants agreed or found common ground.

## Outstanding Questions
Important questions that remain unresolved.

## Recommendations
Balanced recommendations based on the discussion.

## Conclusion
Final synthesis and next steps.`

  return { system, user }
}

export type FinalAnalysis = {
  executiveSummary: string
  keyArguments: {
    for: string[]
    against: string[]
  }
  consensusPoints: string[]
  outstandingQuestions: string[]
  recommendations: string[]
  conclusion: string
}

export function parseFinalAnalysis(analysisText: string): FinalAnalysis {
  const sections = {
    executiveSummary: '',
    keyArguments: { for: [] as string[], against: [] as string[] },
    consensusPoints: [] as string[],
    outstandingQuestions: [] as string[],
    recommendations: [] as string[],
    conclusion: ''
  }

  const lines = analysisText.split('\n')
  let currentSection = ''

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Detect section headers
    if (trimmed.match(/^#+\s*Executive Summary/i)) {
      currentSection = 'executiveSummary'
      continue
    } else if (trimmed.match(/^#+\s*Arguments? For/i)) {
      currentSection = 'argumentsFor'
      continue
    } else if (trimmed.match(/^#+\s*Arguments? Against/i)) {
      currentSection = 'argumentsAgainst'
      continue
    } else if (trimmed.match(/^#+\s*Points? of Consensus/i)) {
      currentSection = 'consensusPoints'
      continue
    } else if (trimmed.match(/^#+\s*Outstanding Questions?/i)) {
      currentSection = 'outstandingQuestions'
      continue
    } else if (trimmed.match(/^#+\s*Recommendations?/i)) {
      currentSection = 'recommendations'
      continue
    } else if (trimmed.match(/^#+\s*Conclusions?/i)) {
      currentSection = 'conclusion'
      continue
    }

    // Parse content based on current section
    if (trimmed.length > 0) {
      switch (currentSection) {
        case 'executiveSummary':
          sections.executiveSummary += (sections.executiveSummary ? ' ' : '') + trimmed
          break
        case 'argumentsFor':
          if (trimmed.match(/^[-*•]/)) {
            sections.keyArguments.for.push(trimmed.replace(/^[-*•]\s?/, ''))
          }
          break
        case 'argumentsAgainst':
          if (trimmed.match(/^[-*•]/)) {
            sections.keyArguments.against.push(trimmed.replace(/^[-*•]\s?/, ''))
          }
          break
        case 'consensusPoints':
          if (trimmed.match(/^[-*•]/)) {
            sections.consensusPoints.push(trimmed.replace(/^[-*•]\s?/, ''))
          }
          break
        case 'outstandingQuestions':
          if (trimmed.match(/^[-*•]/)) {
            sections.outstandingQuestions.push(trimmed.replace(/^[-*•]\s?/, ''))
          }
          break
        case 'recommendations':
          if (trimmed.match(/^[-*•]/)) {
            sections.recommendations.push(trimmed.replace(/^[-*•]\s?/, ''))
          }
          break
        case 'conclusion':
          sections.conclusion += (sections.conclusion ? ' ' : '') + trimmed
          break
      }
    }
  }

  return sections
}
