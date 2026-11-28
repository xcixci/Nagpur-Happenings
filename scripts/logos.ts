import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { city } from '../src/lib/city.ts';
import { httpUrl } from '../src/lib/format.ts';
import type { OrganiserRecord } from '../src/lib/sheet-map.ts';

const root = process.cwd();
const outDir = resolve(root, 'public', 'logos');

function driveThumbnail(value: string): string {
  const open = value.match(/drive\.google\.com\/open\?[^#]*\bid=([\w-]+)/i);
  const file = value.match(/drive\.google\.com\/file\/d\/([\w-]+)/i);
  const id = open?.[1] || file?.[1] || '';
  if (!id) return '';
  return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
}

function isImage(bytes: Buffer, contentType: string): boolean {
  if (contentType.startsWith('image/')) return true;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes.length >= 6 && bytes.toString('ascii', 0, 6) === 'GIF87a') return true;
  if (bytes.length >= 6 && bytes.toString('ascii', 0, 6) === 'GIF89a') return true;
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return true;
  return false;
}

async function download(url: string, dest: string): Promise<void> {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Happenings/1.0)' },
  });
  if (!response.ok) throw new Error(`responded ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = (response.headers.get('content-type') || '').split(';')[0]?.trim().toLowerCase() || '';
  if (contentType.startsWith('text/') || bytes.length < 100 || !isImage(bytes, contentType)) {
    throw new Error(contentType ? `not an image (${contentType})` : 'not an image');
  }
  const part = `${dest}.part`;
  writeFileSync(part, bytes);
  renameSync(part, dest);
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  for (const name of readdirSync(outDir)) {
    if (name.endsWith('.jpg') || name.endsWith('.part')) rmSync(resolve(outDir, name), { force: true });
  }

  const snapshotPath = resolve(root, 'data', city.slug, 'snapshot.json');
  let organisers: OrganiserRecord[] = [];
  try {
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as { organisers?: OrganiserRecord[] };
    organisers = snapshot.organisers ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Logos skipped: ${message}`);
    return;
  }

  let saved = 0;
  for (const organiser of organisers) {
    if (!/^[\w-]+$/.test(organiser.id)) continue;
    const dest = resolve(outDir, `${organiser.id}.jpg`);
    const source = organiser.logo_url.trim();
    const url = driveThumbnail(source) || httpUrl(source);
    if (!url) continue;
    try {
      await download(url, dest);
      saved += 1;
      console.log(`  ${organiser.id}  ${organiser.name}`);
    } catch (error) {
      rmSync(dest, { force: true });
      rmSync(`${dest}.part`, { force: true });
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  ${organiser.id}  tile (${message})`);
    }
  }
  console.log(`Logos: ${saved}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.warn(error instanceof Error ? error.message : error);
    process.exit(0);
  });
