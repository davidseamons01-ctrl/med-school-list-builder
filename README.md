## Med School List Builder

Research-heavy medical school planning with source-tracked facts, a map-first explorer, and structured school research links.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Point `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at a Postgres database.

4. Push schema and seed data:

```bash
npm run db:push
npm run db:seed
```

5. Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deployment

This app is designed to deploy on Vercel with a hosted Postgres database.

1. Create or link a Vercel project.
2. Attach a Postgres provider such as Neon through Vercel Marketplace.
3. Pull the Vercel environment variables locally:

```bash
vercel env pull .env
```

4. Push the schema and seed the remote database:

```bash
npm run db:push
npm run db:seed
```

5. Deploy:

```bash
vercel --prod
```

## Notes

- The database needs seeded school data for the explorer and dashboard to be useful.
- Public AAMC tuition workbook values are imported into `SchoolFact`.
- Additional research links are preloaded into `SchoolResource`.
