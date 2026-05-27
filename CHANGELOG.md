# Changelog

All notable changes to Bestiary will be documented here.

## [1.1.0] - 2026-05-20

### New
- **Spell details on abilities.** Mark an ability as a spell and fill in level, school, casting time, range, components, and duration. Pick how its uses work (per day, per short rest, per long rest, or a dice recharge) and the viewer will show it the same way every time.
- **Abilities grouped the way you read a stat block.** Each ability is tagged with when it happens (action, bonus action, reaction, free, legendary, lair, regional) and what it does (attack, save, utility, multiattack, lair action, regional effect). The viewer groups them automatically, so multiattacks and lair effects each get their own block.
- **Dedicated legendary and lair panel.** Legendary intro text, mythic intro text, and lair actions render in their own panel instead of mixing in with regular abilities.
- **Back and forward through entries.** A small history keeps the entries you've opened so you can step backward and forward. The header has a new bookmark button for jumping to recent entries.
- **Page-flip transition.** Moving between entries now uses a directional page-flip animation instead of a hard cut, with a quieter fade if you prefer reduced motion.
- **Dice picker for new entries.** Creating a new entry opens a 3D d4 you can spin and toss to choose the entry type.
- **Roll button on loot tables.** One click gives you a weighted random result from the table.
- **Richer sample data.** The bundled example monster now shows spells, a multiattack, legendary actions, and a lair action, so the new fields are easy to discover.
- **Keyboard shortcuts while typing.** Forms can opt specific shortcuts in even when a text field has focus, so you can save, cancel, or jump fields without leaving the keyboard.

### Improved
- **Compact encounter builder.** The encounter dialog is smaller and no longer grows as you add creatures to the roster.
- **Smoother keyboard and screen-reader support in the sidebar.** Arrow keys, Home, and End move through entries the way you expect, and screen readers announce the selected entry correctly.
- **Forms read correctly to assistive tools.** Labels, errors, and helper text are now properly linked to their inputs.
- **Pages start at the top.** Opening a new entry resets the scroll to the top instead of landing mid-page.
- **Wiki links no longer fight the sidebar.** Following a wiki link inside an entry navigates cleanly without the sidebar selection arguing with the viewer.
- **Faster first open.** Forms and viewer sections that load on demand start up more quickly.
- **One consistent button style.** Buttons across the app share the same focus ring, hover state, and medieval treatment in dialogs.

### Fixed
- **Hit-point rolls bottom out at 1 per die.** No more zero-damage dice from minimum rolls, matching how hit points work at the table.
- **Loot row colors stay correct on hover.** The border now matches the row state instead of getting stuck.
- **Image gallery is safe after deletes.** Out-of-range indices no longer cause errors.
- **camelCase stat keys render with spacing.** Custom stat keys written as `myCustomStat` display as `My Custom Stat` instead of running together.
- **Wiki link previews refresh.** Cached previews update when the target entry changes.
- **Cleaner stat-block imports.** Custom stat keys lift cleanly into the typed schema when they can, and unparseable legacy keys are dropped instead of leaking through as phantom rows.
- **Reset states behave after errors.** Forms and viewers recover correctly after image-load failures, after import, and after switching context.

### Polished
- **Unified styling across the stat block and ability sections.** Everything now uses the same set of design tokens, so colors, spacing, and typography stay consistent end to end.
- **Sidebar label.** The abilities sidebar consistently reads "Abilities" instead of mixing names.
- **Lighter animation footprint.** Animations were trimmed back to where they help and removed where they did not.

### Removed
- A standalone code-formatting script that was no longer needed.
- Unused internal helpers that were not reachable from anywhere in the app.

## [1.0.0] - 2026-05-03

First public release.
