export type ConnectionLike = {
  status: "active" | "needs_reauth" | "disconnected";
  last_health_at: string | null;
};

export type StationLike = {
  last_seen_at: string | null;
  linked_block_ids: string[];
};

export type ConnectionHealth =
  | "active"
  | "needs_reauth"
  | "disconnected"
  | "health_stale"
  | "unchecked";

export type StationHealth = "active" | "stale" | "never_seen" | "unmapped";

export const HEALTH_STALE_MS = 24 * 60 * 60 * 1000;
export const STALE_STATION_MS = 2 * 60 * 60 * 1000;

export function getConnectionHealth(
  connection: ConnectionLike,
  nowMs = Date.now(),
): ConnectionHealth {
  if (connection.status === "disconnected") return "disconnected";
  if (connection.status === "needs_reauth") return "needs_reauth";
  if (!connection.last_health_at) return "unchecked";

  const checkedAt = new Date(connection.last_health_at).getTime();
  if (Number.isNaN(checkedAt) || nowMs - checkedAt > HEALTH_STALE_MS) {
    return "health_stale";
  }
  return "active";
}

export function getStationHealth(
  station: StationLike,
  nowMs = Date.now(),
): StationHealth {
  if (station.linked_block_ids.length === 0) return "unmapped";
  if (!station.last_seen_at) return "never_seen";

  const seenAt = new Date(station.last_seen_at).getTime();
  if (Number.isNaN(seenAt)) return "never_seen";
  return nowMs - seenAt > STALE_STATION_MS ? "stale" : "active";
}
