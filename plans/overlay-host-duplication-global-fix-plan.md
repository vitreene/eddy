# Overlay host duplication global fix

## Checklist

- [x] Confirm remaining duplication source for `data-vte-grid-overlay-host` in transform editor path.
- [x] Remove imperative overlay host creation/removal from `transform-editor.service.ts`.
- [x] Update transform machine runtime context to use stable `overlayContainer` instead of service-owned host.
- [x] Update transform overlay component wiring to consume `overlayContainer` context.
- [x] Fix impacted smoke test mocks and re-run verification.

## Review

- The duplication bug remained because transform mode still used a legacy imperative host (`data-vte-grid-overlay-host`) even after position mode was migrated.
- Transform flow now mirrors the stable approach: React/XState own the container reference, the service no longer creates host nodes.
- Verified with `npm run typecheck`, `npx tsx tests/transform-editor-smoke.ts`, and repo search showing no `data-vte-grid-overlay-host`/`data-vte-position-overlay-host` references.
