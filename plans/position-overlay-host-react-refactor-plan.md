# Position overlay host refactor plan

## Checklist

- [x] Audit the current position overlay host lifecycle and identify where `data-vte-position-overlay-host` is created.
- [x] Remove imperative overlay-host creation/removal from `position-editor.service.ts`.
- [x] Move overlay-container resolution into `position-editor.machine.ts` using DOM references only (no cloned host node).
- [x] Update `visual-transform-grid-grid-native.tsx` to render into the resolved container and keep machine input synced from props.
- [x] Verify no `data-vte-position-overlay-host` node is created during edition and that drag/preview/commit still work.

## Review

- Removed the imperative `attachOverlayHost/detachOverlayHost` cycle from the position editor service.
- The position machine now resolves a stable React portal target (`overlayContainer` or `document.body`) and passes it to the drag service.
- The grid-native overlay component now syncs machine input from props and portals directly into that stable container.
- Verification: repository-wide search confirms `data-vte-position-overlay-host` is no longer referenced in code.
