// League tier presentation. Tier index is 1..6 (server-authoritative).
export interface TierMeta {
  name: string;
  emoji: string;
  color: string; // accent used on the tier badge
}

export const TIERS: TierMeta[] = [
  { name: "Bronze", emoji: "🥉", color: "#CD7F32" },
  { name: "Silver", emoji: "🥈", color: "#B8C2CC" },
  { name: "Gold", emoji: "🥇", color: "#FFC53D" },
  { name: "Platinum", emoji: "💠", color: "#7FE3D4" },
  { name: "Diamond", emoji: "💎", color: "#5BC0FF" },
  { name: "Master", emoji: "👑", color: "#FF4D8D" },
];

export const tierMeta = (tier: number): TierMeta => TIERS[Math.min(6, Math.max(1, tier)) - 1];

// Whole days remaining until an ISO date string (server's week_ends, exclusive).
export function daysLeft(weekEnds: string): number {
  const end = new Date(weekEnds + "T00:00:00").getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}
