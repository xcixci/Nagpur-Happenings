import type { OrganiserRecord, VenueRecord } from './sheet-map';

export function isVerifiedOrganiser(organiser: OrganiserRecord): boolean {
  return organiser.status === 'listed' && organiser.verified === true;
}

export function verifiedOrganisers(organisers: OrganiserRecord[]): OrganiserRecord[] {
  return organisers.filter(isVerifiedOrganiser).sort((a, b) => a.name.localeCompare(b.name));
}

export function organiserProfile(organisers: OrganiserRecord[], id: string): OrganiserRecord | undefined {
  if (!id) return undefined;
  return organisers.find((organiser) => organiser.id === id && isVerifiedOrganiser(organiser));
}

export function venueProfile(venues: VenueRecord[], id: string): VenueRecord | undefined {
  if (!id) return undefined;
  return venues.find((venue) => venue.id === id);
}

export function organiserTypeLabel(type: OrganiserRecord['type']): string {
  if (type === 'community') return 'Community';
  if (type === 'chapter') return 'Chapter';
  if (type === 'ngo') return 'NGO';
  if (type === 'organisation') return 'Organisation';
  return '';
}

export function sinceYear(founded: string): string {
  return founded.match(/\d{4}/)?.[0] ?? '';
}

export function servesAlcohol(organiser: OrganiserRecord): boolean {
  return organiser.alcohol === 'sometimes' || organiser.alcohol === 'usually';
}

export function taglineOf(organiser: OrganiserRecord): string {
  return organiser.tagline.trim().slice(0, 100);
}

export function organiserPrice(organiser: OrganiserRecord): string {
  const kind =
    organiser.price_type === 'free'
      ? 'Free'
      : organiser.price_type === 'paid'
        ? 'Paid'
        : organiser.price_type === 'mixed'
          ? 'Mixed'
          : '';
  const amount = organiser.typical_price.trim();
  const price = /^\d+(\.\d+)?$/.test(amount) ? `₹${Number(amount).toLocaleString('en-IN')}` : amount;
  if (kind && price) return `${kind}, ${price}`;
  return kind || price;
}
