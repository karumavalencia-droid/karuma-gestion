export const MIN_ONLINE_PARTY_SIZE = 1;
export const MAX_ONLINE_PARTY_SIZE = 6;

export function isValidOnlinePartySize(value: number): boolean {
  return Number.isInteger(value)
    && value >= MIN_ONLINE_PARTY_SIZE
    && value <= MAX_ONLINE_PARTY_SIZE;
}
