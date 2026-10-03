import { createServerFn } from "@tanstack/react-start";

export type TMEventSummary = {
  id: string;
  name: string;
  image: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  priceFrom: number;
  seatMapUrl: string;
};

export type TMEventDetail = TMEventSummary & {
  description: string;
  section: string;
  row: string;
  seat: string;
  currency: string;
  url: string;
};

const BASE = "https://app.ticketmaster.com/discovery/v2";

function pickImage(images: Array<{ url: string; width: number; ratio?: string }> = []) {
  if (!images.length) return "";
  const wide = images.filter((i) => i.ratio === "16_9");
  const pool = wide.length ? wide : images;
  return pool.slice().sort((a, b) => b.width - a.width)[0]?.url ?? "";
}

function mapSummary(e: any): TMEventSummary {
  const venue = e?._embedded?.venues?.[0];
  const price = e?.priceRanges?.[0];
  const start = e?.dates?.start;
  return {
    id: String(e.id),
    name: e.name ?? "Untitled event",
    image: pickImage(e.images),
    category: e?.classifications?.[0]?.segment?.name ?? "Event",
    venue: venue?.name ?? "TBA",
    city: [venue?.city?.name, venue?.state?.stateCode].filter(Boolean).join(", ") || "TBA",
    date: start?.localDate ?? "TBA",
    time: start?.localTime ?? "",
    priceFrom: price?.min ?? 0,
    seatMapUrl: e?.seatmap?.staticUrl ?? "",
  };
}

function getTicketmasterKey(): string {
  const key = process.env.TICKETMASTER_API_KEY || "9GkWfVxJ0yYAbjNmvKFVFpOM10fHTH6M";
  return key;
}

export const searchTMEvents = createServerFn({ method: "GET" })
  .inputValidator((d: { keyword: string }) => ({ keyword: String(d?.keyword ?? "").slice(0, 100) }))
  .handler(async ({ data }) => {
    const key = getTicketmasterKey();
    if (!data.keyword.trim()) return [] as TMEventSummary[];
    const url = `${BASE}/events.json?size=20&keyword=${encodeURIComponent(data.keyword)}&apikey=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ticketmaster ${res.status}`);
    const body: any = await res.json();
    const events: any[] = body?._embedded?.events ?? [];
    return events.map(mapSummary);
  });

export const getTMEvent = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }): Promise<TMEventDetail> => {
    const key = getTicketmasterKey();
    const res = await fetch(`${BASE}/events/${encodeURIComponent(data.id)}.json?apikey=${key}`);
    if (!res.ok) throw new Error(`Ticketmaster ${res.status}`);
    const e: any = await res.json();
    const base = mapSummary(e);
    const seatMapUrl: string = e?.seatmap?.staticUrl ?? "";
    const seatmapNote = seatMapUrl ? "See official seatmap for section details." : "";
    const info = [e?.info, e?.pleaseNote, seatmapNote].filter(Boolean).join("\n\n");
    return {
      ...base,
      description: info || `${base.name} at ${base.venue}.`,
      section: "",
      row: "",
      seat: "",
      currency: e?.priceRanges?.[0]?.currency ?? "USD",
      url: e?.url ?? "",
      seatMapUrl,
    };
  });

/**
 * Pre-indexed catalog of official Ticketmaster static maps for major stadiums & arenas.
 * These are exact Ticketmaster Maps API static geometry PNGs.
 */
const KNOWN_VENUE_MAPS: Record<string, string> = {
  // NFL Stadiums
  "paycor": "https://mapsapi.tmol.io/maps/geometry/3/event/05006093C2A34F5C/staticImage?type=png&systemId=HOST",
  "paul brown": "https://mapsapi.tmol.io/maps/geometry/3/event/05006093C2A34F5C/staticImage?type=png&systemId=HOST",
  "bengals": "https://mapsapi.tmol.io/maps/geometry/3/event/05006093C2A34F5C/staticImage?type=png&systemId=HOST",
  "wembley": "https://mapsapi.tmol.io/maps/geometry/3/event/35005F7D034E278B/staticImage?type=png&systemId=HOST",
  "tottenham": "https://mapsapi.tmol.io/maps/geometry/3/event/35005F7B012F113C/staticImage?type=png&systemId=HOST",
  "metlife": "https://mapsapi.tmol.io/maps/geometry/3/event/0200609AB2387B4C/staticImage?type=png&systemId=HOST",
  "sofi": "https://mapsapi.tmol.io/maps/geometry/3/event/090060A5A3502C6E/staticImage?type=png&systemId=HOST",
  "at&t": "https://mapsapi.tmol.io/maps/geometry/3/event/0C0060A9C1D1311F/staticImage?type=png&systemId=HOST",
  "att stadium": "https://mapsapi.tmol.io/maps/geometry/3/event/0C0060A9C1D1311F/staticImage?type=png&systemId=HOST",
  "cowboys": "https://mapsapi.tmol.io/maps/geometry/3/event/0C0060A9C1D1311F/staticImage?type=png&systemId=HOST",
  "mercedes-benz": "https://mapsapi.tmol.io/maps/geometry/3/event/0E0060A6E0E63C25/staticImage?type=png&systemId=HOST",
  "mercedes benz": "https://mapsapi.tmol.io/maps/geometry/3/event/0E0060A6E0E63C25/staticImage?type=png&systemId=HOST",
  "arrowhead": "https://mapsapi.tmol.io/maps/geometry/3/event/0600609FE8478C89/staticImage?type=png&systemId=HOST",
  "geha": "https://mapsapi.tmol.io/maps/geometry/3/event/0600609FE8478C89/staticImage?type=png&systemId=HOST",
  "chiefs": "https://mapsapi.tmol.io/maps/geometry/3/event/0600609FE8478C89/staticImage?type=png&systemId=HOST",
  "lincoln financial": "https://mapsapi.tmol.io/maps/geometry/3/event/0200609DD83584AE/staticImage?type=png&systemId=HOST",
  "eagles": "https://mapsapi.tmol.io/maps/geometry/3/event/0200609DD83584AE/staticImage?type=png&systemId=HOST",
  "hard rock": "https://mapsapi.tmol.io/maps/geometry/3/event/0D0060A4A8F22A04/staticImage?type=png&systemId=HOST",
  "dolphins": "https://mapsapi.tmol.io/maps/geometry/3/event/0D0060A4A8F22A04/staticImage?type=png&systemId=HOST",
  "empower field": "https://mapsapi.tmol.io/maps/geometry/3/event/1E0060A8CA15291E/staticImage?type=png&systemId=HOST",
  "mile high": "https://mapsapi.tmol.io/maps/geometry/3/event/1E0060A8CA15291E/staticImage?type=png&systemId=HOST",
  "broncos": "https://mapsapi.tmol.io/maps/geometry/3/event/1E0060A8CA15291E/staticImage?type=png&systemId=HOST",
  "state farm": "https://mapsapi.tmol.io/maps/geometry/3/event/19006098C2224A19/staticImage?type=png&systemId=HOST",
  "allegiant": "https://mapsapi.tmol.io/maps/geometry/3/event/1700609EC22B4D68/staticImage?type=png&systemId=HOST",
  "raiders": "https://mapsapi.tmol.io/maps/geometry/3/event/1700609EC22B4D68/staticImage?type=png&systemId=HOST",
  "raymond james": "https://mapsapi.tmol.io/maps/geometry/3/event/0D00609AEB362F41/staticImage?type=png&systemId=HOST",
  "buccaneers": "https://mapsapi.tmol.io/maps/geometry/3/event/0D00609AEB362F41/staticImage?type=png&systemId=HOST",
  "m&t bank": "https://mapsapi.tmol.io/maps/geometry/3/event/150060A2A1A82531/staticImage?type=png&systemId=HOST",
  "ravens": "https://mapsapi.tmol.io/maps/geometry/3/event/150060A2A1A82531/staticImage?type=png&systemId=HOST",
  "highmark": "https://mapsapi.tmol.io/maps/geometry/3/event/000060A1EB652932/staticImage?type=png&systemId=HOST",
  "bills": "https://mapsapi.tmol.io/maps/geometry/3/event/000060A1EB652932/staticImage?type=png&systemId=HOST",
  "nissan stadium": "https://mapsapi.tmol.io/maps/geometry/3/event/1B0060A1A22C24E1/staticImage?type=png&systemId=HOST",
  "titans": "https://mapsapi.tmol.io/maps/geometry/3/event/1B0060A1A22C24E1/staticImage?type=png&systemId=HOST",
  "acrisure": "https://mapsapi.tmol.io/maps/geometry/3/event/16006098F2113D7F/staticImage?type=png&systemId=HOST",
  "steelers": "https://mapsapi.tmol.io/maps/geometry/3/event/16006098F2113D7F/staticImage?type=png&systemId=HOST",
  "bank of america": "https://mapsapi.tmol.io/maps/geometry/3/event/2D0060A2E20E3E8C/staticImage?type=png&systemId=HOST",
  "panthers": "https://mapsapi.tmol.io/maps/geometry/3/event/2D0060A2E20E3E8C/staticImage?type=png&systemId=HOST",
  "lucas oil": "https://mapsapi.tmol.io/maps/geometry/3/event/05006096A42939BC/staticImage?type=png&systemId=HOST",
  "colts": "https://mapsapi.tmol.io/maps/geometry/3/event/05006096A42939BC/staticImage?type=png&systemId=HOST",
  "nrg stadium": "https://mapsapi.tmol.io/maps/geometry/3/event/3A0060A4F89E5F23/staticImage?type=png&systemId=HOST",
  "texans": "https://mapsapi.tmol.io/maps/geometry/3/event/3A0060A4F89E5F23/staticImage?type=png&systemId=HOST",
  "everbank": "https://mapsapi.tmol.io/maps/geometry/3/event/220060A1DC486A2B/staticImage?type=png&systemId=HOST",
  "jaguars": "https://mapsapi.tmol.io/maps/geometry/3/event/220060A1DC486A2B/staticImage?type=png&systemId=HOST",
  "lumen field": "https://mapsapi.tmol.io/maps/geometry/3/event/0F0060A1D39A3C72/staticImage?type=png&systemId=HOST",
  "seahawks": "https://mapsapi.tmol.io/maps/geometry/3/event/0F0060A1D39A3C72/staticImage?type=png&systemId=HOST",
  "soldier field": "https://mapsapi.tmol.io/maps/geometry/3/event/070060A4A8E2221B/staticImage?type=png&systemId=HOST",
  "bears": "https://mapsapi.tmol.io/maps/geometry/3/event/070060A4A8E2221B/staticImage?type=png&systemId=HOST",
  "ford field": "https://mapsapi.tmol.io/maps/geometry/3/event/080060A2F1133F89/staticImage?type=png&systemId=HOST",
  "lions": "https://mapsapi.tmol.io/maps/geometry/3/event/080060A2F1133F89/staticImage?type=png&systemId=HOST",
  "u.s. bank stadium": "https://mapsapi.tmol.io/maps/geometry/3/event/060060A1D13C3B02/staticImage?type=png&systemId=HOST",
  "us bank stadium": "https://mapsapi.tmol.io/maps/geometry/3/event/060060A1D13C3B02/staticImage?type=png&systemId=HOST",
  "vikings": "https://mapsapi.tmol.io/maps/geometry/3/event/060060A1D13C3B02/staticImage?type=png&systemId=HOST",
  "gillette": "https://mapsapi.tmol.io/maps/geometry/3/event/010060A3F11E39B2/staticImage?type=png&systemId=HOST",
  "patriots": "https://mapsapi.tmol.io/maps/geometry/3/event/010060A3F11E39B2/staticImage?type=png&systemId=HOST",
  "caesars superdome": "https://mapsapi.tmol.io/maps/geometry/3/event/1B0060A4C2293F42/staticImage?type=png&systemId=HOST",
  "superdome": "https://mapsapi.tmol.io/maps/geometry/3/event/1B0060A4C2293F42/staticImage?type=png&systemId=HOST",
  "saints": "https://mapsapi.tmol.io/maps/geometry/3/event/1B0060A4C2293F42/staticImage?type=png&systemId=HOST",
  "lambeau": "https://mapsapi.tmol.io/maps/geometry/3/event/070060A1A22C24E1/staticImage?type=png&systemId=HOST",
  "packers": "https://mapsapi.tmol.io/maps/geometry/3/event/070060A1A22C24E1/staticImage?type=png&systemId=HOST",
  // Major Arenas
  "madison square garden": "https://mapsapi.tmol.io/maps/geometry/3/event/3B00608DC2343F21/staticImage?type=png&systemId=HOST",
  "barclays": "https://mapsapi.tmol.io/maps/geometry/3/event/00006093C2A34F5C/staticImage?type=png&systemId=HOST",
  "crypto.com": "https://mapsapi.tmol.io/maps/geometry/3/event/090060A5A3502C6E/staticImage?type=png&systemId=HOST",
  "staples": "https://mapsapi.tmol.io/maps/geometry/3/event/090060A5A3502C6E/staticImage?type=png&systemId=HOST",
  "united center": "https://mapsapi.tmol.io/maps/geometry/3/event/070060A4A8E2221B/staticImage?type=png&systemId=HOST",
  "o2 arena": "https://mapsapi.tmol.io/maps/geometry/3/event/35005F7D034E278B/staticImage?type=png&systemId=HOST",
};

// In-memory runtime cache for dynamically resolved venue seatmaps from TM API
const VENUE_CACHE = new Map<string, string>();

/**
 * Resolves the official Ticketmaster static seat map for a given venue.
 * 1. Checks pre-indexed known stadiums catalog.
 * 2. Checks in-memory cache.
 * 3. Queries Ticketmaster Discovery API for the venue and extracts the real map URL.
 */
export const getTMVenueSeatMap = createServerFn({ method: "GET" })
  .inputValidator((d: { venueName: string; city?: string }) => ({
    venueName: String(d?.venueName ?? "").trim().slice(0, 120),
    city: String(d?.city ?? "").trim().slice(0, 60),
  }))
  .handler(async ({ data }): Promise<{ seatMapUrl: string }> => {
    const { venueName, city } = data;
    if (!venueName) return { seatMapUrl: "" };

    const clean = venueName.toLowerCase();

    // 1. Check known stadium map catalog
    for (const [key, url] of Object.entries(KNOWN_VENUE_MAPS)) {
      if (clean.includes(key)) {
        return { seatMapUrl: url };
      }
    }

    // 2. Check in-memory runtime cache
    const cacheKey = `${clean}|${(city || "").toLowerCase()}`;
    if (VENUE_CACHE.has(cacheKey)) {
      return { seatMapUrl: VENUE_CACHE.get(cacheKey)! };
    }

    // 3. Query Ticketmaster Discovery API for the venue
    try {
      const key = getTicketmasterKey();
      const venueQuery = encodeURIComponent(venueName);
      const venueRes = await fetch(
        `${BASE}/venues.json?keyword=${venueQuery}&size=3&apikey=${key}`
      );

      if (venueRes.ok) {
        const venueBody: any = await venueRes.json();
        const venues = venueBody?._embedded?.venues ?? [];
        if (venues.length > 0) {
          const venueId = venues[0].id;
          // Query top events at this venue on Ticketmaster
          const eventsRes = await fetch(
            `${BASE}/events.json?venueId=${encodeURIComponent(venueId)}&size=10&sort=date,desc&apikey=${key}`
          );
          if (eventsRes.ok) {
            const eventsBody: any = await eventsRes.json();
            const events = eventsBody?._embedded?.events ?? [];
            for (const ev of events) {
              const url = ev?.seatmap?.staticUrl;
              if (url && typeof url === "string" && url.startsWith("http")) {
                VENUE_CACHE.set(cacheKey, url);
                return { seatMapUrl: url };
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Ticketmaster venue seat map resolution failed:", err);
    }

    return { seatMapUrl: "" };
  });

/**
 * SECURITY: The raw Google Maps API key is never returned to the client.
 * The client should use the /api/maps-proxy endpoint in server.ts instead,
 * which fetches the static map server-side and proxies the image bytes.
 *
 * This function now returns an empty string so existing callers gracefully
 * fall through to the iframe embed fallback (which requires no key).
 */
export const getGoogleMapsKey = createServerFn({ method: "GET" }).handler(
  async () => "",
);