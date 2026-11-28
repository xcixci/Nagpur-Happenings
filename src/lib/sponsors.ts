import type { SponsorRecord } from './sheet-map';

export function liveSponsor(
  sponsors: SponsorRecord[],
  placement: 'site' | 'weekend',
  today: string,
): SponsorRecord | null {
  for (const sponsor of sponsors) {
    if (sponsor.status !== 'live' || sponsor.placement !== placement || !sponsor.name.trim()) continue;
    if (sponsor.start_date && sponsor.start_date > today) continue;
    if (sponsor.end_date && sponsor.end_date < today) continue;
    return sponsor;
  }
  return null;
}
