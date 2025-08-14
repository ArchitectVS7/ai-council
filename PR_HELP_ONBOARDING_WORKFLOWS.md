# PR: Help & Onboarding UX fixes + Workflows terminology alignment

## Summary
- Auto-open first help article when a section is selected or when the Help modal is opened with a section.
- Hide onboarding popup immediately when starting the tour; ensure tour overlay sits above.
- Rename labels for clarity: “Flow Management” → “Workflows”; “Templates” → “Workflow Templates”.
- Update PRD and User Manual to consistently differentiate “workflows” (user-authored instances) vs “workflow templates” (reusable blueprints). Build verified.

## User Impact
- Fewer clicks in Help (no empty main panel on first click).
- Onboarding tour no longer obscured by the popup.
- Clearer navigation and terminology across the app and docs.

## Changes
- Help
  - `components/help/HelpModal.tsx`: auto-select first article on section change; select first article on sidebar section click.
- Onboarding
  - `components/help/OnboardingFlow.tsx`: hide popup on start; lowered z-index to sit below tour overlay.
- Navigation/Labels
  - `components/layout/Sidebar.tsx`: Flow Management → Workflows; Templates → Workflow Templates.
  - `components/layout/AppHeader.tsx`: Flow Management → Workflows.
  - `app/(app)/flows/FlowsClient.tsx`: H1 updated to “Workflows”.
  - `app/page.tsx`: footer links updated.
- Documentation
  - `design-docs/PRD.md`: clarified workflows vs workflow templates; schema and API route updated to `/api/workflow-templates`.
  - `design-docs/User Manual.md`: updated “Workflow Templates (Blueprints)” terminology; API section: flows → workflows.

## Testing
- Local production build: passed (compile, typecheck, static generation OK).
- Manual UX checks:
  - Help: clicking any section loads its first article in the main panel.
  - Onboarding: clicking “Start Interactive Tour” closes popup and shows tour overlay unobstructed.
  - Navigation labels match across header, sidebar, flows page, and landing footer.

## Screenshots
- N/A (functional/label changes). Can add on request.

## Risk/Notes
- Low risk. Changes are scoped to client UI and docs. No DB/schema changes.

## Related
- Aligns with PRD Phase 2 polish and terminology consistency.
