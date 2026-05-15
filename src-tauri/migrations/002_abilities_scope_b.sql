-- ── New columns ───────────────────────────────────────────────────────────────
ALTER TABLE abilities ADD COLUMN spell_level INTEGER NULL;
ALTER TABLE abilities ADD COLUMN school TEXT NULL;
ALTER TABLE abilities ADD COLUMN ritual INTEGER NOT NULL DEFAULT 0;
ALTER TABLE abilities ADD COLUMN higher_levels TEXT NULL;
ALTER TABLE abilities ADD COLUMN uses_json TEXT NULL;

-- Rename type → timing, add orthogonal category axis with safe default.
ALTER TABLE abilities RENAME COLUMN type TO timing;
ALTER TABLE abilities ADD COLUMN category TEXT NOT NULL DEFAULT 'none';

-- ── Backfill: legacy `recharge` free-text → structured `uses_json` ────────────
-- Specific-first; unmatched values become uses_json=NULL and are dropped with the column below.

UPDATE abilities SET uses_json = json_object('kind','atWill')
WHERE uses_json IS NULL AND lower(trim(recharge)) = 'at will';

UPDATE abilities SET uses_json = json_object('kind','once')
WHERE uses_json IS NULL AND lower(trim(recharge)) = 'once';

UPDATE abilities SET uses_json = json_object('kind','perRest','count',1,'rest','short')
WHERE uses_json IS NULL AND lower(trim(recharge)) = 'short rest';

UPDATE abilities SET uses_json = json_object('kind','perRest','count',1,'rest','long')
WHERE uses_json IS NULL AND lower(trim(recharge)) = 'long rest';

UPDATE abilities SET uses_json = json_object('kind','perRest','count',1,'rest','dawn')
WHERE uses_json IS NULL AND lower(trim(recharge)) = 'dawn';

UPDATE abilities SET uses_json = json_object(
    'kind','perDay',
    'count', CAST(substr(trim(recharge), 1, instr(trim(recharge),'/') - 1) AS INTEGER)
)
WHERE uses_json IS NULL
  AND lower(trim(recharge)) GLOB '[1-9]/day';

UPDATE abilities SET uses_json = json_object(
    'kind','perRest',
    'count', CAST(substr(trim(recharge), 1, instr(trim(recharge),'/') - 1) AS INTEGER),
    'rest','short'
)
WHERE uses_json IS NULL
  AND lower(trim(recharge)) GLOB '[1-9]/short rest';

UPDATE abilities SET uses_json = json_object(
    'kind','perRest',
    'count', CAST(substr(trim(recharge), 1, instr(trim(recharge),'/') - 1) AS INTEGER),
    'rest','long'
)
WHERE uses_json IS NULL
  AND lower(trim(recharge)) GLOB '[1-9]/long rest';

UPDATE abilities SET uses_json = json_object(
    'kind','perRest',
    'count', CAST(substr(trim(recharge), 1, instr(trim(recharge),'/') - 1) AS INTEGER),
    'rest','dawn'
)
WHERE uses_json IS NULL
  AND lower(trim(recharge)) GLOB '[1-9]/dawn';

-- "Recharge N" single die (1-6)
UPDATE abilities SET uses_json = json_object(
    'kind','recharge',
    'min', CAST(substr(lower(trim(recharge)), 10, 1) AS INTEGER),
    'max', CAST(substr(lower(trim(recharge)), 10, 1) AS INTEGER)
)
WHERE uses_json IS NULL
  AND lower(trim(recharge)) GLOB 'recharge [1-6]';

-- "Recharge N-M" range (with optional unicode en-dash)
UPDATE abilities SET uses_json = json_object(
    'kind','recharge',
    'min', CAST(substr(replace(lower(trim(recharge)), '–', '-'), 10, 1) AS INTEGER),
    'max', CAST(substr(replace(lower(trim(recharge)), '–', '-'), 12, 1) AS INTEGER)
)
WHERE uses_json IS NULL
  AND replace(lower(trim(recharge)), '–', '-') GLOB 'recharge [1-6]-[1-6]';

-- ── Normalize categories: clear fields the validator forbids on non-'none' ───
UPDATE abilities SET
    spell_level = NULL,
    school = NULL,
    ritual = 0,
    higher_levels = NULL,
    components_json = NULL,
    target_json = NULL,
    requires_concentration = 0,
    uses_json = NULL
WHERE category != 'none';

UPDATE abilities SET effects_json = '[]'
WHERE category = 'multiattack';

-- ── Drop legacy columns ──────────────────────────────────────────────────────
ALTER TABLE abilities DROP COLUMN casting_time;
ALTER TABLE abilities DROP COLUMN recharge;

-- ── Indexes ──────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_abilities_type;
CREATE INDEX IF NOT EXISTS idx_abilities_timing ON abilities(timing);
CREATE INDEX IF NOT EXISTS idx_abilities_category ON abilities(category);
