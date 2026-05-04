# Contributing

Thanks for your interest in Bestiary. This document covers what you need to set up a development environment and the conventions PRs are reviewed against.

## Prerequisites

- **Node.js** — version pinned in [`.nvmrc`](.nvmrc). `nvm use` will pick up the right version.
- **Rust toolchain** — pinned in [`rust-toolchain.toml`](rust-toolchain.toml) (stable channel with `rustfmt` and `clippy` components).
- **Tauri 2 system dependencies** — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your platform. On Linux this includes `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`, and `libsoup-3.0-dev`.

## Initial setup

```bash
git clone https://github.com/nrew/bestiary
cd bestiary
npm ci
```

Generated TypeScript bindings under `src/types/generated.ts` are checked in. Regenerate them after touching any Rust type that derives `ts-rs::TS`:

```bash
npm run types:generate
```

## Running the app

```bash
# Dev mode with hot reload
npm run tauri:dev

# Production build (produces installers for the current platform)
npm run tauri:build
```

## Verification suite

The full release-gate verification:

```bash
npm run verify
```

This runs (in order):

1. `npm run lint` — TypeScript check + type-aware ESLint
2. `npm run build` — generated bindings + typecheck + Vite build
3. `npm test -- --run` — vitest
4. `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test --locked`

For a tagged release candidate, run:

```bash
npm run verify:release
```

That adds `npm audit --audit-level=moderate`, the documented Rust advisory check, and a local Tauri installer build. `npm run audit:rust` intentionally ignores `RUSTSEC-2023-0071` for this SQLite-only app because the vulnerable `rsa` crate is lockfile baggage through SQLx's macro/dependency surface, not an active shipped MySQL path. Remove that ignore when SQLx has a fixed path or if non-SQLite support is introduced.

CI runs the same release-gate checks as separate frontend, Rust, and advisory-audit jobs. Lint runs the same type-aware ESLint configuration used locally.

## Code conventions

- **TypeScript strict mode is non-negotiable.** `tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`. The codebase has zero `any`, `as any`, `@ts-ignore`, or `@ts-expect-error`. Keep it that way.
- **Lint:** `npm run lint` must pass (ESLint flat config, type-aware rules + React hooks + jsx-a11y).
- **Rust:** `cargo fmt` formatting, `cargo clippy -- -D warnings` clean, idiomatic `?` error propagation, and `AppError` for command boundaries.
- **Database migrations** are append-only. Add a new file under `src-tauri/migrations/` with the next ordinal prefix; never edit existing migrations.
- **Image references** stored in the database must be managed bare filenames. New code that touches `entity_images` must pipe refs through `image_filename_from_ref` for validation. Frontend code must persist only what the backend returns from `store_image`/`uploadImage`; never write absolute paths to the DB.
- **Accessible UI patterns:** keyboard navigation, focus restoration, screen-reader descriptions on dialogs. Use the project `ConfirmDialog` + `useConfirm` for confirmation flows; never `window.confirm` or `window.alert`.

## Pull request checklist

Before opening a PR:

- [ ] `npm run verify` passes locally
- [ ] For a tag/release branch, `npm run verify:release` passes locally
- [ ] If you touched a Rust type with `#[ts(export)]`, you ran `npm run types:generate` and committed the regenerated `src/types/generated.ts`
- [ ] If you added a database migration, you bumped the file ordinal and tested both fresh-install and upgrade-from-previous paths
- [ ] If you changed UI behavior, you ran `npm run tauri:dev` and exercised the affected flow
- [ ] You updated `CHANGELOG.md` under the `[Unreleased]` section

## Reporting bugs and feature requests

Open an issue on [GitHub](https://github.com/nrew/bestiary/issues). Include your platform, app version, and (for crashes) the relevant lines from the log file under your app-data directory.

For suspected vulnerabilities, do not post publicly. Follow [SECURITY.md](SECURITY.md) instead.
