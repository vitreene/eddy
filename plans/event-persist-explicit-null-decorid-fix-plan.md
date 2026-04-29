# Plan — Event persist explicit null decorId fix

## Objective

Ensure event persistence treats `decorId: null` as an explicit clear (not as "keep current decor"), so reset flows do not resurrect stale placement classes from old event decors.

## Checklist

- [x] Confirm root cause in event persistence path (`addEventToContent`) for explicit `decorId: null`.
- [x] Implement explicit-null decor resolution in persistence logic while preserving existing behavior for `undefined`.
- [x] Add a regression smoke test covering `null` vs `undefined` decor persistence semantics.
- [x] Run targeted tests and validate no type/runtime regressions.

## Review

- [x] Reset flow can clear intro/outro/sustain `decorId` without old decor being restored by persistence.
- [x] Existing update behavior (when `decorId` is omitted) still preserves current decor link.

## Result

- Fixed persistence semantics in `addEventToContent`: explicit `decorId: null` now clears the relation instead of falling back to the previously stored decor.
- Added `resolveEventDecorIdForPersist` and a smoke test to lock behavior for `null`, `undefined`, and numeric ids.
