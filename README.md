# Magazine Desk

Magazine Desk is a one-page Next.js reader for the latest public feed items from The Daily Beast, Defector, The Verge, The Ringer, 404 Media, The Bulwark, The 19th, and Puck.

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the site.

## Scheduling

The production site exposes `GET /api/cron/refresh-feeds`, protected by `Authorization: Bearer $CRON_SECRET`. The handler refreshes only when the current `America/New_York` hour is 6, 12, or 17.

Scheduling is handled by `.github/workflows/refresh-feeds.yml`, which calls the endpoint hourly and lets the route enforce the three refresh windows. `CRON_SECRET` must be set in both Vercel and GitHub Actions secrets.

Vercel Hobby projects cannot run more than one cron invocation per day, so `vercel.json` intentionally does not declare the hourly cron on Hobby. To use Vercel-managed scheduling after upgrading to Pro, replace the GitHub Actions schedule with:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-feeds",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Verification

Run the automated checks:

```bash
npm test
npm run build
```
