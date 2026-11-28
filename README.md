# Happenings

Events calendar for one city at a time. `CITY=nagpur` by default.

```bash
npm install
npx playwright install chromium
npm run build
```

The build needs `npx playwright install chromium`. Preview cards are rendered in Chromium, and the deploy workflow should run that install before `npm run build`.
