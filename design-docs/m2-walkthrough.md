# M2 checkpoint — custom-council end-to-end walkthrough

- **Date:** 2026-07-28
- **Branch:** `v2`
- **Commit described:** `98286280caf5f72df3f3a7f1b6588c0698888ff2` (`T-023b: Session model picker`)
- **Task:** T-024 · CHECKPOINT — M2 review

No secret values, connection strings, or API keys appear anywhere in this file. If a command
you run echoes one, redact it before pasting the output into the sign-off table.

This is a script to execute, not a description to read. Every step names the exact on-screen
text you should see; if the screen says something else, that is a finding — record it and
stop, do not work around it.

---

## 1. What this checkpoint proves

PRD §10, Milestone 2 — Convener Powers + Library, verbatim:

> **Done when:** a user builds a custom council from custom personas, runs a session,
> interjects mid-round and sees the next speaker address it, completes synthesis, reopens
> with a new direction, and completes a second synthesis. Editing the council afterward does
> not alter the finished transcript.

Plus Amendment A1 (the convener directive recorded at the T-016 gate), which T-024's task
block calls out explicitly: a session created with the model picker set to
`claude-haiku-4-5-20251001` must show that model in the Chamber header.

That decomposes into nine checks:

| # | Check | Where it is exercised |
| --- | --- | --- |
| DoD-1 | Custom personas created in `/personas` | Step 1 |
| DoD-2 | Custom council built from them in `/councils`, order set with Move up / Move down | Step 2 |
| DoD-3 | A session runs on that custom council | Steps 3, 4 |
| DoD-4 | Interjection **mid-round**; the next speaker addresses it | Steps 4e, 4f |
| DoD-5 | Synthesis completes the session | Step 5 |
| DoD-6 | Reopen with a new direction → second synthesis; only the latest is badged **Result** | Step 6 |
| DoD-7 | Editing the council afterward leaves the finished transcript byte-identical | Steps 7, 8 |
| A1-1 | Session created on `claude-haiku-4-5-20251001` → header shows it | §5 |
| A1-2 | Contrast session on a different model → header shows *that* model | §5 |

Two further observations ride along and are recorded but do **not** block the milestone:

- **Regenerate last** replaces the latest turn in place (checked inline at step 4d).
- PRD §11's subjective quality bar — *every Round-2 turn references another persona's
  argument by name* — re-observed at step 4g.

---

## 2. Scope note — what is intentionally not on screen at this commit

Do not fail the gate over a missing control. These are **deliberately absent** and are owned
by later tasks or by an explicit design decision:

- **Streaming** of turns — Milestone 3 (T-030). Every turn lands all at once after a pause of
  a few seconds. Nothing is wrong.
- **Session JSON import/export**, skeleton/loading states, and `Space = Step` — Milestone 3
  (T-031 / T-032).
- **No drag-and-drop anywhere in `/councils`.** Reordering is the **Move up** / **Move down**
  buttons, by design (PRD §6 screen 3 says "plain buttons, no drag-and-drop library"; PRD §12
  buries the drag-and-drop designer outright). Trying to drag a seat and finding nothing
  happens is expected behaviour.
- **Reopen** is *absent*, not greyed out, on any session that is not `completed`. The control
  is conditionally rendered (`controls.showReopen`), because a session that cannot be
  reopened has nothing to offer.
- **Interject stays live at the 60-turn cap.** A convener note generates nothing, so PRD
  §5.3's cap does not apply to it. If you reach the cap, Step / Run round / Synthesize /
  Regenerate last all disable and Interject does not — that is correct.
- **No key-entry field anywhere.** Never paste an API key into the app.

---

## 3. Preflight (run once, from the repo root, in PowerShell)

1. `npm install`

2. **`npm run db:migrate` — required before anything else on this checkpoint.**

   `drizzle/0001_plain_wolverine.sql` (`ALTER TABLE "sessions" ADD COLUMN "model" text`) was
   generated at T-023b and has **never been applied to the live database**. The gate is
   forbidden from touching a database, so no earlier step could have run it. If you skip
   this, **Create session** will fail loudly with a Postgres error naming the missing `model`
   column. That is the fail-loudly rule working as designed — run the migration and retry.

3. Confirm `.env.local` contains `DATABASE_URL`, `LLM_PROVIDER=anthropic`,
   `ANTHROPIC_API_KEY`, and `LLM_MODEL=claude-haiku-4-5-20251001` (set by the convener at the
   T-016 gate). Do not print their values.

4. `npm run seed` is **optional** here. The personas and the council this walkthrough uses
   are built through the UI, which is the whole point of M2. Re-running the seed is
   idempotent (it upserts by name), so it is safe if you want the seeded rows around as
   spares.

5. `npm run dev`, open `http://localhost:3000`, open DevTools → **Console**, and keep the
   terminal running `npm run dev` visible alongside. Errors can surface in either.

### This walkthrough runs on the real Anthropic provider, in a single pass

DoD-4 and DoD-6 are **semantic** checks: something must be read and judged to have been
addressed. In mock mode every turn body is `MOCK[<hash>]` followed by fixture text, so
nothing can be seen to "address" anything and neither check can pass. Run this on
`LLM_PROVIDER=anthropic`.

An optional mock pre-pass is useful for the *structural* half only — counters, badges, which
controls disable, whether Reopen appears — and costs nothing. If you do one, it does not
substitute for the real pass. On Haiku the real pass is roughly twelve short generations.

### Gate results observed by the coder at `9828628`, on a docs-only tree

| Command | Result |
| --- | --- |
| `npm run check` (typecheck → lint → test → knip) | **pass** — 33 test files, 640 tests, 0 knip findings |
| `npm run build` | **pass** — 17 routes, 99.6 kB shared JS |

---

## 4. The walkthrough

A **3-persona council over 2 rounds**, chosen so the turn counter is checkable by hand at
every step.

### Step 1 — build three custom personas (DoD-1)

Go to `/personas` (the **Personas** link in the home nav). Heading **Personas**; two sections,
**Library** and **New persona**.

The form fields are **Name**, **Role** (placeholder *"One line: what this persona is in the
room to do."*), **Charter** (placeholder *"Perspective, expertise, and disposition."*), and
**Color**; the submit button reads **Create persona**.

Create these three, exactly as written, so the run is reproducible and none of them collides
with a seeded persona:

| Name | Role | Charter | Color |
| --- | --- | --- | --- |
| The Field Medic | Speaks for whoever has to use this at 3am under pressure. | You have run triage in understaffed, high-stakes environments. You judge every proposal by what happens when it is used by a tired person with incomplete information. You care about failure modes, recovery paths, and whether the fallback is worse than the thing it replaces. You are blunt and concrete, and you distrust plans that only work when everyone is rested and attentive. | `#0f766e` |
| The Bean Counter | Prices every proposal and refuses to let cost stay abstract. | You are a hard-nosed financial analyst. You convert every proposal into money, hours, and opportunity cost, and you say the numbers out loud even when they are unwelcome. You distinguish one-time costs from recurring ones and you always ask who pays and when. You are unimpressed by strategic language that has no line item attached. | `#b45309` |
| The Night-Shift Operator | Owns whatever the day shift decides, at 2am, alone. | You keep systems running outside business hours. You have inherited every clever decision anyone ever made and you have paged yourself awake for most of them. You judge proposals by how they behave when they break, how they are monitored, and how much tribal knowledge they demand. You are dry, specific, and allergic to anything described as "self-explanatory". | `#7e22ce` |

*Expected after each **Create persona**:* a status note reading `Added <name>.` and a new row
in **Library** showing the color swatch, the name, and the role, with **Edit** and **Delete**
buttons.

### Step 2 — build the custom council (DoD-2)

Go to `/councils`. Sections **Councils** and **New council**.

- **Name:** `Night Watch`
- **Description:** `Three people who have to live with the decision.`
- **Default rounds:** `2`
- **Speaking order:** in the **Add persona** picker choose **The Field Medic** → **Add**, then
  **The Bean Counter** → **Add**, then **The Night-Shift Operator** → **Add**. Use **Move up**
  / **Move down** until the numbered list reads, top to bottom:

  1. The Field Medic
  2. The Bean Counter
  3. The Night-Shift Operator

*Expected while seating:* with fewer than 2 seated, **Create council** is **disabled** and the
helper line reads `Seat at least 2 personas before saving.` With all three seated the helper
line reads exactly:

```
3 personas seated. Use Move up and Move down to set the speaking order.
```

Press **Create council**.

*Expected:* a status note `Added Night Watch.` and a new row in **Councils** whose order line
renders `The Field Medic → The Bean Counter → The Night-Shift Operator` above
`2 default rounds · 3 personas`.

### Step 3 — create the session (DoD-3)

Go to `/`. In **New session**:

- **Topic:** `Should we move our on-call rotation to a follow-the-sun model?`
- **Council:** `Night Watch` — *watch the **Rounds** field as you select it: it must reset to
  `2`, the council's own default.*
- **Rounds:** `2`
- **Model:** leave it on **Provider default** for this session.

Press **Create session**.

*Expected:* the browser navigates to `/sessions/<uuid>`. The header shows the topic as the
page heading with **no** MOCK MODE badge beside it, then:

```
Council: Night Watch    Model: claude-haiku-4-5-20251001    Status: active    Turns: 0 / 60
```

(`Model:` reads Haiku because `.env.local` sets `LLM_MODEL` to it and this session chose
nothing — see §5, which is where that distinction is actually tested.) Below the controls:
*"No turns yet. Press Step to hear the first persona."*

### Step 4 — run, regenerate, and interject mid-round

Press the buttons in this order and check the counter after each. Round labels are the
session's own: the label on a turn is the round that turn belongs to.

| # | Action | Counter after | Transcript after |
| --- | --- | --- | --- |
| 4a | **Step** | `1 / 60` | 1 entry: **The Field Medic**, `Round 1`, teal left border |
| 4b | **Run round** | `3 / 60` | 3 entries: The Bean Counter then The Night-Shift Operator, both `Round 1`. The run **halts on the round boundary** by itself — you do not press Pause |
| 4c | **Step** | `4 / 60` | 4 entries: **The Field Medic**, `Round 2` |
| 4d | **Regenerate last** | `5 / 60` | still **4** entries — see below |
| 4e | **Interject** (see below) | stays `5 / 60` | 5 entries — the 5th is the convener note |
| 4f | **Step** | `6 / 60` | 6 entries: **The Bean Counter**, `Round 2` — **this is DoD-4** |
| 4g | **Run round** | `7 / 60` | 7 entries: The Night-Shift Operator, `Round 2` |

**4d in detail — Regenerate last.** The Round-2 turn by The Field Medic is replaced **in
place**: same position in the transcript, different text, **no new row**. The counter moves
from `4` to `5` because a regeneration is a generation attempt and counts toward the 60-turn
cap (PRD §5.3). *The counter moving while the transcript length does not is the whole point
of this step* — confirm both halves.

**4e in detail — the interjection.** Type this into the **Interject** box (placeholder
*"Steer the council in your own words."*) and press the **Interject** button:

```
From here on, assume the budget is fixed at zero new headcount and the deadline is eight
weeks. Judge every option against exactly those two constraints and nothing else.
```

*Expected:* a fifth entry appears at the end of the transcript, speaker **Convener**, italic
slate styling that is visibly different from a persona turn, badge **INTERJECTION**, round
label `Round 2`. **The counter must not move.** A convener note is not a generated turn; if
`Turns:` goes to `6 / 60`, that is a finding.

**4f in detail — DoD-4, the check this milestone exists for.** The Bean Counter's Round-2
turn must **explicitly take up the convener's note**: it has to reason against the fixed
zero-headcount budget and the eight-week deadline, not merely continue its previous argument.
The steer was written to be unmistakable so this is a yes/no reading, not a judgement call.

**If the next speaker ignores the note, that is a finding: record it and stop.** Per PRD §11,
a prompting miss outranks any further milestone work.

**4g — quality observation (non-blocking).** Read the three Round-2 turns and count how many
reference another persona **by name**. PRD §11 wants all of them. Record the count in the
sign-off table. This does not block the milestone.

### Step 5 — synthesis (DoD-5)

Press **Synthesize**.

*Expected:*

- Counter `8 / 60`.
- A new, visually distinct indigo entry, speaker **The Chair**, badge **RESULT** (solid
  indigo).
- The round label on that entry reads **`Round 3`**, not `Round 2`. The round number is the
  round that is *about to begin* — six persona turns have completed, so the council stands at
  the head of round 3. This is expected; it is not an off-by-one.
- The header flips to `Status: completed`.
- **Step**, **Run round**, **Synthesize** and **Regenerate last** are all now **disabled**.
- A **Reopen** button **appears** — it was not there before.
- **Copy Markdown** and **Download .md** stay enabled.

### Step 6 — reopen with a new direction (DoD-6)

Press **Reopen**.

*Expected:* `Status: active`; the counter is **unchanged** at `8 / 60` (nothing was
generated); the **Reopen** button disappears; Step / Run round / Synthesize / Regenerate last
come back; and the first synthesis **stays in the transcript** — it is not deleted.

Now interject a genuinely new direction:

```
New direction: the eight-week deadline just moved to six months, and one contractor is
available. Re-argue the option you each rejected as unaffordable.
```

*Expected:* a convener entry, badge **INTERJECTION**, round label `Round 3`, counter still
`8 / 60`.

Press **Run round**.

*Expected:* three new turns, all headed `Round 3`, in the same speaking order (Field Medic →
Bean Counter → Night-Shift Operator), counter `11 / 60`. Running past the council's planned 2
rounds is allowed after a reopen — that is the iterate mechanic (PRD §5.1), not a bug.

Press **Synthesize**.

*Expected:* counter `12 / 60`; `Status: completed`; and **two synthesis entries on screen**.
The **later** one is badged **RESULT** (solid indigo) and labelled `Round 4`; the **earlier**
one is now badged **SYNTHESIS** (pale indigo) and still labelled `Round 3`. Only one turn in
the transcript may carry the **RESULT** badge.

### Step 7 — export the finished transcript (the DoD-7 baseline)

Press **Download .md**.

*Expected:* a file named exactly

```
council-session-should-we-move-our-on-call-rotation-to-a-follow-the-sun-mode-<YYYY-MM-DD>.md
```

The slug is the lower-cased, hyphenated topic capped at 60 characters, and the date is the
session's creation date in UTC. It ends `…-sun-mode`, not `…-sun-model` — the cap lands one
character into the last word. That is the documented truncation, not a typo.

**Keep this file — it is the baseline for DoD-7.**

Confirm its shape:

```
# AI Council Session

- **Topic:** Should we move our on-call rotation to a follow-the-sun model?
- **Council:** Night Watch
- **Date:** <YYYY-MM-DD>

## Round 1

### The Field Medic
…
### The Bean Counter
…
### The Night-Shift Operator
…

## Round 2

### The Field Medic
…
> **Convener:** From here on, assume the budget is fixed at zero new headcount …
### The Bean Counter
…
### The Night-Shift Operator
…

## Round 3

> **Convener:** New direction: the eight-week deadline just moved to six months …
### The Field Medic
…
### The Bean Counter
…
### The Night-Shift Operator
…

## Synthesis

### Synthesis — Round 3
…
### Result
…
```

Both convener notes are `> **Convener:**` blockquotes sitting inside the round they were made
in, in transcript order. There is exactly **one** trailing `## Synthesis` section, the earlier
synthesis is `### Synthesis — Round 3`, and the latest is `### Result`.

### Step 8 — edit the council, prove the transcript is frozen (DoD-7)

Go back to `/councils` and press **Edit** on **Night Watch**. Make three changes at once, so
one save exercises rename, reorder, and roster change together:

1. **Rename** it to `Night Watch (revised)`.
2. **Reverse the speaking order** with Move up / Move down, so it reads
   The Night-Shift Operator → The Bean Counter → The Field Medic.
3. **Remove** The Bean Counter and **Add** a different persona in its place (any other one —
   a seeded persona is fine, this council does not need to be sensible any more).

Press **Save council**. *Expected:* a status note `Saved Night Watch (revised).` and the list
row updating to the new name, new order, and new member count.

Now the three checks:

- **Reload the session.** Hard-refresh `/sessions/<uuid>` (Ctrl+Shift+R). *Expected:* the
  header still reads `Council: Night Watch` — the **original** name. Every turn keeps its
  original speaker name, its original position, and its original left-border color. The
  removed persona's turns are all still there. Nothing on this page renders from the edited
  council.

- **Re-export and diff.** Press **Download .md** again — the browser will suffix the filename,
  e.g. `… (1).md`. Then, from the download folder:

  ```powershell
  Compare-Object (Get-Content 'council-session-….md') (Get-Content 'council-session-… (1).md')
  ```

  *Expected:* **no output at all.** Identical is the pass condition; any line reported is a
  finding.

- **Check the list.** On `/`, the session row still shows `Council: Night Watch`, the original
  name.

Any drift here is a snapshot-rule violation (PRD §7: sessions read personas **only** through
`council_snapshot`, and `council_id` is provenance-only). Record it and stop.

---

## 5. The model picker (Amendment A1)

Two short sessions, both on the (now edited) custom council. Do these **after** step 8 so they
cannot disturb the DoD-7 comparison.

### A1-1 — the check the task block names

On `/`, create a session:

- **Topic:** `Model picker check — Haiku`
- **Council:** any
- **Model:** `claude-haiku-4-5-20251001`

*Expected:* the Chamber header reads `Model: claude-haiku-4-5-20251001`. Press **Step** once to
confirm a turn actually generates on that model (counter `1 / 60`, a real persona turn, no
error).

### A1-2 — the contrast that makes A1-1 mean something

Create a second session:

- **Topic:** `Model picker check — contrast`
- **Council:** any
- **Model:** `claude-opus-5`
- **Do not press Step.** This session costs nothing; it exists only to be looked at.

*Expected:* the Chamber header reads `Model: claude-opus-5`.

**Why A1-2 exists.** `.env.local` sets `LLM_MODEL=claude-haiku-4-5-20251001`, and the Chamber
renders `session.model ?? defaultModel`. So a header reading Haiku is *also* exactly what a
**broken** picker would produce — one that discarded the choice and fell through to the env
default. Only the contrast session distinguishes "the picker stored my choice" from "the env
default happens to match what I picked". If A1-2's header reads Haiku, the picker is not
working, regardless of what A1-1 showed.

Also confirm, while the picker is open: it offers exactly **Provider default** (first),
`claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001` — and nothing else. Under
`LLM_PROVIDER=mock` the **Model** control is absent entirely rather than shown with one
option; that is by design and is not part of this pass.

---

## 6. Archive semantics (T-022 / T-023 coverage, not part of the §10 sentence)

Run this **last**. These actions mutate the library and must not contaminate anything above.
This section covers behaviour shipped by T-022 and T-023; it is **not** part of Milestone 2's
definition-of-done sentence, so record it separately.

- **Archive a seated persona.** On `/personas`, press **Delete** on a persona that is seated
  in a council or has spoken in a session — e.g. **The Field Medic**. *Expected:* the status
  note reads exactly

  ```
  The Field Medic is used by a council or a past session, so it was archived rather than
  deleted. Existing sessions are unaffected.
  ```

  The card leaves the library. Reload the completed session: its turns by The Field Medic are
  still there, unchanged, with the same color.

- **Archive a council that has run sessions.** On `/councils`, press **Delete** on
  **Night Watch (revised)**. *Expected:*

  ```
  Night Watch (revised) has already run sessions, so it was archived rather than deleted.
  Existing sessions are unaffected.
  ```

  The row leaves the list; the session's own page is unaffected and still reads
  `Council: Night Watch`.

---

## 7. Failure playbook

If any of these appear, **do not patch code to get past it** and do not ask for a workaround.
Record the exact text in the sign-off table and stop. Surfacing failures is what this
checkpoint is for.

| What you see | What it means | What to do |
| --- | --- | --- |
| A Postgres error naming a missing `model` column, on **Create session** | Preflight step 2 was skipped; migration `0001` is unapplied. | Run `npm run db:migrate`, restart, retry. |
| `DATABASE_URL is not set. Set it in .env.local (Neon Postgres connection string). There is no fallback database.` | The database env var is absent from the dev server's environment. | Set it in `.env.local`, restart. |
| `ANTHROPIC_API_KEY is not set. LLM_PROVIDER=anthropic requires it. Set the key in .env.local, or set LLM_PROVIDER=mock to run offline — there is no automatic fallback to the mock provider.` — shown **on a red-bordered failed turn with a Retry button**, not as a crash | Correct behaviour: a provider error is stored on the turn so it can be read. | Add the key, restart, press **Retry** on that turn. |
| `Session is completed; only active sessions can generate turns.` | A generation control was pressed after synthesis. | Press **Reopen** first. |
| `Session is completed; only active sessions can be interjected into.` | A note was submitted into a completed session. | Press **Reopen** first. |
| `Session is active; only a completed session can be reopened.` (409) | Reopen was pressed on a session that is not completed. | Nothing to do; the button should not have been visible. Record it — a visible Reopen on an active session is itself a finding. |
| `The most recent turn failed; retry it before generating another turn.` | A failed turn is blocking the queue. | Press **Retry** on the red turn. |
| `The most recent turn failed; retry it before adding an interjection.` | Same, for a convener note. | Press **Retry** on the red turn first. |
| `The most recent turn failed; retry it instead of regenerating it.` | Regenerate was pressed on a failed turn. | Press **Retry**, which is the repair path. |
| `The most recent turn is an interjection; it is convener-authored and was never generated.` | Regenerate was pressed straight after an interjection. | Step first; a convener note is not regenerable. |
| `This session has no turns yet; there is nothing to regenerate.` | Regenerate was pressed on an empty session. | Press **Step** first. |
| `No persona has spoken yet; advance the session before synthesizing.` | Synthesize was pressed on an empty session. | Press **Step** first. |
| `A turn is already being generated for this session. Wait for it to finish.` | Two generation requests overlapped (the server-side per-session lock). | Wait, then retry the action. |
| `Session turn cap reached (60 generated turns).` | PRD §5.3's hard cap. | Expected; start a new session. Note that **Interject** stays live — that is correct. |
| `A turn failed to generate. Retry it in the transcript to continue.` (amber notice after **Run round**) | The run halted on a failed turn, by design. | Read the red turn's own error text and act on that. |
| `This browser did not grant clipboard access. Use Download .md instead.` | Non-secure origin or blocked clipboard permission. | Use **Download .md**. Not a defect. |
| `A council seats between 2 and 8 personas; this one has <n>.` | Client-side guard in the council editor. | Seat the right number. Not a defect. |
| `Default rounds must be a whole number between 1 and 5.` | Client-side guard in the council editor. | Enter 1–5. Not a defect. |

---

## 8. Sign-off

Fill in one row per check. Result: pass / fail / not-run.

| Check | Result | Notes |
| --- | --- | --- |
| DoD-1 Three custom personas created in `/personas` | | |
| DoD-2 Custom council built, order set with Move up / Move down | | |
| DoD-3 Session runs on the custom council (steps 4a–4c) | | |
| DoD-4 Interjection mid-round; the next speaker addresses it | | |
| DoD-5 Synthesis by The Chair; session `completed` | | |
| DoD-6 Reopen → new direction → Round 3 → second synthesis; only the latest badged RESULT | | |
| DoD-7 Council edited; Chamber header, transcript and export all unchanged (`Compare-Object` empty) | | |
| A1-1 Session on `claude-haiku-4-5-20251001`; header shows it; a turn generates | | |
| A1-2 Contrast session on `claude-opus-5`; header shows `claude-opus-5` | | |
| Regenerate last replaces in place (counter +1, transcript length unchanged) | | |
| Interjection does not move the turn counter | | |
| Archive-instead-of-delete: persona | | |
| Archive-instead-of-delete: council | | |
| Zero browser console errors and React warnings for the whole pass | | |
| Zero unhandled errors in the dev-server terminal | | |
| §11 observation: how many of the three Round-2 turns name another persona? | *n* of 3 | |

**Console rule.** "Zero" means zero: no hydration mismatch, no missing-key warning, no
unhandled rejection, in either place. Acceptable and **not** failures: Next.js compile/ready
lines, the "Download the React DevTools" suggestion, and HMR / fast-refresh notices.

**Overall verdict (human):**

**Defects found:**

**Signed off by / date:**
