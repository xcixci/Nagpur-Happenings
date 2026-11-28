import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { city } from '../src/lib/city.ts';
import { cardModel, type CardModel } from '../src/lib/format.ts';
import { withLocalLogos } from '../src/lib/logos.ts';
import type { EventRecord, OrganiserRecord } from '../src/lib/sheet-map.ts';

const MAX_BYTES = 300 * 1024;
const root = process.cwd();
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, 'public', 'cards');

function fontCss(): string {
  const css = readFileSync(resolve(root, 'src/styles/global.css'), 'utf8');
  const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  return faces.map((block) => block.replaceAll('url("/fonts/', 'url("../public/fonts/')).join('\n');
}

async function jpegUnderLimit(shot: (quality: number) => Promise<Buffer>): Promise<{ bytes: Buffer; quality: number }> {
  let quality = 80;
  let bytes = await shot(quality);
  while (bytes.length > MAX_BYTES && quality > 16) {
    quality -= 8;
    bytes = await shot(quality);
  }
  if (bytes.length > MAX_BYTES) {
    quality = 10;
    bytes = await shot(quality);
  }
  return { bytes, quality };
}

async function main(): Promise<void> {
  const snapshotPath = resolve(root, 'data', city.slug, 'snapshot.json');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as {
    events?: EventRecord[];
    organisers?: OrganiserRecord[];
  };
  const events = snapshot.events ?? [];
  const organisers = withLocalLogos(snapshot.organisers ?? []).map((organiser) =>
    organiser.logo_url.startsWith('/logos/')
      ? { ...organiser, logo_url: pathToFileURL(resolve(root, 'public', organiser.logo_url.slice(1))).href }
      : organiser,
  );
  if (events.length === 0) {
    console.error(`data/${city.slug}/snapshot.json has no events`);
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    console.error('The build needs `npx playwright install chromium`.');
    process.exit(1);
  }

  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  page.setDefaultTimeout(30000);
  await page.goto(pathToFileURL(resolve(here, 'card.html')).href);
  await page.addStyleTag({ content: fontCss() });

  mkdirSync(outDir, { recursive: true });
  let written = 0;
  const oversized: string[] = [];

  for (const event of events) {
    if (!/^[\w-]+$/.test(event.id)) {
      console.warn(`  skip ${event.id}: id cannot be a file name`);
      continue;
    }
    try {
      const data: CardModel = cardModel(event, organisers, city.name, city.domain, city.timezone);
      const mode = await page.evaluate(async (card) => {
        const render = globalThis.renderCard;
        if (!render) throw new Error('renderCard is missing');
        return render(card);
      }, data);
      const { bytes, quality } = await jpegUnderLimit((qualityLevel) =>
        page.locator('#card').screenshot({ type: 'jpeg', quality: qualityLevel }));
      if (bytes.length > MAX_BYTES) oversized.push(event.id);
      writeFileSync(resolve(outDir, `${event.id}.jpg`), bytes);
      written += 1;
      const kb = Math.round(bytes.length / 1024);
      console.log(`  ${event.id}  ${String(mode).padEnd(6)} q${quality}  ${kb} KB  ${event.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  ${event.id}  skipped: ${message}`);
    }
  }

  await browser.close();
  console.log(`Preview cards: ${written}`);
  if (written === 0) {
    console.error('No preview cards were written.');
    process.exit(1);
  }
  if (oversized.length > 0) {
    console.error(`These cards are still over 300 KB: ${oversized.join(', ')}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
