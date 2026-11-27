import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const slug = process.env.CITY || 'nagpur';
if (!/^[a-z0-9-]+$/.test(slug)) {
  throw new Error(`CITY must be a slug, got ${slug}`);
}

let city;
try {
  city = JSON.parse(readFileSync(new URL(`./cities/${slug}.json`, import.meta.url), 'utf8'));
} catch (error) {
  if (error && error.code === 'ENOENT') {
    throw new Error(`No city config at cities/${slug}.json`);
  }
  throw error;
}

export default defineConfig({
  output: 'static',
  site: `https://${city.domain}`,
  vite: {
    plugins: [tailwindcss()],
  },
});
