-- ── Core tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS statuses (
    id           TEXT PRIMARY KEY NOT NULL,
    name         TEXT NOT NULL,
    short_tag    TEXT UNIQUE NOT NULL,
    icon         TEXT NOT NULL,
    color        TEXT,
    summary      TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS items (
    id                  TEXT PRIMARY KEY NOT NULL,
    name                TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    type                TEXT NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    icon                TEXT NOT NULL,
    weight              REAL,
    bulk                REAL,
    rarity              TEXT,
    properties_json     TEXT NOT NULL DEFAULT '{}',
    equip_slots_json    TEXT NOT NULL DEFAULT '[]',
    stat_modifiers_json TEXT NOT NULL DEFAULT '{}',
    durability_json     TEXT,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS abilities (
    id                     TEXT PRIMARY KEY NOT NULL,
    name                   TEXT NOT NULL,
    slug                   TEXT UNIQUE NOT NULL,
    description            TEXT NOT NULL DEFAULT '',
    type                   TEXT NOT NULL,
    target_json            TEXT,
    casting_time           TEXT,
    requires_concentration INTEGER NOT NULL DEFAULT 0,
    components_json        TEXT,
    recharge               TEXT,
    effects_json           TEXT NOT NULL DEFAULT '[]',
    created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS entities (
    id                          TEXT PRIMARY KEY NOT NULL,
    name                        TEXT NOT NULL,
    slug                        TEXT UNIQUE NOT NULL,
    taxonomy_json               TEXT NOT NULL DEFAULT '{}',
    size                        TEXT,
    alignment                   TEXT,
    threat_level                TEXT,
    challenge_rating            REAL,
    experience_points           INTEGER,
    proficiency_bonus           INTEGER,
    legendary_actions_per_round INTEGER,
    saving_throws_json          TEXT NOT NULL DEFAULT '{}',
    skills_json                 TEXT NOT NULL DEFAULT '{}',
    damage_resistances_json     TEXT NOT NULL DEFAULT '[]',
    status_immunities_json      TEXT NOT NULL DEFAULT '[]',
    senses_json                 TEXT NOT NULL DEFAULT '[]',
    languages_json              TEXT NOT NULL DEFAULT '[]',
    habitats_json               TEXT NOT NULL DEFAULT '[]',
    description                 TEXT NOT NULL DEFAULT '',
    stat_block_json             TEXT NOT NULL DEFAULT '{}',
    notes                       TEXT NOT NULL DEFAULT '',
    created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS app_metadata (
    key        TEXT PRIMARY KEY NOT NULL,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ── Relationship tables ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entity_statuses (
    entity_id TEXT NOT NULL,
    status_id TEXT NOT NULL,
    PRIMARY KEY (entity_id, status_id),
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS entity_abilities (
    entity_id  TEXT NOT NULL,
    ability_id TEXT NOT NULL,
    PRIMARY KEY (entity_id, ability_id),
    FOREIGN KEY (entity_id)  REFERENCES entities(id)  ON DELETE CASCADE,
    FOREIGN KEY (ability_id) REFERENCES abilities(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS entity_inventory (
    entity_id   TEXT NOT NULL,
    item_id     TEXT NOT NULL,
    quantity    TEXT NOT NULL DEFAULT '1',
    drop_chance REAL NOT NULL DEFAULT 1.0,
    PRIMARY KEY (entity_id, item_id),
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id)   REFERENCES items(id)    ON DELETE RESTRICT
);

-- image_path stores a bare managed filename (e.g. "abc123.webp").
-- The CHECK constraint rejects path separators and dotfiles at the schema
-- level so path-traversal bugs cannot be introduced by future code changes.
CREATE TABLE IF NOT EXISTS entity_images (
    entity_id  TEXT NOT NULL,
    image_path TEXT NOT NULL
        CHECK (
            length(image_path) > 0
            AND instr(image_path, '/') = 0
            AND instr(image_path, '\') = 0
            AND substr(image_path, 1, 1) != '.'
        ),
    PRIMARY KEY (entity_id, image_path),
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- ── Full-text search ──────────────────────────────────────────────────────────

CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
    name, description, notes,
    content='entities', content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS t_entities_fts_insert AFTER INSERT ON entities BEGIN
    INSERT INTO entities_fts(rowid, name, description, notes)
    VALUES (new.rowid, new.name, new.description, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS t_entities_fts_delete AFTER DELETE ON entities BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description, notes)
    VALUES ('delete', old.rowid, old.name, old.description, old.notes);
END;
CREATE TRIGGER IF NOT EXISTS t_entities_fts_update AFTER UPDATE ON entities BEGIN
    INSERT INTO entities_fts(entities_fts, rowid, name, description, notes)
    VALUES ('delete', old.rowid, old.name, old.description, old.notes);
    INSERT INTO entities_fts(rowid, name, description, notes)
    VALUES (new.rowid, new.name, new.description, new.notes);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    name, description,
    content='items', content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS t_items_fts_insert AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, name, description)
    VALUES (new.rowid, new.name, new.description);
END;
CREATE TRIGGER IF NOT EXISTS t_items_fts_delete AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, name, description)
    VALUES ('delete', old.rowid, old.name, old.description);
END;
CREATE TRIGGER IF NOT EXISTS t_items_fts_update AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, name, description)
    VALUES ('delete', old.rowid, old.name, old.description);
    INSERT INTO items_fts(rowid, name, description)
    VALUES (new.rowid, new.name, new.description);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS statuses_fts USING fts5(
    name, summary, description,
    content='statuses', content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS t_statuses_fts_insert AFTER INSERT ON statuses BEGIN
    INSERT INTO statuses_fts(rowid, name, summary, description)
    VALUES (new.rowid, new.name, new.summary, new.description);
END;
CREATE TRIGGER IF NOT EXISTS t_statuses_fts_delete AFTER DELETE ON statuses BEGIN
    INSERT INTO statuses_fts(statuses_fts, rowid, name, summary, description)
    VALUES ('delete', old.rowid, old.name, old.summary, old.description);
END;
CREATE TRIGGER IF NOT EXISTS t_statuses_fts_update AFTER UPDATE ON statuses BEGIN
    INSERT INTO statuses_fts(statuses_fts, rowid, name, summary, description)
    VALUES ('delete', old.rowid, old.name, old.summary, old.description);
    INSERT INTO statuses_fts(rowid, name, summary, description)
    VALUES (new.rowid, new.name, new.summary, new.description);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS abilities_fts USING fts5(
    name, description,
    content='abilities', content_rowid='rowid'
);
CREATE TRIGGER IF NOT EXISTS t_abilities_fts_insert AFTER INSERT ON abilities BEGIN
    INSERT INTO abilities_fts(rowid, name, description)
    VALUES (new.rowid, new.name, new.description);
END;
CREATE TRIGGER IF NOT EXISTS t_abilities_fts_delete AFTER DELETE ON abilities BEGIN
    INSERT INTO abilities_fts(abilities_fts, rowid, name, description)
    VALUES ('delete', old.rowid, old.name, old.description);
END;
CREATE TRIGGER IF NOT EXISTS t_abilities_fts_update AFTER UPDATE ON abilities BEGIN
    INSERT INTO abilities_fts(abilities_fts, rowid, name, description)
    VALUES ('delete', old.rowid, old.name, old.description);
    INSERT INTO abilities_fts(rowid, name, description)
    VALUES (new.rowid, new.name, new.description);
END;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_entities_name         ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_slug         ON entities(slug);
CREATE INDEX IF NOT EXISTS idx_entities_size         ON entities(size);
CREATE INDEX IF NOT EXISTS idx_entities_threat_level ON entities(threat_level);
CREATE INDEX IF NOT EXISTS idx_entities_cr           ON entities(challenge_rating);

CREATE INDEX IF NOT EXISTS idx_items_name   ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_type   ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_slug   ON items(slug);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);

CREATE INDEX IF NOT EXISTS idx_abilities_name ON abilities(name);
CREATE INDEX IF NOT EXISTS idx_abilities_type ON abilities(type);
CREATE INDEX IF NOT EXISTS idx_abilities_slug ON abilities(slug);

CREATE INDEX IF NOT EXISTS idx_statuses_name      ON statuses(name);
CREATE INDEX IF NOT EXISTS idx_statuses_short_tag ON statuses(short_tag);

CREATE INDEX IF NOT EXISTS idx_entity_statuses_entity   ON entity_statuses(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_statuses_status   ON entity_statuses(status_id);
CREATE INDEX IF NOT EXISTS idx_entity_abilities_entity  ON entity_abilities(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_abilities_ability ON entity_abilities(ability_id);
CREATE INDEX IF NOT EXISTS idx_entity_inventory_entity  ON entity_inventory(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_inventory_item    ON entity_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_entity_images_entity     ON entity_images(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_images_path       ON entity_images(image_path);
