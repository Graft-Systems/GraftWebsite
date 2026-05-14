import { NextRequest, NextResponse } from "next/server";

/** Nominatim requires a descriptive User-Agent (no generic bots). */
const NOMINATIM_UA =
  "GraftSpray-Web/1.0 (+https://graftsystems.com/spray; vineyard map search)";

export type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
};

/**
 * GET /api/geocode?q=…
 * Proxies OpenStreetMap Nominatim (server-side) so we send a proper User-Agent
 * and avoid client CORS quirks. Keep queries short; respect rate limits in UI.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] satisfies GeocodeResult[] });
  }
  if (q.length > 280) {
    return NextResponse.json({ error: "query too long" }, { status: 400 });
  }

  const upstream = new URL("https://nominatim.openstreetmap.org/search");
  upstream.searchParams.set("q", q);
  upstream.searchParams.set("format", "json");
  upstream.searchParams.set("addressdetails", "0");
  upstream.searchParams.set("limit", "8");

  let res: Response;
  try {
    res = await fetch(upstream.toString(), {
      headers: {
        "User-Agent": NOMINATIM_UA,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "geocoder unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "geocoder error" },
      { status: res.status === 429 ? 429 : 502 }
    );
  }

  const raw = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  const results: GeocodeResult[] = raw.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    label: r.display_name,
  }));

  return NextResponse.json({ results });
}
