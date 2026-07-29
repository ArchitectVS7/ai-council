/**
 * The loading state for `/` (T-032).
 *
 * Next renders this while the server component beside it awaits `listSessions`.
 * It mirrors the real page's outer shell — same `max-w-3xl` column, same gaps —
 * so the placeholder does not jump when the content lands.
 *
 * It renders no data of any kind: these are blank bars, not stand-in sessions.
 */
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6" aria-busy="true">
      <div
        role="status"
        aria-label="Loading sessions"
        data-testid="sessions-skeleton"
        className="flex flex-col gap-8"
      >
        <span className="sr-only">Loading sessions…</span>

        {/* The page title. */}
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />

        {/* The "New session" form block. */}
        <div className="flex flex-col gap-3">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded bg-slate-200" />
        </div>

        {/* The sessions list. */}
        <div className="flex flex-col gap-3">
          <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </main>
  )
}
