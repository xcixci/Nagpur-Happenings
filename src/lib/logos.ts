import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OrganiserRecord } from './sheet-map';

const cache = new Map<string, string>();

export function localLogo(id: string): string {
  if (!/^[\w-]+$/.test(id)) return '';
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const file = resolve(process.cwd(), 'public', 'logos', `${id}.jpg`);
  const path = existsSync(file) ? `/logos/${id}.jpg` : '';
  cache.set(id, path);
  return path;
}

export function withLocalLogos(organisers: OrganiserRecord[]): OrganiserRecord[] {
  return organisers.map((organiser) => ({ ...organiser, logo_url: localLogo(organiser.id) }));
}
