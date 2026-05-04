use crate::error::AppError;
use crate::models::Validatable;
use async_trait::async_trait;
use sqlx::{FromRow, Pool, Sqlite, Transaction};

const MAX_LIMIT: u32 = 1000;
const MAX_OFFSET: u32 = 100_000;
// FTS5 query complexity limit; truncated at character boundaries
const MAX_QUERY_LENGTH: usize = 500;
const MAX_FTS_TERMS: usize = 16;

/// Escapes SQLite LIKE wildcards (`%` and `_`) so user input matches literally.
fn escape_like_pattern(query: &str) -> String {
    query
        .replace('\\', "\\\\") // Backslash first to avoid double-escaping
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn clamp_pagination(limit: u32, offset: u32) -> (u32, u32) {
    (
        std::cmp::min(limit.max(1), MAX_LIMIT),
        std::cmp::min(offset, MAX_OFFSET),
    )
}

fn truncate_query(query: &str) -> &str {
    if query.len() <= MAX_QUERY_LENGTH {
        return query;
    }

    let mut end = 0;
    for (idx, ch) in query.char_indices() {
        let next = idx + ch.len_utf8();
        if next > MAX_QUERY_LENGTH {
            break;
        }
        end = next;
    }
    &query[..end]
}

/// Build a conservative FTS5 prefix query from user text.
///
/// FTS5 MATCH has its own query language, so punctuation and operators from raw
/// user input can otherwise turn ordinary searches into syntax errors. This
/// keeps only word tokens and applies prefix matching to each term.
fn build_fts_prefix_query(query: &str) -> Option<String> {
    let terms: Vec<String> = query
        .split(|ch: char| !ch.is_alphanumeric())
        .filter(|term| !term.is_empty())
        .take(MAX_FTS_TERMS)
        .map(|term| format!("{}*", term.to_lowercase()))
        .collect();

    if terms.is_empty() {
        None
    } else {
        Some(terms.join(" "))
    }
}

#[async_trait]
pub trait Repository<TExport, TDb>
where
    TExport: Validatable + Clone + Send + Sync + 'static,
    TDb: for<'r> FromRow<'r, sqlx::sqlite::SqliteRow> + Send + Unpin + Into<TExport>,
{
    fn table_name() -> &'static str;

    /// Returns the FTS virtual table name, or None if FTS is not configured.
    fn fts_table_name() -> Option<&'static str> {
        None
    }

    async fn prepare_for_save(
        tx: &mut Transaction<'_, Sqlite>,
        export: &TExport,
    ) -> Result<(), AppError>;

    /// Hydrate additional relationships after fetching from DB
    async fn hydrate(_pool: &Pool<Sqlite>, _items: &mut [TDb]) -> Result<(), AppError> {
        Ok(())
    }

    async fn search(
        pool: &Pool<Sqlite>,
        query: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<TExport>, AppError> {
        let (limit, offset) = clamp_pagination(limit, offset);
        let query = truncate_query(query);

        let mut items: Vec<TDb> = if query.trim().is_empty() {
            sqlx::query_as(&format!(
                "SELECT * FROM {} ORDER BY name ASC LIMIT ? OFFSET ?",
                Self::table_name()
            ))
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await?
        } else {
            if let Some(fts_table) = Self::fts_table_name() {
                if let Some(search_term) = build_fts_prefix_query(query) {
                    sqlx::query_as(&format!(
                        "SELECT t.* FROM {} t JOIN {} fts ON t.rowid = fts.rowid WHERE {} MATCH ? ORDER BY rank LIMIT ? OFFSET ?",
                        Self::table_name(),
                        fts_table,
                        fts_table
                    ))
                    .bind(search_term)
                    .bind(limit)
                    .bind(offset)
                    .fetch_all(pool)
                    .await?
                } else {
                    Vec::new()
                }
            } else {
                // Escape LIKE wildcards in user input to prevent pattern injection
                let escaped_query = escape_like_pattern(query);
                sqlx::query_as(&format!(
                    "SELECT * FROM {} WHERE name LIKE ? ESCAPE '\\' ORDER BY name ASC LIMIT ? OFFSET ?",
                    Self::table_name()
                ))
                .bind(format!("%{}%", escaped_query))
                .bind(limit)
                .bind(offset)
                .fetch_all(pool)
                .await?
            }
        };

        Self::hydrate(pool, &mut items).await?;
        Ok(items.into_iter().map(Into::into).collect())
    }

    async fn count(pool: &Pool<Sqlite>, query: &str) -> Result<i64, AppError> {
        let query = truncate_query(query);
        let count: (i64,) = if query.trim().is_empty() {
            sqlx::query_as(&format!("SELECT COUNT(*) FROM {}", Self::table_name()))
                .fetch_one(pool)
                .await?
        } else {
            if let Some(fts_table) = Self::fts_table_name() {
                if let Some(search_term) = build_fts_prefix_query(query) {
                    sqlx::query_as(&format!(
                        "SELECT COUNT(*) FROM {} t JOIN {} fts ON t.rowid = fts.rowid WHERE {} MATCH ?",
                        Self::table_name(),
                        fts_table,
                        fts_table
                    ))
                    .bind(search_term)
                    .fetch_one(pool)
                    .await?
                } else {
                    (0,)
                }
            } else {
                // Escape LIKE wildcards in user input to prevent pattern injection
                let escaped_query = escape_like_pattern(query);
                sqlx::query_as(&format!(
                    "SELECT COUNT(*) FROM {} WHERE name LIKE ? ESCAPE '\\'",
                    Self::table_name()
                ))
                .bind(format!("%{}%", escaped_query))
                .fetch_one(pool)
                .await?
            }
        };
        Ok(count.0)
    }

    async fn get_by_id(pool: &Pool<Sqlite>, id: &str) -> Result<TExport, AppError> {
        let mut item: TDb = sqlx::query_as(&format!(
            "SELECT * FROM {} WHERE id = ?",
            Self::table_name()
        ))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound {
            id: id.to_string(),
            entity_type: Self::table_name().to_string(),
        })?;

        Self::hydrate(pool, std::slice::from_mut(&mut item)).await?;
        Ok(item.into())
    }

    async fn get_all(pool: &Pool<Sqlite>) -> Result<Vec<TExport>, AppError> {
        let mut items: Vec<TDb> = sqlx::query_as(&format!(
            "SELECT * FROM {} ORDER BY name ASC",
            Self::table_name()
        ))
        .fetch_all(pool)
        .await?;

        Self::hydrate(pool, &mut items).await?;
        Ok(items.into_iter().map(Into::into).collect())
    }

    /// Read-your-write consistency note: after committing the write transaction we
    /// immediately `acquire()` a single dedicated connection from the pool and use
    /// it for the read-back (`get_by_id` + `hydrate`). SQLite with WAL can expose a
    /// slightly stale snapshot to a different pool connection that was already
    /// holding an older read transaction; acquiring a fresh connection post-commit
    /// guarantees that connection sees the just-committed write, because a fresh
    /// connection begins its read transaction lazily at the next query and will
    /// observe the latest committed WAL frame. The hydrate implementations that
    /// fan out with `try_join!` still use the pool (they need concurrency for
    /// batched junction-table lookups), but the primary row fetch is bound to the
    /// fresh post-commit connection, which is the window that matters for the
    /// returned scalar fields.
    async fn save(pool: &Pool<Sqlite>, export: TExport) -> Result<TExport, AppError> {
        export.validate()?;

        let id = Self::get_id(&export);

        let mut tx = pool.begin().await?;
        Self::prepare_for_save(&mut tx, &export).await?;
        tx.commit().await?;

        // Acquire a fresh connection post-commit for the primary row fetch so we
        // cannot race with an older reader still holding an earlier snapshot.
        let mut conn = pool.acquire().await?;
        let mut item: TDb = sqlx::query_as(&format!(
            "SELECT * FROM {} WHERE id = ?",
            Self::table_name()
        ))
        .bind(&id)
        .fetch_optional(&mut *conn)
        .await?
        .ok_or_else(|| AppError::NotFound {
            id: id.clone(),
            entity_type: Self::table_name().to_string(),
        })?;
        // Release the dedicated connection before hydrate fans out across the pool.
        drop(conn);

        Self::hydrate(pool, std::slice::from_mut(&mut item)).await?;
        Ok(item.into())
    }

    async fn delete(pool: &Pool<Sqlite>, id: &str) -> Result<(), AppError> {
        let rows_affected =
            sqlx::query(&format!("DELETE FROM {} WHERE id = ?", Self::table_name()))
                .bind(id)
                .execute(pool)
                .await?
                .rows_affected();

        if rows_affected == 0 {
            return Err(AppError::NotFound {
                id: id.to_string(),
                entity_type: Self::table_name().to_string(),
            });
        }
        Ok(())
    }

    fn get_id(export: &TExport) -> String;
}

#[cfg(test)]
mod tests {
    use super::{build_fts_prefix_query, truncate_query, MAX_FTS_TERMS, MAX_QUERY_LENGTH};

    #[test]
    fn truncate_query_keeps_utf8_boundaries() {
        let query = "é".repeat(MAX_QUERY_LENGTH);
        let truncated = truncate_query(&query);

        assert!(truncated.len() <= MAX_QUERY_LENGTH);
        assert!(truncated.is_char_boundary(truncated.len()));
    }

    #[test]
    fn build_fts_prefix_query_strips_operators_and_punctuation() {
        let query = r#"dragon's -breath OR "fire""#;

        assert_eq!(
            build_fts_prefix_query(query).as_deref(),
            Some("dragon* s* breath* or* fire*")
        );
    }

    #[test]
    fn build_fts_prefix_query_returns_none_for_punctuation_only() {
        assert_eq!(build_fts_prefix_query("!!! *** ---"), None);
    }

    #[test]
    fn build_fts_prefix_query_limits_term_count() {
        let query = (0..MAX_FTS_TERMS + 4)
            .map(|idx| format!("term{}", idx))
            .collect::<Vec<_>>()
            .join(" ");
        let result = build_fts_prefix_query(&query).expect("query has terms");

        assert_eq!(result.split_whitespace().count(), MAX_FTS_TERMS);
    }
}
