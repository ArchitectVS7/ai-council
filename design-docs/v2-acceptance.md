# v2 acceptance — PRD §11 sign-off

- **Date prepared:** 2026-07-28
- **Branch:** `v2`
- **Commit described:** `5d563dc`
- **Task:** T-034 · CHECKPOINT — v2 acceptance
- **Source of truth:** `design-docs/02-PRD-Rebuild.md` §11 (success criteria), §12 (cut list), §13 (deferred)

No secret values, connection strings, or API keys appear anywhere in this file. If a command
you run echoes one, redact it before pasting the output into the sign-off table.

This is a procedure to execute, not a report of results. Every result cell below is blank on
purpose: the only pre-filled numbers are the coder-observed gate figures in **SC-3**, labelled
with the commit they were observed at. Nothing in this document was run against a provider, a
database, or a browser.

---

## 1. What this gate decides

Two questions, in order: **does the shipped app meet PRD §11**, and **does `v2` merge into
`main`?**

One criterion — SC-3, `knip` clean and CI green — is machine-checkable and its baseline is
already recorded below. The other five require a live run of the app against a real provider,
and they are blank until the convener runs them. §6 records the merge decision; §7 is the
sign-off table.

---

## 2. Preflight — three things that will otherwise bite

1. **Install and env.**

   ```powershell
   cd C:\dev\Utils\ai-council
   npm install
   ```

   `.env.local` must carry `DATABASE_URL` (Postgres) and `ANTHROPIC_API_KEY`. It currently
   also pins `LLM_MODEL=claude-haiku-4-5-20251001` — the convener directive recorded at the
   T-016 gate. That pin matters twice below in opposite directions: **SC-4** wants the app
   default `claude-sonnet-5`, **SC-6** wants the small model. **Do not edit the env between
   runs.** Choose the model per session with the picker on `/` — that is exactly what the
   picker exists for (Amendment A1), and the chamber header shows the effective model so
   there is never a doubt about which one produced a turn.

2. **Run the migrations before touching the UI.**

   ```powershell
   npm run db:migrate
   ```

   `drizzle/0002_melodic_bloodstrike.sql` (the `councils.directive` column, T-031b) shipped
   *after* the T-024 gate, where only `0001` was applied to the live database. If `0002` has
   not been applied, creating or editing a council and creating a session fail loudly with a
   missing-column error from Postgres. Run the migration first and the question does not
   arise.

3. **Seed, if the defaults are gone.**

   ```powershell
   npm run seed
   ```

   **SC-1** is written against the seeded **Red Team** council (`The Skeptic` → `The
   Contrarian` → `The Systems Thinker`, default rounds 2) — three personas and two rounds,
   which is precisely the shape PRD §11's cold-start criterion names.

Then, in its own terminal:

```powershell
npm run dev
```

---

## 3. Prerequisite — the unrun M2 walkthrough (`PRE-1`)

`design-docs/m2-walkthrough.md` was **never executed**. At the T-024 gate the convener ran out
of Anthropic credits partway through: DoD-1 and DoD-2 were informally exercised, and
**DoD-3 … DoD-7, A1-1 and A1-2 are unverified**. The §11 sufficiency read was explicitly
deferred to this gate — that deferral is discharged here as **SC-6**; the M2 definition of
done is not.

Nothing in §4 re-derives those checks. Interjection, reopen-and-second-synthesis, and
snapshot immunity under a council edit are covered by unit and component tests but have not
been observed end-to-end by a human.

The convener picks one, and records it as `PRE-1`:

- **(a)** run `m2-walkthrough.md` first, then this document; or
- **(b)** accept v2 with M2's definition of done recorded as unverified.

---

## 4. The five criteria

### SC-1 — cold start

> Cold start to first completed 3-persona, 2-round session: **< 3 minutes** of user effort.

**How it is measured.** With a stopwatch, by hand. The clock starts when `npm run dev` prints
its ready line **and** `http://localhost:3000` has painted, and stops when the synthesis has
finished rendering in the chamber. One-time setup — `npm install`, `db:migrate`, `seed` — is
**excluded**: it is a fresh-clone cost documented in the README, not per-session user effort.

**Steps.**

1. On `/`, type a topic. Suggested, so SC-6 is comparable: *"Should a solo developer rewrite a
   working Next.js service in Rust?"*
2. Council: **Red Team**. Rounds: leave at the council default, **2**. Model: **`claude-sonnet-5`**.
3. **Create session** → the chamber opens.
4. **Run round**. Wait for the three turns.
5. **Run round** again. Wait for the three turns.
6. **Synthesize**. Stop the clock when the synthesis renders.

**Record two numbers.**

- **Total wall clock** — informational.
- **User effort** = total wall clock minus the time spent waiting on generation. The criterion
  says "of user effort", and generation time is charged to **SC-4**, not here.

**Pass rule.** User effort **< 3:00**. Note the wall-clock figure alongside it.

| | |
| --- | --- |
| Wall clock | |
| User effort | |
| Turn counter at the end (expect `7 / 60`) | |
| Result | |

---

### SC-2 — dead controls

> Every interactive element in the UI does something real: **zero** "Coming Soon" buttons.

**How it is measured.** Exhaustively, by hand, against the inventory below. It lists every
interactive element rendered by the seven components that render any (`app-header.tsx`,
`session-list.tsx`, `new-session-form.tsx`, `import-session.tsx`, `chamber.tsx`,
`persona-library.tsx`, `council-builder.tsx`). Tick each row once you have seen the stated
effect.

**The rule for what counts as dead.** A control that is *disabled for a stated reason*, or
*absent by design*, is **not** a dead control. A control that is enabled and does nothing, or
that promises something the app has not shipped, is a **fail**.

#### Header — every page (`app-header.tsx`)

| Screen | Control | Expected observable effect | OK? |
| --- | --- | --- | --- |
| all | **AI Council** wordmark | navigates to `/` | |
| all | **Sessions** / **Personas** / **Councils** links | navigate to `/`, `/personas`, `/councils` | |
| all | current-page marking | the entry for the page you are on renders darker and bolder; inside `/sessions/[id]` it is **Sessions** that stays marked | |

#### `/` — Sessions

| Control (source) | Expected observable effect | OK? |
| --- | --- | --- |
| Session topic link (`session-list.tsx`) | opens that session's chamber; the row also shows council name, status, last activity | |
| **Topic** textarea (`new-session-form.tsx`) | accepts text; empty on submit → `Topic is required.` | |
| **Council** select | changes the selection **and resets Rounds to that council's default**; the council's description appears below the row when it has one | |
| **Rounds** number field | accepts 1–5; out of range on submit → `Rounds must be a whole number between 1 and 5.` | |
| **Model** picker | a select for `anthropic`/`openai` (first option "Provider default", which sends no model); free text with a suggestion list under `local`; **absent under `mock`** — one model, nothing to choose | |
| **Create session** | POSTs and navigates to the new session; disabled while the council list is loading, while submitting, and when no councils exist | |
| **Session document** file input (`import-session.tsx`) | accepts a `.json` file; the **Import session** button stays disabled until one is chosen | |
| **Import session** | uploads the file verbatim and navigates to the imported session; a bad file shows the server's own message in the amber box | |

#### `/sessions/[id]` — Chamber (`chamber.tsx`)

| Control | Expected observable effect | OK? |
| --- | --- | --- |
| **Step** | generates exactly one turn, streaming token by token into the "turn in progress" region, then the transcript reloads from the server | |
| **Run round** | steps until the round boundary; the turn counter climbs by the council size | |
| **Pause** | enabled only while something is in flight; aborts the stream mid-sentence — the turn is persisted `failed` with the reason `aborted by convener`, and gets a **Retry** button | |
| **Synthesize** | The Chair produces the synthesis; status becomes `completed`; the turn is badged **RESULT** | |
| **Regenerate last** | replaces the latest complete persona or synthesis turn in place — transcript length unchanged, turn counter **+1**; disabled when the last turn is an interjection or failed | |
| **Reopen** | **rendered only when the session is `completed`** — its absence on an active session is correct, not a defect. Returns status to `active` and the round controls come back | |
| **Retry** | **rendered only on a failed turn that is the last one**. Re-runs it | |
| **Copy Markdown** | copies the export and shows "Copied to the clipboard."; a blocked clipboard shows the real browser error, never a fake success | |
| **Download .md** | downloads `council-session-<topic-slug>-<YYYY-MM-DD>.md` | |
| **Download .json** | downloads the same slug with a `.json` extension — the whole session document, importable from `/` | |
| **Interject** textarea | accepts up to 10,000 chars; the button stays disabled while it is blank | |
| **Interject** button | adds a convener turn at the end of the transcript; the **turn counter does not move** (a note generates nothing) | |
| **Space** = Step (no visible widget; the hint "Space = Step" is shown beside the controls) | advances one turn — but only when a turn could be generated anyway, and never while focus is in a textarea, input, select, button, or link | |
| **Mock mode** badge | present only under `LLM_PROVIDER=mock`; expected **absent** on this run | |
| **Local** marker beside the model | present only under `LLM_PROVIDER=local`; expected **absent** on this run | |

#### `/personas` (`persona-library.tsx`)

| Control | Expected observable effect | OK? |
| --- | --- | --- |
| **Edit** (per card) | loads that persona into the editor; the heading becomes "Edit persona" | |
| **Delete** (per card) | the card leaves the library, and the notice says either *deleted* or *archived because it is used by a council or a past session* — the server decides which | |
| **New persona** (shown only while editing) | clears the editor back to create mode | |
| **Name** / **Role** / **Charter** fields | required; empty on submit → `Name is required.` / `Role is required.` / `Charter is required.` | |
| **Color** swatch | sets the colour; the card swatch and the chamber's turn border use it | |
| **Create persona** / **Save persona** | writes, and the grid re-renders from the **server's** stored row | |

#### `/councils` (`council-builder.tsx`)

| Control | Expected observable effect | OK? |
| --- | --- | --- |
| **Edit** (per row) | loads name, description, directive, default rounds and the seating order into the editor | |
| **Delete** (per row) | the row leaves the list; notice says *deleted* or *archived because it has already run sessions* | |
| **New council** (shown only while editing) | clears the editor back to create mode | |
| **Name** | required → `Name is required.` | |
| **Description** | display-only text; it never reaches the model | |
| **Directive** | reaches every member on every turn (Amendment A3); the helper text under it says so | |
| **Default rounds** | 1–5 → otherwise `Default rounds must be a whole number between 1 and 5.` | |
| **Add persona** select + **Add** | seats the chosen persona at the end; the select offers only unseated personas and **Add** disables at 8 seats | |
| **Move up** / **Move down** (per seat) | swap the seat one place; disabled at the ends; the numbering updates | |
| **Remove** (per seat) | removes the seat and returns the persona to the select | |
| **Create council** / **Save council** | writes; disabled below 2 seats. Saving a council **must not** change any finished transcript | |

**Pass rule.** Every row above ticked, and no control encountered that is not in the table. A
control found on screen but missing from this inventory is itself a finding.

| | |
| --- | --- |
| Controls that did nothing | |
| Controls not listed above | |
| Result | |

---

### SC-3 — knip clean, CI green

> `knip` reports **zero** unused exports/files; CI green on `main` continuously.

**How it is measured.** Two commands and the Actions tab. Neither command needs
`DATABASE_URL`, an API key, or network access.

```powershell
npm run check   # typecheck + lint + test + knip
npm run build
```

**Coder-observed baseline** at `5d563dc` (branch `v2`):

| Gate | Observed | Convener's re-run |
| --- | --- | --- |
| `tsc --noEmit` | clean | |
| `next lint` | `✔ No ESLint warnings or errors` | |
| `vitest run` | **44** test files, **954** tests, all passing | |
| `knip` | **zero** findings | |
| `next build` | compiled; **17** routes; shared JS **99.7 kB** | |

**CI.** `.github/workflows/ci.yml` runs `npm ci && npm run check && npm run build` on push and
pull request to `v2` and `main`. Check the Actions tab is green on the head of `v2`.

**Pass rule.** Both commands exit 0, `knip` reports zero, and the latest CI run on `v2` is
green.

| | |
| --- | --- |
| `npm run check` | |
| `npm run build` | |
| CI on head of `v2` | |
| Result | |

---

### SC-4 — turn latency

> p95 non-streaming turn latency < 10s with default model; failures always surface with retry.

**How it is measured.** Against the **real** provider — the mock provider answers instantly
and proves nothing — with the **app default model `claude-sonnet-5`** chosen in the session
picker. Record the model beside the number.

**Primary method — time the endpoint.** One sample per call, sequential: the server allows one
generation in flight per session and answers a second with a 409.

```powershell
$id = '<session-uuid-from-the-url>'
1..7 | ForEach-Object {
  (Measure-Command {
    curl.exe -s -N -X POST "http://localhost:3000/api/sessions/$id/advance" | Out-Null
  }).TotalSeconds
}
```

- `advance` takes **no request body**.
- The response is an event stream that ends only once the turn has been persisted, so each
  measurement slightly **over**-states turn latency. That is conservative in the right
  direction.
- These calls consume real turns against the 60-turn cap and are indistinguishable from
  pressing **Step** in the UI.

**Cross-check.** DevTools → Network → the durations of the `advance` and `synthesize` requests
while driving the UI by hand.

**Sample plan — 20 samples.** The SC-1 Red Team session (3 personas × 2 rounds = 6 turns, plus
1 synthesis) and one **Decision Panel** session (4 personas × 3 rounds = 12 turns, plus 1
synthesis) give exactly 20.

**p95 rule, nearest-rank.** Sort the samples ascending and take the value at index
`ceil(0.95 × n)`. With n = 20 that is the **19th** value.

```powershell
$s = @( <paste the numbers> ) | Sort-Object
$s[[math]::Ceiling(0.95 * $s.Count) - 1]
```

Record `n` next to the result. **With n < 20 the p95 collapses to the maximum** — say so
rather than reporting a maximum as a p95.

**The second half of the criterion.** Confirm at least one failure surfaces inline with a
working **Retry**. **Pause** mid-turn produces one on demand: the turn is stored `failed` with
`aborted by convener` and carries a Retry button.

**Pass rule.** p95 **< 10s** on `claude-sonnet-5`, and a failed turn shows its message inline
with a Retry that works.

| | |
| --- | --- |
| Model | |
| n | |
| p95 (s) | |
| min / max (s) | |
| Failure surfaced inline with working Retry | |
| Result | |

---

### SC-5 — engage by name

> Subjective quality bar (the one that matters): in a 2-round session, every Round-2 turn
> references another persona's argument by name. If prompting can't reliably achieve this,
> fixing it outranks any milestone work.

**What the app actually asks for.** From `lib/council/prompt.ts:139`, added to the system
prompt for every persona turn in round ≥ 2, verbatim:

> `Engage at least one prior argument by persona name: name the council member you are`
> `responding to and quote or paraphrase their point before answering it.`

**How it is measured.** From the SC-1 session's export, so the judgement is made on stored
text rather than on scrolling. In the chamber press **Download .json**, then:

```powershell
$doc = Get-Content '<downloaded>.json' -Raw | ConvertFrom-Json
$names = $doc.session.councilSnapshot.members.name
$doc.turns |
  Where-Object { $_.kind -eq 'persona' -and $_.round -ge 2 } |
  ForEach-Object {
    $turn = $_
    $named = $names |
      Where-Object { $_ -ne $turn.speakerName } |
      Where-Object { $turn.content -like "*$_*" }
    [pscustomobject]@{
      seq     = $turn.seq
      speaker = $turn.speakerName
      named   = ($named -join ', ')
    }
  }
```

(The property paths follow the exported document shape in `lib/transfer/document.ts`:
`session.councilSnapshot.members[].name` and a top-level `turns[]`.)

**Pass rule.** **Zero** rows with an empty `named` column.

A name-drop is not the same as engagement: a turn may name The Skeptic and rebut nothing. That
is a human judgement — read the flagged turns and record it on the note line below rather than
letting the string match decide.

**Escalation, per §11.** A failure here **blocks the merge**. It does not become a follow-up
ticket: fixing prompting outranks any milestone work.

| | |
| --- | --- |
| Round-≥2 persona turns checked | |
| Turns naming nobody | |
| Turns that name but do not engage | |
| Result | |

---

### SC-6 — sufficiency kill-test (A2)

> **Sufficiency kill-test (A2):** the bar is not "beats one-shot Claude" — it is "the
> deliberation loop is good enough on small/local models to be useful where cloud models are
> banned." Concretely: a 2-round + synthesis session on a small model (Haiku as proxy until
> T-030b; then a local model) yields a synthesis the convener judges decision-useful, with the
> engage-by-name bar holding.

**How it is measured.** Repeat SC-1 exactly — same topic, **Red Team**, rounds 2 — with the
model picker set to **`claude-haiku-4-5-20251001`**. Then two judgements:

- **(a) Decision-useful synthesis?** Read it and answer plainly: does it name real points of
  agreement, state the unresolved disagreements with the strongest argument on each side, and
  end in a recommendation you could act on — or is it a bland restatement?
- **(b) Does SC-5 still hold?** Download this session's `.json` and run the SC-5 snippet
  against it.

**Consequence, per §11.** This is the one criterion whose failure is **not** a merge blocker
but a **re-plan trigger**: if small-model sessions cannot clear the bar after prompt
iteration, halt feature work and reassess. It also gates §13 — the deferred A2 candidates
(auto-convener mode, hybrid-synthesis prompt variant) may not be started unless this passes,
and not before the PRD is amended.

| | |
| --- | --- |
| Model | `claude-haiku-4-5-20251001` |
| (a) Synthesis decision-useful? | |
| (b) Engage-by-name holds on the small model? | |
| Result | |

---

## 5. Deliberately unfinished — the register

These are recorded decisions with pointers, not defects. None of them is a surprise at this
gate.

| Item | Where it's recorded | Why it's out | Risk if it stays out |
| --- | --- | --- | --- |
| `PATCH /api/sessions/:id {status: abandoned}` | PRD §8; README "Not shipped" | No handler and no control shipped; the `abandoned` value exists in the `session_status` enum and is unreachable from the app | A session can only be left `active` or `completed`; the list has no way to retire a stale one |
| Per-IP in-memory rate limiter | PRD §8, last bullet | Single user, no auth, localhost only | None locally; would matter the moment the app is exposed |
| M2 definition of done unverified | §3 above; T-024 note in `TASKS.md` | The T-024 gate ran out of Anthropic credits | Interject / reopen / snapshot-immunity are covered by tests but unobserved end-to-end |
| `retry-last` and `regenerate-last` do not stream | T-030 scope boundary in `TASKS.md` | They call the accumulator rather than the generator; streaming was scoped to `advance` and `synthesize` | Those two controls render their turn all at once — a visible inconsistency, no functional gap |
| Import creates a session with no council | T-031 scope boundary | The session document carries a snapshot, never a council id — a council is provenance, not content | An imported session cannot be re-run from its council; there is no merge or overwrite on import |
| No README screenshots | README (marked optional) | Optional at T-033 | Nothing beyond first-impression polish |
| PRD §12 cut list | PRD §12 | Ten items cut with the v1 corpse each rule buries | By design; re-opening any of them needs a PRD amendment |
| PRD §13 deferred items | PRD §13 | Zero obligation; the A2 candidates are gated on **SC-6** passing | None — but note that none may be started before the PRD is amended |

---

## 6. Merge decision

Tick one:

- [ ] **Merge `v2` → `main` as-is.**
- [ ] **Merge after named fixes:**
  1.
  2.
- [ ] **Do not merge.** Reason:

**What happens to `main`'s v1 history** (fast-forward vs. merge commit) — the convener's call,
recorded here:

Nothing in this document performs a merge, and no automated step in T-034 pushed to `main`.

---

## 7. Sign-off

Result: pass / fail / not-run.

| Check | Result | Observed value | Notes | Date |
| --- | --- | --- | --- | --- |
| PRE-1 M2 walkthrough — (a) run first, or (b) accept unverified | | | | |
| SC-1 Cold start < 3 min of user effort | | | | |
| SC-2 Zero dead controls | | | | |
| SC-3 `knip` clean, `check` + `build` exit 0, CI green on `v2` | | | | |
| SC-4 p95 turn latency < 10s on `claude-sonnet-5`; failures retryable | | | | |
| SC-5 Every Round-2 turn names another persona | | | | |
| SC-6 Sufficiency kill-test on `claude-haiku-4-5-20251001` | | | | |

**Console rule.** Any browser-console error, React warning, or unhandled error in the dev
server terminal is a finding **regardless of which check was in flight when it appeared**.
Acceptable and not failures: Next.js compile/ready lines, the "Download the React DevTools"
suggestion, and fast-refresh notices.

**Overall verdict (human):**

**Defects found:**

**Signed off by / date:**

---

## 8. Failure playbook

| What you see | What it is | What to do |
| --- | --- | --- |
| A Postgres error naming a missing `directive` column, on saving a council or creating a session | `drizzle/0002_melodic_bloodstrike.sql` has not been applied | `npm run db:migrate` (§2.2), then retry |
| `DATABASE_URL is not set. Set it in .env.local (Neon Postgres connection string). There is no fallback database.` | No database configured — thrown loudly, with no in-memory stand-in (R4) | Set `DATABASE_URL` in `.env.local` and restart `npm run dev` |
| `ANTHROPIC_API_KEY is not set. LLM_PROVIDER=anthropic requires it. Set the key in .env.local, or set LLM_PROVIDER=mock to run offline — there is no automatic fallback to the mock provider.` | No key. Note the last clause: the app will **not** quietly serve mock text | Set the key, or accept mock output — but a mock run cannot satisfy SC-4, SC-5 or SC-6 |
| `Session turn cap reached (60 generated turns).` | PRD §5.3's hard cap, counting regenerations. **Interject** deliberately stays live | Expected; start a new session. Watch for this if SC-4's endpoint sampling is repeated |
| `A turn is already being generated for this session. Wait for it to finish.` | The per-session lock answered a second concurrent request with a 409 | Sample SC-4 sequentially, one call at a time |
| `A turn failed to generate. Retry it in the transcript to continue.` (amber notice after **Run round**) | A round halted on a failed turn, by design | Read the red turn's own error text and press its **Retry** — this is also SC-4's second half working |
| `This browser did not grant clipboard access. Use Download .md instead.` | Non-secure origin or a blocked clipboard permission | Use **Download .md**. Not a defect |
