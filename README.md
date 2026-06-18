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

Transcript search uses libSQL. Local development defaults to a SQLite file at
`app/generated/gakurin.db`, which is created by:

```bash
bun run db:seed:local
```

Production uses Turso when these server-side variables are set in Vercel
Production:

```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

To seed Turso from the generated talks and transcripts, run:

```bash
bun run db:seed:turso
```

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
