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
  };
}

export const searchTMEvents = createServerFn({ method: "GET" })
  .inputValidator((d: { keyword: string }) => ({ keyword: String(d?.keyword ?? "").slice(0, 100) }))
  .handler(async ({ data }) => {
    const key = process.env.TICKETMASTER_API_KEY;
    if (!key) throw new Error("TICKETMASTER_API_KEY missing");
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
    const key = process.env.TICKETMASTER_API_KEY;
    if (!key) throw new Error("TICKETMASTER_API_KEY missing");
    const res = await fetch(`${BASE}/events/${encodeURIComponent(data.id)}.json?apikey=${key}`);
    if (!res.ok) throw new Error(`Ticketmaster ${res.status}`);
    const e: any = await res.json();
    const base = mapSummary(e);
    const seatmapNote = e?.seatmap?.staticUrl ? "See official seatmap for section details." : "";
    const info = [e?.info, e?.pleaseNote, seatmapNote].filter(Boolean).join("\n\n");
    return {
      ...base,
      description: info || `${base.name} at ${base.venue}.`,
      section: "",
      row: "",
      seat: "",
      currency: e?.priceRanges?.[0]?.currency ?? "USD",
      url: e?.url ?? "",
    };
  });

export const getGoogleMapsKey = createServerFn({ method: "GET" })
  .handler(async () => {
    return process.env.GOOGLE_MAPS_API_KEY || "";
  });