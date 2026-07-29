/**
 * The loading state for `/sessions/[id]` (T-032).
 *
 * Next renders this while the server shell beside it awaits `loadSessionView`.
 * It mirrors the chamber's shell — topic banner, control row, transcript cards
 * with the same left rail — so the placeholder reads as a session about to
 * appear and nothing shifts when it does.
 *
 * It renders no data of any kind: these are blank bars, not stand-in turns.
 */
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6" aria-busy="true">
      <div
        role="status"
        aria-label="Loading session"
        data-testid="chamber-skeleton"
        className="flex flex-col gap-6"
      >
        <span className="sr-only">Loading session…</span>

        {/* The topic banner and its metadata line. */}
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>

        {/* The control row. */}
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-28 animate-pulse rounded bg-slate-200" />
        </div>

        {/* The transcript. */}
        <div className="flex flex-col gap-4">
          <div className="h-24 w-full animate-pulse rounded border border-slate-200 border-l-4 bg-slate-100" />
          <div className="h-24 w-full animate-pulse rounded border border-slate-200 border-l-4 bg-slate-100" />
          <div className="h-24 w-full animate-pulse rounded border border-slate-200 border-l-4 bg-slate-100" />
        </div>
      </div>
    </main>
  )
}
