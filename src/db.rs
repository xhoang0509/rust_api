use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Error, SqlitePool};

pub async fn init_pool(database_url: &str) -> Result<SqlitePool, Error> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                sqlx::query("PRAGMA foreign_keys = ON;")
                    .execute(conn)
                    .await?;
                Ok(())
            })
        })
        .connect(database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_init_pool_in_memory() {
        let pool = init_pool("sqlite::memory:").await;
        assert!(
            pool.is_ok(),
            "Failed to init in-memory sqlite pool: {:?}",
            pool.err()
        );
        let pool = pool.unwrap();

        // Verify table existence
        let row: (i64,) = sqlx::query_as(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='authors'",
        )
        .fetch_one(&pool)
        .await
        .expect("Failed to query authors table");
        assert_eq!(row.0, 1);

        let row: (i64,) = sqlx::query_as(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='posts'",
        )
        .fetch_one(&pool)
        .await
        .expect("Failed to query posts table");
        assert_eq!(row.0, 1);
    }
}
