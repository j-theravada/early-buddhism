This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Variables

Google Analytics is loaded from `app/layout.tsx` when this variable is set:

```bash
NEXT_PUBLIC_GA_ID=G-STEXVRMHCW
```

The Vercel project also needs `NEXT_PUBLIC_GA_ID` set for Production, Preview, and Development.

Search and signed-in watch history use one libSQL database. Local development
defaults to `app/generated/gakurin.db`, which is created by:

```bash
bun run db:seed:local
bun run db:migrate:local
```

Normal builds reuse the checked-in generated talk/transcript files and skip
Google Drive transcript downloads. Refresh the generated data explicitly when
the source sheets or transcript files change:

```bash
bun run generate-talks
bun run db:seed:local
```

`bun run build` also reuses the existing local search database when its
generated-data fingerprint matches the current generated files. Force a rebuild
with:

```bash
GAKURIN_FORCE_SEARCH_DATABASE_SEED=1 bun run db:seed:build
```

Production uses Turso when these server-side variables are set in Vercel
Production:

```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

Refresh production search tables in place. `db:seed:turso` replaces only the
named search tables in one transaction; application-owned tables such as
`user_watch_history` remain in the same durable database:

```bash
bun run generate-talks
bun run db:seed:local
GAKURIN_DATABASE_TARGET=turso \
TURSO_DATABASE_URL=libsql://... \
TURSO_AUTH_TOKEN=... \
bun run db:seed:turso
```

Do not import into a replacement Turso database or change Vercel's database URL
during a normal search refresh. Replacing the database would also replace
durable user data.

## Login

Login, account security, email verification, and password recovery use Clerk.
Authentication needs no application-owned user table.

Create a Clerk application and set these variables locally and in every Vercel
environment where login is enabled:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

The same Clerk application serves regular users and administrators. In the Clerk
Dashboard:

1. Keep **Access mode** open so regular users can sign up.
2. Set only subtitle administrators' public metadata to
   `{ "role": "subtitle_admin" }`.

The `/subtitle-admin` layout rejects users without the `subtitle_admin` role.
Every future subtitle-management API route and Server Action must repeat the
role check; protecting the page layout alone does not protect mutations.

### Watch history

Signed-in users' watch history is stored by Clerk user ID in the same durable
libSQL database. Drizzle owns the application schema and watch-history CRUD;
the search FTS seed remains raw SQL for bulk loading. Generate and commit a
migration after changing `app/infrastructure/database/schema.ts`:

```bash
bun run db:generate
```

Vercel Production builds apply committed migrations before building the
application. Preview and local builds skip this step. Run the same migration
manually when needed with:

```bash
bun run db:migrate:turso
```

Production migrations must remain backward-compatible with the currently live
deployment because a failed build does not roll back an already-applied schema
change.

Search refreshes must keep `user_watch_history` and Drizzle's migration table
intact.

After sign-in, the client imports the legacy
`early-buddhism:watch-history:v1` localStorage data once. The server merges by
`lastWatchedAt`, so older device data cannot overwrite newer account history.
The legacy key is removed only after a successful import.

Popular videos can be loaded from the GA4 Data API when these server-side variables are set:

```bash
GA4_PROPERTY_ID=517469983
GA4_POPULAR_VIDEO_LOOKBACK_DAYS=90
```

For authentication, use one of these options:

```bash
# OAuth user credentials for organizations that block service-account key creation.
GA4_OAUTH_CLIENT_ID=...
GA4_OAUTH_CLIENT_SECRET=...
GA4_OAUTH_REFRESH_TOKEN=...

# Or a service account key, when key creation is allowed.
GA4_SERVICE_ACCOUNT_JSON='{"client_email":"...","private_key":"..."}'
```

Instead of inline variables, `GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` can point to Google `service_account` or `authorized_user` JSON credentials. You can also set `GA4_CLIENT_EMAIL` with `GA4_PRIVATE_KEY` for service-account credentials.

Update the generated popular-video ranking with:

```bash
bun run update-popular-videos
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Contributors

- Masayuki Katsuyama（日本テーラワーダ仏教協会）
