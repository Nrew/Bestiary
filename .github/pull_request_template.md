## Summary

-

## Verification

- [ ] `npm run verify`
- [ ] `npm run tauri:build` when release packaging is affected
- [ ] `npm run e2e:native` when native desktop, image, import/export, or persistence behavior is affected

## Release Readiness

- [ ] Generated TypeScript bindings are current after Rust type changes
- [ ] Database migrations are append-only and tested from a previous version
- [ ] New UI is keyboard-accessible and has labels/descriptions where needed
- [ ] Image changes persist only managed image refs, never absolute local paths
- [ ] Docs or changelog are updated for user-visible changes
