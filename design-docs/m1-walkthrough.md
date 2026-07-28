# M1 checkpoint — full-loop walkthrough

- **Date:** 2026-07-28
- **Branch:** `v2`
- **Commit described:** `2f60cf7c5e432cab3876aa62ed28f4d939d8730a` (`T-015: Markdown export`)
- **Task:** T-016 · CHECKPOINT — M1 full-loop review

No secret values, connection strings, or API keys appear anywhere in this file. If a command
you run echoes one, redact it before pasting the output into the sign-off table.

This is a script to execute, not a description to read. Every step names the exact on-screen
text you should see; if the screen says something else, that is a finding — record it and
stop, do not work around it.

---

## 1. What this checkpoint proves

PRD §10, Milestone 1 — The Loop, verbatim:

> **Done when:** with no API key (mock mode) and with a real key, a user creates a session
> from a seeded council, runs 2 full rounds + synthesis with zero console errors, refreshes
> mid-session without losing state, and exports Markdown.

That sentence decomposes into five checks, each run **twice** — once in mock mode (Pass A)
and once against the real provider (Pass B):

| # | Check | Where it is exercised |
| --- | --- | --- |
| DoD-1 | Create a session from a seeded council | Step 3 |
| DoD-2 | Run 2 full rounds | Steps 5, 7, 8 |
| DoD-3 | Synthesis completes the session | Step 10 |
| DoD-4 | Refresh mid-session without losing state | Step 6 |
| DoD-5 | Export Markdown (copy + download) | Steps 11, 12 |
| DoD-6 | Zero console errors throughout | Step 14 |

---

## 2. Scope note — what is intentionally not on screen in M1

Do not fail the gate over a missing control. These are **deliberately absent** at this
commit and are owned by later tasks:

- **Interject** and **Regenerate last** — T-020 / T-021.
- **Reopen** after synthesis — T-021. A completed session's Step / Run round / Synthesize
  buttons are correctly disabled with no way back; that is expected in M1.
- **Streaming** of turns token-by-token — Milestone 3.
- **Persona and council editing screens** (`/personas`, `/councils`) — Milestone 2.

Per the no-placeholder rule, absent means absent: nothing is rendered greyed-out as a
promise. The only screens that exist are `/` and `/sessions/<id>`.

---

## 3. Preflight (once, before Pass A)

Run from the repo root in PowerShell.

1. `npm install`
2. Confirm `.env.local` contains `DATABASE_URL` (set at T-006 against the wiped Neon
   database). Do not print its value.
3. The migration and the seed already ran at T-006 (`personas: 8 inserted`,
   `councils: 3 inserted`, `members: 11 rows written`). Re-running `npm run seed` is
   idempotent — it upserts by name — so it is safe to repeat if the council picker turns up
   empty.
4. **Before Pass B only:** add `ANTHROPIC_API_KEY` to `.env.local`. It was still missing as
   of T-006 and is the one prerequisite this checkpoint cannot satisfy for you.

Gate results observed by the coder at `2f60cf7`, on a docs-only tree:

| Command | Result |
| --- | --- |
| `npm run check` (typecheck → lint → test → knip) | **pass** — 23 test files, 312 tests, 0 knip findings |
| `npm run build` | **pass** — 9 routes, 99.6 kB shared JS |

---

## 4. Pass A — mock mode

### A0. Select the mock provider

Edit `.env.local` and set:

```
LLM_PROVIDER=mock
```

Then start the server:

```powershell
npm run dev
```

The provider is read per process, so **the dev server must be restarted after any change to
`.env.local`**. (Alternative: `$env:LLM_PROVIDER='mock'; npm run dev` in a fresh PowerShell
window. A shell variable takes precedence over `.env.local` and persists for the whole
terminal session, so remember to close that window before Pass B.)

There is no key-entry field anywhere in the UI, by design — never paste a key into the app.

### A1. Open the app with both consoles visible

Open `http://localhost:3000`, open DevTools → **Console**, and keep the terminal running
`npm run dev` visible alongside. Errors can surface in either.

*Expected:* the page loads; the console is clean apart from informational Next.js output and
the React DevTools suggestion.

### A2. Home page renders

*Expected:* heading **AI Council**; a **New session** section containing a **Topic**
textarea (placeholder *"What should the council take up?"*), a **Council** picker, a
**Rounds** number field, and a **Create session** button; below it a **Sessions** section
showing either existing rows or the empty state *"No sessions yet. Convene one above."*

The picker must list the three seeded councils: **Decision Panel**, **Creative Board**,
**Red Team**. Selecting one shows its description underneath and resets **Rounds** to that
council's default (2 for all three).

*If instead you see an error box or "Councils could not be loaded."*, the database is
unreachable. That is the fail-loudly rule working as intended. Record it and stop.

### A3. Create a session

Topic: `Should we rewrite the ingestion service in Rust?` — Council: **Decision Panel** —
Rounds: **2**. Press **Create session**.

*Expected:* the browser navigates to `/sessions/<uuid>`.

### A4. The chamber header

*Expected:* the topic as the page heading, with an amber **MOCK MODE** badge beside it (the
label is written "Mock mode" and rendered uppercase). Below it:
`Council: Decision Panel` · `Status: active` · `Turns: 0 / 60`. Under the controls:
*"No turns yet. Press Step to hear the first persona."*

*If the badge is missing*, the server did not pick up `LLM_PROVIDER=mock` — stop the dev
server and restart it.

### A5. Two single steps

Press **Step**, wait for the turn to land, press **Step** again.

*Expected:* two turns in Decision Panel's speaking order — **The Pragmatist** (blue left
border) then **The Skeptic** (red left border) — each headed `Round 1`. Counter reads
`2 / 60`. Every turn's body starts with `MOCK[` followed by a short hash — that is the
offline stand-in text, and it is deterministic. All generation buttons are disabled while a
turn is in flight.

### A6. Refresh mid-session — **DoD-4**

Press **F5** here, deliberately mid-round.

*Expected:* exactly the same two turns, in the same order, with the same content; the
counter still reads `2 / 60`; `Status: active`; `Council: Decision Panel`; the badge is
still there. Nothing is lost, nothing is duplicated, no turn re-generates. State is
server-authoritative and the roster is read from the session's council snapshot, so a
refresh is a re-read, not a replay.

### A7. Finish round 1

Press **Run round**.

*Expected:* the run continues from where it stopped and halts on the round boundary — **The
Economist**, then **The Systems Thinker**, all four headed `Round 1`. Counter `4 / 60`.

### A8. Run round 2 — **DoD-2**

Press **Run round** again.

*Expected:* four more turns, all headed `Round 2`, in the same speaking order. Counter
`8 / 60`. No amber notice box appears.

### A9. Pause (optional but recommended)

This one costs an extra session to observe cleanly, so it is optional: on a *fresh* session,
press **Run round** and press **Pause** while a turn is generating.

*Expected:* **Pause** is only enabled while a run is in progress; the run stops after the
in-flight turn lands and no further turns appear. Pressing **Run round** again resumes.

### A10. Synthesize — **DoD-3**

Press **Synthesize**.

*Expected:* one more turn, visually distinct (indigo), speaker **The Chair**, with a
**SYNTHESIS** tag beside the round label. Header flips to `Status: completed`. Counter
`9 / 60` (8 persona turns + 1 synthesis; the counter counts generation attempts, so a retry
would bump it too). **Step**, **Run round** and **Synthesize** are now disabled — correct,
see §2. **Copy Markdown** and **Download .md** stay enabled.

### A11. Copy Markdown — **DoD-5a**

Press **Copy Markdown**.

*Expected:* the text *"Copied to the clipboard."* appears next to the buttons. Paste into a
scratch file and confirm the document is:

```
# AI Council Session

- **Topic:** Should we rewrite the ingestion service in Rust?
- **Council:** Decision Panel
- **Date:** <YYYY-MM-DD>

## Round 1

### The Pragmatist
…
## Round 2
…
## Synthesis

### Result
…
```

Four `### <speaker>` sections under each round heading, in speaking order, and the latest
synthesis labelled `### Result`.

*If you get an amber notice reading "This browser did not grant clipboard access. Use
Download .md instead."*, you are on a non-secure origin or the browser blocked the
clipboard. Use the next step instead; that is not a defect.

### A12. Download .md — **DoD-5b**

Press **Download .md**.

*Expected:* a file named
`council-session-should-we-rewrite-the-ingestion-service-in-rust-<YYYY-MM-DD>.md`
downloads, with content identical to the copied text.

### A13. Back to the list

Navigate to `http://localhost:3000`.

*Expected:* the session appears with its topic as a link, `Council: Decision Panel`,
`Status: completed`, and a `Last activity:` timestamp rendered as `YYYY-MM-DD HH:MM UTC`.
Clicking the topic returns to the completed transcript, intact.

### A14. Console check — **DoD-6**

*Expected:* **zero** errors and **zero** React warnings in the browser console for the whole
pass — in particular no hydration mismatch and no missing-key warning. **Zero** unhandled
errors in the dev-server terminal.

Acceptable (not failures): Next.js compile/ready lines, the "Download the React DevTools"
suggestion, and any HMR/fast-refresh notices.

---

## 5. Pass B — real provider (Anthropic)

Same fourteen steps; only the deltas are listed. Run it on a **new** session, not the mock
one.

### B0. Switch provider

1. Stop the dev server.
2. In `.env.local`: set `LLM_PROVIDER=anthropic` and add `ANTHROPIC_API_KEY=<your key>`.
   `LLM_MODEL` is optional and defaults to `claude-sonnet-5`.
3. If you used the `$env:` alternative in Pass A, close that PowerShell window.
4. `npm run dev`, then hard-refresh the browser (Ctrl+Shift+R).

### B1. Deltas to expect

- **The MOCK MODE badge must be gone.** If it is still there, the server is still on the
  mock provider — the run does not count.
- Turn bodies are real prose with **no** `MOCK[` prefix.
- Each turn takes seconds rather than milliseconds. PRD §11 budgets p95 < 10 s per turn; a
  4-member 2-round session is 9 generation attempts.
- **Cheaper substitute:** run **Red Team** (3 members) instead of Decision Panel. Then the
  counter reads `2 / 60` → `3 / 60` after step A7, `6 / 60` after A8, and `7 / 60` after
  synthesis, and each round has three `### <speaker>` sections. The steps are otherwise
  unchanged.
- Steps A5–A14 all apply unchanged, including the **F5 refresh at step A6** and the console
  check at A14.

### B2. Quality observation (not a pass/fail gate)

PRD §11 sets a subjective bar: *in a 2-round session, every Round-2 turn references another
persona's argument by name.* Read the Round 2 turns and note how many do. This does not
block the milestone, but if the bar is missed, fixing the prompt outranks any further
milestone work — so the observation matters.

---

## 6. Failure playbook

If any of these appear, **do not patch code to get past it** and do not ask for a
workaround. Record the exact text in the sign-off table and stop. Surfacing failures is what
this checkpoint is for.

| What you see | What it means | What to do |
| --- | --- | --- |
| `DATABASE_URL is not set. Set it in .env.local (Neon Postgres connection string). There is no fallback database.` | The database env var is absent from the dev server's environment. | Set it in `.env.local`, restart. |
| `ANTHROPIC_API_KEY is not set. LLM_PROVIDER=anthropic requires it. Set the key in .env.local, or set LLM_PROVIDER=mock to run offline — there is no automatic fallback to the mock provider.` — shown **on a red-bordered failed turn with a Retry button**, not as a crash | Correct behaviour: a provider error is stored on the turn so you can read it. | Add the key, restart, press **Retry** on that turn. Worth triggering once on purpose to see the retry path. |
| `Session is completed; only active sessions can generate turns.` | You pressed a generation control after synthesis. | Expected until Reopen ships (T-021). |
| `Session turn cap reached (60 generated turns).` | The PRD §5.3 hard cap. | Expected; start a new session. |
| `The most recent turn failed; retry it before generating another turn.` | A failed turn is blocking the queue. | Press **Retry** on that turn. |
| `A turn is already being generated for this session. Wait for it to finish.` | Two generation requests overlapped. | Wait and retry the action. |
| `This browser did not grant clipboard access. Use Download .md instead.` | Non-secure origin or blocked clipboard permission. | Use **Download .md**; not a defect. |
| `A turn failed to generate. Retry it in the transcript to continue.` (amber notice after **Run round**) | The run halted on a failed turn, by design. | Read the red turn's own error text; act on that. |

---

## 7. Sign-off

Fill in one row per check, per mode. Result: pass / fail / not-run.

| Check | Mock — result | Mock — notes | Real — result | Real — notes |
| --- | --- | --- | --- | --- |
| DoD-1 Create session from a seeded council | | | | |
| DoD-2 Two full rounds | | | | |
| DoD-3 Synthesis by The Chair, session completed | | | | |
| DoD-4 Refresh mid-session, no state lost | | | | |
| DoD-5a Copy Markdown | | | | |
| DoD-5b Download .md | | | | |
| DoD-6 Zero console errors (browser + terminal) | | | | |
| Provider badge correct (present in mock, absent in real) | | | | |
| §11 quality observation: Round-2 turns name another persona | n/a | n/a | | |

**Overall verdict (human):**

**Defects found:**

**Signed off by / date:**
