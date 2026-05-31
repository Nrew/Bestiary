# Changelog

All notable changes to Bestiary will be documented here.

## [1.1.0] - 2026-05-30

### New
- **Spells on abilities.** Mark an ability as a spell and record its level, school, casting time, range, components, and duration, plus how often it can be cast (per day, per short or long rest, or a recharge roll). The entry page shows it the same way every time.
- **Abilities sorted like a stat block.** Tag each ability with when it happens (action, bonus action, reaction, and so on) and what it does (attack, save, utility, multiattack, lair, regional). The page groups them for you, so multiattacks and lair actions each get their own section.
- **A panel just for legendary and lair actions.** Legendary and mythic intro text and lair actions get their own panel instead of being mixed in with the rest.
- **Step back and forward through entries.** The app remembers the entries you've opened, so you can go back and forward. A new bookmark button in the top bar jumps to recent ones.
- **Page-turn animation.** Moving between entries now turns like a page instead of switching instantly. If you prefer less movement, it uses a gentle fade.
- **Roll for a new entry.** Creating an entry opens a 3D four-sided die you can spin and toss to choose what kind of entry to make.
- **Roll on a loot table.** One click rolls the table and shows what dropped, based on each item's drop chance.
- **A fuller example monster.** The built-in sample now includes spells, a multiattack, legendary actions, and a lair action, so the new features are easy to find.
- **Shortcuts that work while you type.** Save, cancel, or jump between fields with the keyboard without clicking out of a text box first.

### Improved
- **A tidier encounter builder.** The encounter window is smaller and stays the same size as you add creatures.
- **Easier sidebar navigation.** Arrow keys, Home, and End move through the list the way you'd expect, and screen readers correctly announce the selected entry.
- **Friendlier forms for screen readers.** Labels, errors, and hints are properly connected to their fields.
- **Entries open at the top.** Opening an entry starts you at the top of the page instead of partway down.
- **Smoother links between entries.** Following a link inside an entry takes you straight there, without the sidebar and the page disagreeing about what's selected.
- **Quicker to open.** Parts of the app load only when needed, so it starts faster.
- **Consistent buttons.** Buttons look and behave the same everywhere, including in pop-up windows.
- **Quieter saving.** Saving an entry takes you straight back to the page instead of popping up a "saved" message every time.

### Fixed
- **Hit-point rolls never come up zero.** Each die rolls at least 1, the way hit points work at the table.
- **Loot rows show the right colors.** Hovering a loot row no longer leaves it stuck on the wrong color.
- **Image galleries handle deletes safely.** Removing an image no longer causes errors.
- **Run-together stat names get spaced out.** A custom stat typed as "myCustomStat" now shows as "My Custom Stat".
- **Link previews stay up to date.** Hovering a link to another entry shows its current details instead of an old copy.
- **Tidier imports.** Custom stats come in cleanly, and old leftover values that can't be read are dropped instead of showing up as blank rows.
- **Recovers cleanly after a hiccup.** Forms and entry pages bounce back properly after a failed image load, after an import, and after switching sections.
- **Steadier link suggestions.** The suggestion list while you type a link no longer jumps around or loses the choice you've highlighted.
- **Cleaner editing of area abilities.** Removing one part of an area ability no longer scrambles the others.
- **Fewer false "unsaved changes" warnings.** Re-opening the entry you're already viewing (from a link or the sidebar) no longer warns about unsaved changes.
- **Clearer save errors.** If saving fails, you get a short, plain message and your work stays put, instead of a confusing technical error.
- **Instant loot results with less motion.** If you've turned animations down, loot results appear right away instead of waiting for the roll to finish.

### Polished
- **A more consistent look.** Colors, spacing, and text styles match across stat blocks and ability sections.
- **Consistent sidebar wording.** The abilities list always reads "Abilities".
- **Calmer, more consistent animations.** Movement across the app shares the same gentle timing, kept where it helps and removed where it didn't.
- **Snappier page turns.** Switching between entries settles faster and no longer plays two animations at once.
- **Gentler pop-up windows.** The new-entry, settings, shortcuts, and encounter windows open from the center, matching the confirmation pop-ups.
- **Cleaner note boxes.** The note boxes on abilities and the research-notes panel use a simple full border instead of a colored stripe down one side.
- **Easier reading.** Entry text uses one consistent set of sizes, and long headings wrap neatly instead of running off the edge.

## [1.0.0] - 2026-05-03

First public release.
