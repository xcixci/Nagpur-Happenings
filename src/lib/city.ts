import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface CityCredit {
  name: string;
  instagram_url: string;
  site_url: string;
}

export interface City {
  slug: string;
  name: string;
  name_local: string;
  domain: string;
  id_prefix: string;
  whatsapp_number: string;
  whatsapp_channel_url: string;
  instagram_url: string;
  contact_email: string;
  community_form_url: string;
  feed_url: string;
  umami_website_id: string;
  timezone: string;
  theme: Record<string, string>;
  footer: {
    credit: CityCredit;
  };
}

const required: (keyof City)[] = [
  'slug',
  'name',
  'name_local',
  'domain',
  'id_prefix',
  'whatsapp_number',
  'whatsapp_channel_url',
  'instagram_url',
  'contact_email',
  'community_form_url',
  'feed_url',
  'umami_website_id',
  'timezone',
  'theme',
  'footer',
];

const slug = process.env.CITY || 'nagpur';

if (!/^[a-z0-9-]+$/.test(slug)) {
  throw new Error(`CITY must be a slug, got ${slug}`);
}

const file = resolve(process.cwd(), 'cities', `${slug}.json`);

let raw: string;
try {
  raw = readFileSync(file, 'utf8');
} catch {
  throw new Error(`No city config at cities/${slug}.json`);
}

const data = JSON.parse(raw) as City;

for (const key of required) {
  if (data[key] === undefined || data[key] === null) {
    throw new Error(`cities/${slug}.json is missing ${key}`);
  }
}

if (data.slug !== slug) {
  throw new Error(`cities/${slug}.json has slug "${data.slug}"`);
}

const credit = data.footer?.credit;
if (!credit?.name || !credit.instagram_url || !credit.site_url) {
  throw new Error(`cities/${slug}.json footer.credit needs name, instagram_url and site_url`);
}

export const city: City = data;
