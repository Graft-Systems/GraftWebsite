import { describe, expect, it } from "vitest";
import {
  HEALTH_STALE_MS,
  STALE_STATION_MS,
  getConnectionHealth,
  getStationHealth,
} from "@/lib/spraySetupStatus";

const NOW = Date.parse("2026-05-12T12:00:00Z");

describe("spray setup status helpers", () => {
  it("marks provider health states from connection status and check age", () => {
    expect(
      getConnectionHealth(
        { status: "active", last_health_at: "2026-05-12T11:30:00Z" },
        NOW,
      ),
    ).toBe("active");
    expect(
      getConnectionHealth(
        {
          status: "active",
          last_health_at: new Date(NOW - HEALTH_STALE_MS - 1).toISOString(),
        },
        NOW,
      ),
    ).toBe("health_stale");
    expect(
      getConnectionHealth({ status: "active", last_health_at: null }, NOW),
    ).toBe("unchecked");
    expect(
      getConnectionHealth(
        { status: "needs_reauth", last_health_at: "2026-05-12T11:30:00Z" },
        NOW,
      ),
    ).toBe("needs_reauth");
  });

  it("marks station mapping and freshness states", () => {
    expect(
      getStationHealth(
        {
          linked_block_ids: ["block-1"],
          last_seen_at: new Date(NOW - STALE_STATION_MS + 1).toISOString(),
        },
        NOW,
      ),
    ).toBe("active");
    expect(
      getStationHealth(
        {
          linked_block_ids: ["block-1"],
          last_seen_at: new Date(NOW - STALE_STATION_MS - 1).toISOString(),
        },
        NOW,
      ),
    ).toBe("stale");
    expect(
      getStationHealth(
        { linked_block_ids: ["block-1"], last_seen_at: null },
        NOW,
      ),
    ).toBe("never_seen");
    expect(
      getStationHealth(
        { linked_block_ids: [], last_seen_at: "2026-05-12T11:00:00Z" },
        NOW,
      ),
    ).toBe("unmapped");
  });
});
