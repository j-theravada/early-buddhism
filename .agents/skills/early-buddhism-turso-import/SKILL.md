---
name: early-buddhism-turso-import
description: Use when this repository needs to refresh or verify the Turso search tables, preserve application-owned data during a search update, or debug the in-place libSQL seed workflow.
---

# Early Buddhism Turso In-place Refresh

## Scope

Use this skill only in this repository.

The production Turso database is durable application storage. Search refreshes
must update the search tables in place and preserve unrelated tables, including
`user_watch_history`.

## Invariant

Use the existing `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Do not create a
replacement database, import the local SQLite file into a new database, or
switch Vercel's database URL during a normal search refresh.

`scripts/seed-search-database.ts` drops and recreates only its explicitly named
search tables inside one write transaction. It must never drop
`user_watch_history`, Drizzle's migration table, or other application-owned
tables.

## Required Checks

Before touching Turso:

```sh
git status --short --branch
turso auth whoami || turso db list
turso db list
```

Treat worktree changes as user-owned. Do not stage, revert, or overwrite
unrelated files. Resolve the configured database target without printing its
token. Creating a new token or changing cloud configuration requires explicit
approval at the point of action.

Before a production refresh, record the search metadata and whether the durable
history table exists. If it exists, record its row count:

```sh
turso db shell <database-name> \
  "select key, value from search_database_meta order by key;"
turso db shell <database-name> ".tables"
turso db shell <database-name> "select count(*) from user_watch_history;"
```

Run the last query only when `.tables` includes `user_watch_history`.

## Local Preparation

Generate and verify the local search database before the remote write:

```sh
bun run generate-talks
bun run db:seed:local
bun run db:migrate:local
sqlite3 app/generated/gakurin.db "pragma integrity_check;"
sqlite3 app/generated/gakurin.db \
  "select key, value from search_database_meta order by key;"
du -h app/generated/gakurin.db
```

Do not infer production latency from local SQLite.

## In-place Turso Refresh

Apply committed Drizzle migrations before deploying application code that
depends on them:

```sh
GAKURIN_DATABASE_TARGET=turso \
TURSO_DATABASE_URL="$URL" \
TURSO_AUTH_TOKEN="$TOKEN" \
bun run db:migrate:turso
```

Run the repository's existing remote seed against the current durable database:

```sh
GAKURIN_DATABASE_TARGET=turso \
TURSO_DATABASE_URL="$URL" \
TURSO_AUTH_TOKEN="$TOKEN" \
bun run db:seed:turso
```

This can take materially longer than a file import because the generated search
rows travel to Turso. The single write transaction is the safety boundary: a
failure must roll back rather than leave a partially refreshed index. Do not
fall back to database replacement for speed.

After completion, verify search metadata again and confirm that the history
table and its row count are unchanged.

## Live Verification

Verify representative search queries with cache-busting parameters:

```sh
for q in 八正道 ブッダ 法 ダンマパダ 慈悲; do
  encoded="$(bun -e 'console.log(encodeURIComponent(Bun.argv.at(-1)))' "$q")"
  curl --max-time 20 -sS -o "/tmp/search-${encoded}.json" \
    -w "$q\t%{http_code}\t%{time_starttransfer}\t%{time_total}\t%{size_download}\n" \
    "https://early-buddhism.j-theravada.com/api/talk-search?query=${encoded}&probe=$(date +%s)-$RANDOM"
done
```

When UI behavior changed, also verify it in the browser.

## Reporting

Report the database name, local integrity result and size, metadata before and
after, durable-table row count before and after, remote seed result, and live
query results. Never print credentials.
