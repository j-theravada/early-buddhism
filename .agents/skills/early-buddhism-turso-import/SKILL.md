---
name: early-buddhism-turso-import
description: Use when work in this repository needs to import the locally generated SQLite search database into Turso, replace or test the Early Buddhism Turso search DB, switch Vercel environment variables to a newly imported DB, or debug the local-DB-import deployment workflow.
---

# Early Buddhism Turso Import

## Scope

Use this skill only in this repository.

This is not a general search-performance skill. It covers one workflow: build or verify a local SQLite search DB, import that DB into Turso with `turso db import`, point Vercel at the imported DB, and verify the live site.

## Why Import

For this repository, loading large search data into remote Turso by running the seed script against the libSQL HTTP client is too slow for interactive use. Prefer:

```text
local SQLite generation -> compact/verify -> turso db import -> Vercel env switch -> live verification
```

Do not row-by-row seed hundreds of thousands or millions of rows into remote Turso unless the user explicitly asks to test that path.

## Required Checks

Before touching Turso or Vercel:

```sh
git status --short --branch
turso auth whoami || turso db list
turso db list
```

Treat existing worktree changes as user-owned. Do not stage, revert, or overwrite unrelated repository changes.

Known durable DBs may include:

- `early-buddhism-search`
- `early-buddhism`

Use a temporary/new DB name for validation, such as `early-buddhism-search-next` or a timestamped suffix. Do not destroy `early-buddhism-search` unless the user explicitly asks and the replacement has already been verified.

## Local DB Preparation

Use the repo's generator unless the user gives a different DB file:

```sh
bun run db:seed:local
sqlite3 app/generated/gakurin.db "pragma integrity_check;"
sqlite3 app/generated/gakurin.db "select key, value from search_database_meta order by key;"
du -h app/generated/gakurin.db
```

If the generated DB is used for Vercel bundle testing, remember that bundle behavior and Turso behavior are different. Do not infer Turso production latency from local SQLite alone.

## Turso Import

Import the finished local DB into a new Turso database. Example:

```sh
cp app/generated/gakurin.db /tmp/early-buddhism-search-next.db
turso db import /tmp/early-buddhism-search-next.db --group default
turso db shell early-buddhism-search-next \
  "select key, value from search_database_meta order by key;"
```

Get URL and token without printing the token:

```sh
URL="$(turso db show early-buddhism-search-next --url)"
TOKEN="$(turso db tokens create early-buddhism-search-next)"
```

When reporting, say that a token was created, but never include the token value.

## Vercel Environment Switch

Only switch production after the imported DB has passed basic validation.

Use `--force` for replacement and avoid echoing secrets:

```sh
vercel env add TURSO_DATABASE_URL production --scope jtba-digital --force --yes --value "$URL"
vercel env add TURSO_AUTH_TOKEN production --scope jtba-digital --force --yes --value "$TOKEN"
```

Then deploy through the repo's normal Git/Vercel flow or trigger a redeploy as appropriate. Confirm the alias:

```sh
vercel list --scope jtba-digital
vercel inspect https://early-buddhism.j-theravada.com --scope jtba-digital --timeout 2m
```

## Live Verification

Measure representative searches with cache-busting params:

```sh
for q in 八正道 ブッダ 法 ダンマパダ 慈悲; do
  encoded="$(bun -e 'console.log(encodeURIComponent(Bun.argv.at(-1)))' "$q")"
  curl --max-time 20 -sS -o "/tmp/search-${encoded}.json" \
    -w "$q\t%{http_code}\t%{time_starttransfer}\t%{time_total}\t%{size_download}\n" \
    "https://early-buddhism.j-theravada.com/api/talk-search?query=${encoded}&probe=$(date +%s)-$RANDOM"
done
```

Also verify any search-result behavior the user cares about in the browser if UI changes are involved.

## Cleanup

Clean up only after the new DB is verified and the user agrees or the temporary nature is clear.

Safe cleanup examples:

```sh
rm -f /tmp/early-buddhism-search-next.db
turso db destroy early-buddhism-search-next --yes
```

Never destroy a durable DB by default. If a failed import created a temporary DB, confirm its name before deleting it.

## Reporting

Report concrete state:

- Local DB path and size.
- Imported Turso DB name.
- Whether metadata/integrity checks passed.
- Whether Vercel environment variables changed.
- Deployment URL/alias status.
- Live timing results.
- Cleanup performed.

Do not report raw credentials or secret values.
