import { useState, useEffect } from "react";

interface CachedMapProps {
  venue: string;
  city: string;
}

export function CachedMap({ venue, city }: CachedMapProps) {
  const query = `${venue}, ${city}`;
  const cacheKey = `tm_map_cache_${venue}_${city}`.replace(/[^a-zA-Z0-9_]/g, "_");
  
  const [mapSrc, setMapSrc] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check local cache
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setMapSrc(cachedData);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Failed to read map from localStorage:", e);
    }

    // 2. Try fetching from the proxy
    const proxyUrl = `/api/maps-proxy?q=${encodeURIComponent(query)}&zoom=15&size=600x300`;
    
    fetch(proxyUrl)
      .then(async (res) => {
        if (res.status === 200) {
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            setMapSrc(base64data);
            setLoading(false);
            try {
              localStorage.setItem(cacheKey, base64data);
            } catch (e) {
              console.warn("Failed to save map to localStorage:", e);
            }
          };
          reader.readAsDataURL(blob);
        } else {
          // If status is 503 (key not configured) or anything else, fallback to iframe
          setUseIframeFallback(true);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch map from proxy, falling back to iframe:", err);
        setUseIframeFallback(true);
        setLoading(false);
      });
  }, [venue, city, cacheKey, query]);

  if (loading) {
    return (
      <div className="w-full h-[230px] bg-zinc-100 animate-pulse flex items-center justify-center text-zinc-400 text-xs font-semibold">
        Loading map...
      </div>
    );
  }

  if (useIframeFallback) {
    return (
      <iframe
        title="Venue Map (Live)"
        width="100%"
        height="230"
        style={{ border: 0 }}
        loading="lazy"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        className="w-full h-full bg-zinc-100 pointer-events-none select-none"
      />
    );
  }

  if (mapSrc) {
    return (
      <img
        src={mapSrc}
        alt={`Map of ${venue}`}
        className="w-full h-full object-cover pointer-events-none select-none"
      />
    );
  }

  return null;
}
