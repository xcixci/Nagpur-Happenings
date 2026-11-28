import type { APIRoute } from 'astro';
import { city } from '../../../lib/city';
import { icsDocument } from '../../../lib/format';
import { loadSnapshot } from '../../../lib/snapshot';
import type { EventRecord } from '../../../lib/sheet-map';

export function getStaticPaths() {
  return loadSnapshot().events.map((event) => ({
    params: { slug: event.slug },
    props: { event },
  }));
}

export const GET: APIRoute = ({ props, site }) => {
  if (!site) throw new Error('Set site in astro.config');
  const event = props.event as EventRecord;
  const pageUrl = new URL(`/events/${event.slug}/`, site).href;
  const body = icsDocument({
    event,
    pageUrl,
    cityName: city.name,
    timeZone: city.timezone,
    host: site.hostname,
    citySlug: city.slug,
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
    },
  });
};
