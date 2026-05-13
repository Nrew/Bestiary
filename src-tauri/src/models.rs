use chrono::{DateTime, Utc};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::{types::Json, FromRow};
use std::collections::HashMap;
use ts_rs::TS;
use uuid::Uuid;
use validator::{Validate, ValidationError};

pub type ID = String;

pub trait Validatable {
    fn validate(&self) -> Result<(), Vec<String>>;
}

fn pascal_variant_to_camel(variant: &str) -> String {
    let mut chars = variant.chars();
    match chars.next() {
        Some(first) => first.to_lowercase().chain(chars).collect(),
        None => String::new(),
    }
}

static SLUG_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
        .expect("SLUG_REGEX pattern is a valid regex - this is a compile-time constant")
});
static HEX_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^#[0-9a-fA-F]{6}$")
        .expect("HEX_REGEX pattern is a valid regex - this is a compile-time constant")
});

macro_rules! define_game_enum {
    ($(#[$outer:meta])* $name:ident, $($variant:ident),+ $(,)?) => {
        $(#[$outer])*
        #[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, TS)]
        #[ts(export_to = "../../src/types/generated.ts")]
        #[serde(rename_all = "camelCase")]
        pub enum $name {
            $($variant),+
        }

        impl sqlx::Type<sqlx::Sqlite> for $name {
            fn type_info() -> sqlx::sqlite::SqliteTypeInfo {
                <String as sqlx::Type<sqlx::Sqlite>>::type_info()
            }
        }

        impl<'q> sqlx::Encode<'q, sqlx::Sqlite> for $name {
            fn encode_by_ref(
                &self,
                args: &mut Vec<sqlx::sqlite::SqliteArgumentValue<'q>>,
            ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
                let s = match self {
                    $(Self::$variant => pascal_variant_to_camel(stringify!($variant))),+
                };
                args.push(sqlx::sqlite::SqliteArgumentValue::Text(s.into()));
                Ok(sqlx::encode::IsNull::No)
            }
        }

        impl<'r> sqlx::Decode<'r, sqlx::Sqlite> for $name {
            fn decode(value: sqlx::sqlite::SqliteValueRef<'r>) -> Result<Self, sqlx::error::BoxDynError> {
                let s = <String as sqlx::Decode<sqlx::Sqlite>>::decode(value)?;
                serde_json::from_str(&format!("\"{}\"", s)).map_err(Into::into)
            }
        }
    };
}

define_game_enum!(ItemType, Weapon, Armor, Consumable, Trinket, Material, Organic, Tool);
define_game_enum!(Rarity, Common, Uncommon, Rare, VeryRare, Legendary, Mythic, Unique);
define_game_enum!(
    AbilityType,
    Action,
    BonusAction,
    Reaction,
    Passive,
    Legendary,
    Lair,
    Mythic
);
define_game_enum!(AoeShape, Sphere, Cube, Cone, Line, Cylinder);
define_game_enum!(
    DamageType,
    Acid,
    Bludgeoning,
    Cold,
    Fire,
    Force,
    Lightning,
    Necrotic,
    Piercing,
    Poison,
    Psychic,
    Radiant,
    Slashing,
    Thunder
);
define_game_enum!(EntitySize, Tiny, Small, Medium, Large, Huge, Gargantuan);
define_game_enum!(ThreatLevel, Trivial, Easy, Medium, Hard, Deadly, Legendary);
define_game_enum!(
    Attribute,
    Strength,
    Dexterity,
    Constitution,
    Intelligence,
    Wisdom,
    Charisma
);
define_game_enum!(ResistanceLevel, Vulnerable, Resistant, Immune);

#[derive(Serialize, Deserialize, Debug, Clone, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct GameEnums {
    pub item_types: Vec<ItemType>,
    pub rarities: Vec<Rarity>,
    pub ability_types: Vec<AbilityType>,
    pub aoe_shapes: Vec<AoeShape>,
    pub damage_types: Vec<DamageType>,
    pub entity_sizes: Vec<EntitySize>,
    pub threat_levels: Vec<ThreatLevel>,
    pub attributes: Vec<Attribute>,
    pub resistance_levels: Vec<ResistanceLevel>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum StatValue {
    Flat { value: f64 },
    PercentAdd { value: f64 },
    PercentMult { value: f64 },
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub enum StackingBehavior {
    #[default]
    No,
    Refresh,
    Stack,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct StatusEffectPayload {
    pub move_penalty: Option<StatValue>,
    pub attack_penalty: Option<StatValue>,
    pub defense_bonus: Option<StatValue>,
    pub duration_rounds: Option<u32>,
    pub duration_minutes: Option<f32>,
    #[serde(default)]
    pub stacks: StackingBehavior,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    #[ts(type = "Record<string, unknown>")]
    pub custom: HashMap<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct StatBlock {
    pub hp: Option<i32>,
    pub hit_dice: Option<String>,
    pub armor: Option<i32>,
    pub armor_note: Option<String>,
    pub speed: Option<f32>,
    pub burrow_speed: Option<f32>,
    pub climb_speed: Option<f32>,
    pub fly_speed: Option<f32>,
    pub swim_speed: Option<f32>,
    pub hover_speed: Option<f32>,
    pub initiative_bonus: Option<i32>,
    pub strength: Option<i32>,
    pub dexterity: Option<i32>,
    pub constitution: Option<i32>,
    pub intelligence: Option<i32>,
    pub wisdom: Option<i32>,
    pub charisma: Option<i32>,
    #[serde(default)]
    #[ts(type = "Record<string, number | string>")]
    pub custom: HashMap<String, serde_json::Value>,
}

impl StatBlock {
    /// Idempotent migration that lifts legacy stat-block fields out of `custom`
    /// into their proper typed columns. Older entries stored hitDice / armorNote /
    /// movement speeds / initiativeBonus under `custom`; new schema has them as
    /// real fields. Runs on every entity hydrate so the frontend never sees the
    /// legacy shape and never needs to migrate on mount.
    pub fn normalize_legacy_custom_stats(&mut self) {
        // Legacy keys that may exist only under `custom`; each maps to a typed field above.
        let legacy_keys = [
            "hitDice", "hit_dice",
            "armorType", "armor_type", "armorNote", "armor_note",
            "burrowSpeed", "burrow_speed",
            "climbSpeed", "climb_speed",
            "swimSpeed", "swim_speed",
            "flySpeed", "fly_speed",
            "hoverSpeed", "hover_speed",
            "initiative", "initiativeBonus", "initiative_bonus",
        ];

        for key in legacy_keys {
            if let Some(value) = self.custom.get(key).cloned() {
                let consumed = match key {
                    "hitDice" | "hit_dice" => assign_string(&mut self.hit_dice, &value),
                    "armorType" | "armor_type" | "armorNote" | "armor_note" => {
                        assign_string(&mut self.armor_note, &value)
                    }
                    "burrowSpeed" | "burrow_speed" => assign_f32(&mut self.burrow_speed, &value),
                    "climbSpeed" | "climb_speed" => assign_f32(&mut self.climb_speed, &value),
                    "swimSpeed" | "swim_speed" => assign_f32(&mut self.swim_speed, &value),
                    "flySpeed" | "fly_speed" => assign_f32(&mut self.fly_speed, &value),
                    "hoverSpeed" | "hover_speed" => assign_f32(&mut self.hover_speed, &value),
                    "initiative" | "initiativeBonus" | "initiative_bonus" => {
                        assign_i32(&mut self.initiative_bonus, &value)
                    }
                    _ => false,
                };
                if consumed {
                    self.custom.remove(key);
                }
            }
        }
    }
}

fn assign_string(target: &mut Option<String>, value: &serde_json::Value) -> bool {
    if target.is_some() {
        return true;
    }
    let text = match value {
        serde_json::Value::String(s) => s.trim().to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        _ => return false,
    };
    if text.is_empty() {
        return true;
    }
    *target = Some(text);
    true
}

fn assign_f32(target: &mut Option<f32>, value: &serde_json::Value) -> bool {
    if target.is_some() {
        return true;
    }
    let parsed = match value {
        serde_json::Value::Number(n) => n.as_f64().map(|v| v as f32),
        serde_json::Value::String(s) => s.trim().parse::<f32>().ok(),
        _ => None,
    };
    if let Some(v) = parsed.filter(|v| v.is_finite()) {
        *target = Some(v);
    }
    true
}

fn assign_i32(target: &mut Option<i32>, value: &serde_json::Value) -> bool {
    if target.is_some() {
        return true;
    }
    let parsed = match value {
        serde_json::Value::Number(n) => n.as_i64().and_then(|v| i32::try_from(v).ok()),
        serde_json::Value::String(s) => s.trim().parse::<i32>().ok(),
        _ => None,
    };
    if let Some(v) = parsed {
        *target = Some(v);
    }
    true
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct Taxonomy {
    pub genus: Option<String>,
    pub species: Option<String>,
    pub subspecies: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Validate, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
#[validate(schema(function = "validate_durability"))]
pub struct Durability {
    pub current: u32,
    pub max: u32,
}

fn validate_durability(durability: &Durability) -> Result<(), ValidationError> {
    if durability.current > durability.max {
        let mut error = ValidationError::new("current_gt_max");
        error.message = Some("Current durability cannot be greater than max.".into());
        return Err(error);
    }
    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct LootDrop {
    pub item_id: ID,
    pub quantity: String,
    pub drop_chance: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct DamageResistance {
    pub damage_type: DamageType,
    pub level: ResistanceLevel,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AbilityTarget {
    SelfTarget,
    Target { range: u32, count: u32 },
    Area { shape: AoeShape, range: u32 },
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct SpellComponents {
    pub verbal: bool,
    pub somatic: bool,
    pub material: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct SavingThrow {
    pub dc: u32,
    pub attribute: Attribute,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AbilityEffect {
    Damage {
        formula: String,
        #[serde(rename = "damageType")]
        damage_type: DamageType,
    },
    Heal {
        formula: String,
    },
    ApplyStatus {
        #[serde(rename = "statusId")]
        status_id: ID,
        duration: String,
        #[serde(rename = "savingThrow")]
        saving_throw: Option<SavingThrow>,
    },
    ModifyStat {
        attribute: Attribute,
        value: StatValue,
        #[serde(rename = "durationRounds")]
        duration_rounds: u32,
    },
    Summon {
        #[serde(rename = "entityId")]
        entity_id: ID,
        quantity: String,
    },
    Transform {
        #[serde(rename = "targetEntityId")]
        target_entity_id: ID,
        duration: String,
        #[serde(rename = "revertOnDeath")]
        revert_on_death: bool,
    },
    Move {
        distance: u32,
        direction: String,
    },
    AreaOfEffect {
        shape: AoeShape,
        range: u32,
        effects: Vec<AbilityEffect>,
    },
    Custom {
        description: String,
        #[serde(default)]
        #[ts(type = "Record<string, unknown>")]
        data: HashMap<String, serde_json::Value>,
    },
}

// IPC/export payloads mirrored into `src/types/generated.ts` via ts-rs.

#[derive(Serialize, Deserialize, Clone, Debug, Validate, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct StatusExport {
    pub id: ID,
    #[validate(length(min = 1, message = "Name is required."))]
    pub name: String,
    #[validate(
        length(min = 1),
        regex(path = "*SLUG_REGEX", message = "Short tag must be a valid slug.")
    )]
    pub short_tag: String,
    #[validate(length(min = 1, message = "An icon must be selected."))]
    pub icon: String,
    #[validate(regex(path = "*HEX_REGEX", message = "Color must be a valid hex code."))]
    pub color: Option<String>,
    #[validate(length(min = 1, message = "Summary is required."))]
    pub summary: String,
    pub description: String,
    pub payload: StatusEffectPayload,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Validate, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct ItemExport {
    pub id: ID,
    #[validate(length(min = 1, message = "Name is required."))]
    pub name: String,
    #[validate(
        length(min = 1),
        regex(path = "*SLUG_REGEX", message = "Slug must be a valid slug format.")
    )]
    pub slug: String,
    pub r#type: ItemType,
    pub description: String,
    #[validate(length(min = 1, message = "An icon must be selected."))]
    pub icon: String,
    #[validate(range(min = 0.0, message = "Weight cannot be negative."))]
    pub weight: Option<f32>,
    #[validate(range(min = 0.0, message = "Bulk cannot be negative."))]
    pub bulk: Option<f32>,
    pub rarity: Option<Rarity>,
    #[ts(type = "Record<string, unknown>")]
    pub properties: HashMap<String, serde_json::Value>,
    pub equip_slots: Vec<String>,
    #[ts(type = "Record<string, StatValue>")]
    pub stat_modifiers: HashMap<String, StatValue>,
    #[validate(nested)]
    pub durability: Option<Durability>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Validate, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct AbilityExport {
    pub id: ID,
    #[validate(length(min = 1, message = "Name is required."))]
    pub name: String,
    #[validate(
        length(min = 1),
        regex(path = "*SLUG_REGEX", message = "Slug must be a valid slug format.")
    )]
    pub slug: String,
    pub description: String,
    pub r#type: AbilityType,
    pub target: Option<AbilityTarget>,
    pub casting_time: Option<String>,
    #[serde(default)]
    pub requires_concentration: bool,
    pub components: Option<SpellComponents>,
    pub recharge: Option<String>,
    #[validate(length(min = 1, message = "Ability must have at least one effect."))]
    pub effects: Vec<AbilityEffect>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Validate, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct EntityExport {
    pub id: ID,
    #[validate(length(min = 1, message = "Name cannot be empty."))]
    pub name: String,
    #[validate(
        length(min = 1),
        regex(path = "*SLUG_REGEX", message = "Slug must be a valid slug format.")
    )]
    pub slug: String,
    pub taxonomy: Taxonomy,
    pub size: Option<EntitySize>,
    pub threat_level: Option<ThreatLevel>,
    pub alignment: Option<String>,
    pub challenge_rating: Option<f32>,
    pub experience_points: Option<i32>,
    pub proficiency_bonus: Option<i32>,
    pub legendary_actions_per_round: Option<i32>,
    #[serde(default)]
    pub saving_throws: HashMap<Attribute, i32>,
    #[serde(default)]
    #[ts(type = "Record<string, number>")]
    pub skills: HashMap<String, i32>,
    #[serde(default)]
    pub damage_resistances: Vec<DamageResistance>,
    #[serde(default)]
    pub status_immunities: Vec<ID>,
    #[serde(default)]
    pub senses: Vec<String>,
    #[serde(default)]
    pub languages: Vec<String>,
    pub habitats: Vec<String>,
    pub description: String,
    pub stat_block: StatBlock,
    pub notes: String,
    pub status_ids: Vec<ID>,
    pub ability_ids: Vec<ID>,
    pub inventory: Vec<LootDrop>,
    pub images: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

// SQLite row shapes (`Json<*>` columns store nested types unchanged across round-trips).

#[derive(Debug, Clone, FromRow)]
pub struct Status {
    pub id: ID,
    pub name: String,
    pub short_tag: String,
    pub icon: String,
    pub color: Option<String>,
    pub summary: String,
    pub description: String,
    pub payload_json: Json<StatusEffectPayload>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct Item {
    pub id: ID,
    pub name: String,
    pub slug: String,
    pub r#type: ItemType,
    pub description: String,
    pub icon: String,
    pub weight: Option<f32>,
    pub bulk: Option<f32>,
    pub rarity: Option<Rarity>,
    pub properties_json: Json<HashMap<String, serde_json::Value>>,
    pub equip_slots_json: Json<Vec<String>>,
    pub stat_modifiers_json: Json<HashMap<String, StatValue>>,
    pub durability_json: Option<Json<Durability>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct Ability {
    pub id: ID,
    pub name: String,
    pub slug: String,
    pub description: String,
    pub r#type: AbilityType,
    pub target_json: Option<Json<AbilityTarget>>,
    pub casting_time: Option<String>,
    pub requires_concentration: bool,
    pub components_json: Option<Json<SpellComponents>>,
    pub recharge: Option<String>,
    pub effects_json: Json<Vec<AbilityEffect>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Default)]
pub struct Entity {
    pub id: ID,
    pub name: String,
    pub slug: String,
    pub notes: String,
    pub taxonomy_json: Json<Taxonomy>,
    pub size: Option<String>,
    pub threat_level: Option<String>,
    pub alignment: Option<String>,
    pub challenge_rating: Option<f32>,
    pub experience_points: Option<i32>,
    pub proficiency_bonus: Option<i32>,
    pub legendary_actions_per_round: Option<i32>,
    pub saving_throws_json: Json<HashMap<String, i32>>,
    pub skills_json: Json<HashMap<String, i32>>,
    pub damage_resistances_json: Json<Vec<DamageResistance>>,
    pub status_immunities_json: Json<Vec<ID>>,
    pub senses_json: Json<Vec<String>>,
    pub languages_json: Json<Vec<String>>,
    pub habitats_json: Json<Vec<String>>,
    pub description: String,
    pub stat_block_json: Json<StatBlock>,
    #[sqlx(skip)]
    pub status_ids: Vec<ID>,
    #[sqlx(skip)]
    pub ability_ids: Vec<ID>,
    #[sqlx(skip)]
    pub inventory: Vec<LootDrop>,
    #[sqlx(skip)]
    pub images: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Convert DB models into portable exports (unwrap `Json<T>`, RFC3339 timestamps).

impl From<Status> for StatusExport {
    fn from(db: Status) -> Self {
        Self {
            id: db.id,
            name: db.name,
            short_tag: db.short_tag,
            icon: db.icon,
            color: db.color,
            summary: db.summary,
            description: db.description,
            payload: db.payload_json.0,
            created_at: db.created_at.to_rfc3339(),
            updated_at: db.updated_at.to_rfc3339(),
        }
    }
}

impl From<Item> for ItemExport {
    fn from(db: Item) -> Self {
        Self {
            id: db.id,
            name: db.name,
            slug: db.slug,
            r#type: db.r#type,
            rarity: db.rarity,
            description: db.description,
            icon: db.icon,
            weight: db.weight,
            bulk: db.bulk,
            properties: db.properties_json.0,
            equip_slots: db.equip_slots_json.0,
            stat_modifiers: db.stat_modifiers_json.0,
            durability: db.durability_json.map(|d| d.0),
            created_at: db.created_at.to_rfc3339(),
            updated_at: db.updated_at.to_rfc3339(),
        }
    }
}

impl From<Ability> for AbilityExport {
    fn from(db: Ability) -> Self {
        Self {
            id: db.id,
            name: db.name,
            slug: db.slug,
            description: db.description,
            r#type: db.r#type,
            target: db.target_json.map(|t| t.0),
            casting_time: db.casting_time,
            requires_concentration: db.requires_concentration,
            components: db.components_json.map(|c| c.0),
            recharge: db.recharge,
            effects: db.effects_json.0,
            created_at: db.created_at.to_rfc3339(),
            updated_at: db.updated_at.to_rfc3339(),
        }
    }
}

impl From<Entity> for EntityExport {
    fn from(db: Entity) -> Self {
        let size = db.size.as_ref().and_then(|s| {
            match serde_json::from_str::<EntitySize>(&format!("\"{}\"", s)) {
                Ok(parsed) => Some(parsed),
                Err(_) => {
                    log::warn!(
                        "Unknown EntitySize variant '{}' decoded for entity id={}; falling back to None.",
                        s,
                        db.id
                    );
                    None
                }
            }
        });
        let threat_level = db.threat_level.as_ref().and_then(|s| {
            match serde_json::from_str::<ThreatLevel>(&format!("\"{}\"", s)) {
                Ok(parsed) => Some(parsed),
                Err(_) => {
                    log::warn!(
                        "Unknown ThreatLevel variant '{}' decoded for entity id={}; falling back to None.",
                        s,
                        db.id
                    );
                    None
                }
            }
        });

        let saving_throws: HashMap<Attribute, i32> = db
            .saving_throws_json
            .0
            .into_iter()
            .filter_map(|(k, v)| {
                match serde_json::from_str::<Attribute>(&format!("\"{}\"", k)) {
                    Ok(attr) => Some((attr, v)),
                    Err(_) => {
                        log::warn!(
                            "Unknown Attribute variant '{}' in saving_throws for entity id={}; dropping entry.",
                            k,
                            db.id
                        );
                        None
                    }
                }
            })
            .collect();

        Self {
            id: db.id,
            name: db.name,
            slug: db.slug,
            taxonomy: db.taxonomy_json.0,
            size,
            threat_level,
            alignment: db.alignment,
            challenge_rating: db.challenge_rating,
            experience_points: db.experience_points,
            proficiency_bonus: db.proficiency_bonus,
            legendary_actions_per_round: db.legendary_actions_per_round,
            saving_throws,
            skills: db.skills_json.0,
            damage_resistances: db.damage_resistances_json.0,
            status_immunities: db.status_immunities_json.0,
            senses: db.senses_json.0,
            languages: db.languages_json.0,
            habitats: db.habitats_json.0,
            description: db.description,
            stat_block: {
                // Idempotent migration: older entries stored hitDice / armorNote /
                // movement speeds / initiativeBonus in `custom`; lift them into
                // proper typed fields so the frontend never sees legacy shape.
                let mut sb = db.stat_block_json.0;
                sb.normalize_legacy_custom_stats();
                sb
            },
            notes: db.notes,
            status_ids: db.status_ids,
            ability_ids: db.ability_ids,
            inventory: db.inventory,
            images: db.images,
            created_at: db.created_at.to_rfc3339(),
            updated_at: db.updated_at.to_rfc3339(),
        }
    }
}

fn process_validation_errors(error: validator::ValidationErrors) -> Vec<String> {
    error
        .field_errors()
        .into_values()
        .flat_map(|errors| {
            errors
                .iter()
                .filter_map(|e| e.message.as_ref().map(|m| m.to_string()))
        })
        .collect()
}

fn collect_schema_errors<T: Validate>(value: &T) -> Vec<String> {
    match validator::Validate::validate(value) {
        Ok(()) => Vec::new(),
        Err(error) => process_validation_errors(error),
    }
}

fn validate_uuid(errors: &mut Vec<String>, label: &str, id: &str) {
    if Uuid::parse_str(id).is_err() {
        errors.push(format!("{} must be a valid UUID.", label));
    }
}

fn validate_ability_effect_ids(errors: &mut Vec<String>, effect: &AbilityEffect) {
    match effect {
        AbilityEffect::ApplyStatus { status_id, .. } => {
            validate_uuid(errors, "Ability effect status ID", status_id);
        }
        AbilityEffect::Summon { entity_id, .. } => {
            validate_uuid(errors, "Ability effect entity ID", entity_id);
        }
        AbilityEffect::Transform {
            target_entity_id, ..
        } => {
            validate_uuid(errors, "Ability effect target entity ID", target_entity_id);
        }
        AbilityEffect::AreaOfEffect { effects, .. } => {
            for nested in effects {
                validate_ability_effect_ids(errors, nested);
            }
        }
        AbilityEffect::Damage { .. }
        | AbilityEffect::Heal { .. }
        | AbilityEffect::ModifyStat { .. }
        | AbilityEffect::Move { .. }
        | AbilityEffect::Custom { .. } => {}
    }
}

impl Validatable for EntityExport {
    fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = collect_schema_errors(self);
        validate_uuid(&mut errors, "Entity ID", &self.id);
        for id in &self.status_immunities {
            validate_uuid(&mut errors, "Status immunity ID", id);
        }
        for id in &self.status_ids {
            validate_uuid(&mut errors, "Status effect ID", id);
        }
        for id in &self.ability_ids {
            validate_uuid(&mut errors, "Ability ID", id);
        }
        for loot in &self.inventory {
            validate_uuid(&mut errors, "Inventory item ID", &loot.item_id);
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

impl Validatable for ItemExport {
    fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = collect_schema_errors(self);
        validate_uuid(&mut errors, "Item ID", &self.id);
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

impl Validatable for AbilityExport {
    fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = collect_schema_errors(self);
        validate_uuid(&mut errors, "Ability ID", &self.id);
        for effect in &self.effects {
            validate_ability_effect_ids(&mut errors, effect);
        }
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

impl Validatable for StatusExport {
    fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = collect_schema_errors(self);
        validate_uuid(&mut errors, "Status ID", &self.id);
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

#[cfg(test)]
mod stat_block_normalize_tests {
    use super::*;
    use serde_json::json;

    fn empty_stat_block() -> StatBlock {
        StatBlock::default()
    }

    #[test]
    fn lifts_parseable_legacy_keys_into_typed_fields() {
        let mut sb = empty_stat_block();
        sb.custom.insert("climbSpeed".to_string(), json!("20"));
        sb.custom.insert("hitDice".to_string(), json!("8d10 + 40"));
        sb.custom.insert("SpellPower".to_string(), json!(15));

        sb.normalize_legacy_custom_stats();

        assert_eq!(sb.climb_speed, Some(20.0));
        assert_eq!(sb.hit_dice.as_deref(), Some("8d10 + 40"));
        assert_eq!(sb.custom.get("SpellPower"), Some(&json!(15)));
        assert!(sb.custom.get("climbSpeed").is_none());
        assert!(sb.custom.get("hitDice").is_none());
    }

    #[test]
    fn drops_unparseable_legacy_numeric_value_but_clears_key() {
        let mut sb = empty_stat_block();
        sb.custom
            .insert("flySpeed".to_string(), json!("30 ft. hover"));

        sb.normalize_legacy_custom_stats();

        assert_eq!(sb.fly_speed, None);
        // Legacy key is removed even when value can't be parsed — leaving it in
        // `custom` would still render as a phantom row in the UI.
        assert!(sb.custom.get("flySpeed").is_none());
    }

    #[test]
    fn drops_legacy_key_when_structured_field_already_populated() {
        let mut sb = empty_stat_block();
        sb.armor_note = Some("natural armor".to_string());
        sb.custom
            .insert("armorType".to_string(), json!("natural armor"));
        sb.custom.insert("SpellPower".to_string(), json!(15));

        sb.normalize_legacy_custom_stats();

        assert_eq!(sb.armor_note.as_deref(), Some("natural armor"));
        assert!(sb.custom.get("armorType").is_none());
        assert_eq!(sb.custom.get("SpellPower"), Some(&json!(15)));
    }

    #[test]
    fn no_op_when_custom_is_empty() {
        let mut sb = empty_stat_block();
        let before = sb.clone();
        sb.normalize_legacy_custom_stats();
        assert_eq!(sb, before);
    }

    #[test]
    fn accepts_snake_case_legacy_keys() {
        let mut sb = empty_stat_block();
        sb.custom.insert("climb_speed".to_string(), json!("15"));
        sb.custom
            .insert("initiative_bonus".to_string(), json!("2"));

        sb.normalize_legacy_custom_stats();

        assert_eq!(sb.climb_speed, Some(15.0));
        assert_eq!(sb.initiative_bonus, Some(2));
    }

    #[test]
    fn handles_initiative_aliases() {
        let mut sb = empty_stat_block();
        sb.custom.insert("initiative".to_string(), json!(3));

        sb.normalize_legacy_custom_stats();

        assert_eq!(sb.initiative_bonus, Some(3));
        assert!(sb.custom.get("initiative").is_none());
    }

    /// JSON round-trip integration test: a legacy stat block (with movement
    /// speeds stored under `custom`) deserializes, normalizes, and re-serializes
    /// with the legacy keys lifted into typed fields and removed from `custom`.
    ///
    /// This is the path every entity hydrate goes through via
    /// `From<Entity> for EntityExport`, so this test guards against a future
    /// refactor breaking the wire-level contract that the frontend depends on.
    #[test]
    fn round_trips_legacy_payload_through_serde() {
        let legacy_json = json!({
            "hp": 84,
            "armor": 15,
            "speed": 30,
            "strength": 18,
            "dexterity": 12,
            "constitution": 16,
            "intelligence": 8,
            "wisdom": 10,
            "charisma": 9,
            "custom": {
                "climbSpeed": "20",
                "hitDice": "8d10 + 40",
                "armorType": "natural armor",
                "initiativeBonus": "2",
                "SpellPower": 15
            }
        });

        let mut sb: StatBlock = serde_json::from_value(legacy_json).expect("legacy JSON parses");
        sb.normalize_legacy_custom_stats();

        // Typed fields populated from legacy custom keys
        assert_eq!(sb.climb_speed, Some(20.0));
        assert_eq!(sb.hit_dice.as_deref(), Some("8d10 + 40"));
        assert_eq!(sb.armor_note.as_deref(), Some("natural armor"));
        assert_eq!(sb.initiative_bonus, Some(2));

        // Legacy keys removed from custom; user-defined keys preserved
        assert!(sb.custom.get("climbSpeed").is_none());
        assert!(sb.custom.get("hitDice").is_none());
        assert!(sb.custom.get("armorType").is_none());
        assert!(sb.custom.get("initiativeBonus").is_none());
        assert_eq!(sb.custom.get("SpellPower"), Some(&json!(15)));

        // Re-serialize and confirm the shape the frontend will see
        let serialized = serde_json::to_value(&sb).expect("StatBlock re-serializes");
        assert_eq!(serialized["climbSpeed"], json!(20.0));
        assert_eq!(serialized["hitDice"], json!("8d10 + 40"));
        assert_eq!(serialized["armorNote"], json!("natural armor"));
        assert_eq!(serialized["initiativeBonus"], json!(2));
        assert_eq!(serialized["custom"]["SpellPower"], json!(15));
        assert!(serialized["custom"].get("climbSpeed").is_none());
    }
}

// All TypeScript bindings exported to a single file; path defined once here.
// Run via: cargo test export_bindings --features ts-bindings
#[cfg(all(test, feature = "ts-bindings"))]
mod ts_export {
    use super::*;
    use crate::commands::utility_commands::ImportResult;
    use crate::error::AppError;
    use ts_rs::TS;

    const DEST: &str = "bindings";

    #[test]
    fn export_bindings() {
        // export_all_to writes the type and every type it transitively
        // references. These root types together cover every TS type in
        // the codebase; ts-rs deduplicates across calls to the same path.
        AppError::export_all_to(DEST).expect("AppError");
        GameEnums::export_all_to(DEST).expect("GameEnums");
        StatusExport::export_all_to(DEST).expect("StatusExport");
        ItemExport::export_all_to(DEST).expect("ItemExport");
        AbilityExport::export_all_to(DEST).expect("AbilityExport");
        EntityExport::export_all_to(DEST).expect("EntityExport");
        ImportResult::export_all_to(DEST).expect("ImportResult");
    }
}
