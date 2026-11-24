// Public online reservations support parties from 1 to 12 people (7–12 se sientan en 2–3 mesas juntas).
// Keep the website copy, availability checks and creation validation aligned with this constant.
export const MIN_ONLINE_PARTY_SIZE = 1;
export const MAX_ONLINE_PARTY_SIZE = 12;

export function isValidOnlinePartySize(value: number): boolean {
  return Number.isInteger(value)
    && value >= MIN_ONLINE_PARTY_SIZE
    && value <= MAX_ONLINE_PARTY_SIZE;
}
