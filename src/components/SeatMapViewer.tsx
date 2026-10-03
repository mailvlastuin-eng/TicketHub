import { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Loader2 } from "lucide-react";

export type VenueType = "stadium" | "arena" | "theater" | "club" | "amphitheatre";

export function detectVenueType(venueName = "", category = ""): VenueType {
  const v = `${venueName} ${category}`.toLowerCase();

  if (/\b(stadium|field|park|speedway|raceway|dome|football|soccer|baseball|mls|nfl)\b/.test(v)) {
    return "stadium";
  }
  if (/\b(theater|theatre|hall|opera|broadway|auditorium|arts|symphony|philharmonic|playhouse)\b/.test(v)) {
    return "theater";
  }
  if (/\b(club|ballroom|lounge|bar|tavern|nightclub|room)\b/.test(v)) {
    return "club";
  }
  if (/\b(arena|center|centre|forum|coliseum|colosseum|hockey|basketball|nba|nhl)\b/.test(v)) {
    return "arena";
  }
  return "amphitheatre";
}

interface SeatMapViewerProps {
  /** Static image URL from Ticketmaster (passed to /api/seatmap-proxy) */
  seatMapUrl?: string;
  /** Venue name used to determine venue-specific diagram fallback */
  venueName?: string;
  /** Event category used to determine venue-specific diagram fallback */
  category?: string;
  /** Section labels that belong to this ticket – highlighted in the SVG fallback */
  sections?: string[];
  /** Called when the user taps a section in the SVG fallback */
  onSectionClick?: (section: string) => void;
  /** If true, renders in a compact height suitable for the create-ticket form */
  compact?: boolean;
}

// TM brand blue palette
const TM_BLUE = "#1565C0";
const TM_BLUE_LIGHT = "#1976D2";
const TM_BLUE_LIGHTER = "#1E88E5";
const TM_BLUE_DARK = "#0D47A1";
const HL_COLOR = "#0052CC";
const HL_BG = "#EBF3FF";

// ---------------------------------------------------------------------------
// 1. Stadium SVG (360° Oval Bowl + Pitch/Field)
// ---------------------------------------------------------------------------
function StadiumSvg({
  highlighted,
  onSectionClick,
}: {
  highlighted: Set<string>;
  onSectionClick?: (s: string) => void;
}) {
  const isHl = (s: string) => highlighted.has(s.toUpperCase());

  const secFill = (s: string, base: string) =>
    isHl(s) ? HL_COLOR : base;

  const sections = [
    // Lower bowl - East & West sidelines
    { id: "101", x: 130, y: 70, w: 120, h: 26, label: "SEC 101 - NORTH" },
    { id: "102", x: 60, y: 110, w: 55, h: 120, label: "SEC 102 - WEST" },
    { id: "103", x: 265, y: 110, w: 55, h: 120, label: "SEC 103 - EAST" },
    { id: "104", x: 130, y: 244, w: 120, h: 26, label: "SEC 104 - SOUTH" },

    // Corners Lower
    { id: "105", x: 68, y: 76, w: 48, h: 26, label: "105" },
    { id: "106", x: 264, y: 76, w: 48, h: 26, label: "106" },
    { id: "107", x: 68, y: 238, w: 48, h: 26, label: "107" },
    { id: "108", x: 264, y: 238, w: 48, h: 26, label: "108" },

    // Upper Tier - Outer Ring
    { id: "201", x: 100, y: 35, w: 180, h: 24, label: "UPPER 201-205" },
    { id: "202", x: 25, y: 90, w: 25, h: 160, label: "202" },
    { id: "203", x: 330, y: 90, w: 25, h: 160, label: "203" },
    { id: "204", x: 100, y: 280, w: 180, h: 24, label: "UPPER 206-210" },
  ];

  return (
    <svg viewBox="0 0 380 340" className="w-full h-full">
      <rect width="380" height="340" fill="#FFFFFF" />

      {/* Outer Stadium Hull */}
      <ellipse cx="190" cy="170" rx="175" ry="155" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
      <ellipse cx="190" cy="170" rx="145" ry="125" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />

      {/* Central Playing Field / Pitch */}
      <rect x="135" y="112" width="110" height="116" rx="4" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1" />
      <line x1="135" y1="170" x2="245" y2="170" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="190" cy="170" r="18" fill="none" stroke="#CBD5E1" strokeWidth="1" />
      <text x="190" y="174" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="700" letterSpacing="1">
        FIELD / STAGE
      </text>

      {/* Render Stadium Sections */}
      {sections.map((s) => (
        <g
          key={s.id}
          onClick={() => onSectionClick?.(s.id)}
          className="cursor-pointer transition-opacity hover:opacity-90"
        >
          <rect
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx="3"
            fill={secFill(s.id, isHl(s.id) ? HL_COLOR : s.id.startsWith("2") ? TM_BLUE_LIGHT : TM_BLUE)}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <text
            x={s.x + s.w / 2}
            y={s.y + s.h / 2 + 3.5}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={s.w < 35 ? "7.5" : "8.5"}
            fontWeight="700"
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. Arena SVG (Horseshoe Bowl + Floor Section)
// ---------------------------------------------------------------------------
function ArenaSvg({
  highlighted,
  onSectionClick,
}: {
  highlighted: Set<string>;
  onSectionClick?: (s: string) => void;
}) {
  const isHl = (s: string) => highlighted.has(s.toUpperCase());
  const secFill = (s: string, base: string) => (isHl(s) ? HL_COLOR : base);

  const sections = [
    // Floor
    { id: "FLR1", x: 125, y: 140, w: 60, h: 55, label: "FLR A" },
    { id: "FLR2", x: 195, y: 140, w: 60, h: 55, label: "FLR B" },

    // Lower Bowl 100s
    { id: "101", x: 60, y: 110, w: 45, h: 90, label: "101" },
    { id: "102", x: 60, y: 208, w: 45, h: 50, label: "102" },
    { id: "103", x: 115, y: 208, w: 70, h: 42, label: "SEC 103" },
    { id: "104", x: 195, y: 208, w: 70, h: 42, label: "SEC 104" },
    { id: "105", x: 275, y: 208, w: 45, h: 50, label: "105" },
    { id: "106", x: 275, y: 110, w: 45, h: 90, label: "106" },

    // Upper Bowl 200s
    { id: "201", x: 20, y: 80, w: 30, h: 140, label: "201" },
    { id: "202", x: 60, y: 268, w: 120, h: 36, label: "UPPER 202-204" },
    { id: "203", x: 200, y: 268, w: 120, h: 36, label: "UPPER 205-207" },
    { id: "204", x: 330, y: 80, w: 30, h: 140, label: "208" },
  ];

  return (
    <svg viewBox="0 0 380 340" className="w-full h-full">
      <rect width="380" height="340" fill="#FFFFFF" />

      {/* Stage at top */}
      <rect x="110" y="35" width="160" height="38" rx="3" fill="#111827" />
      <text x="190" y="58" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" letterSpacing="3">
        STAGE
      </text>

      {/* Floor background */}
      <rect x="115" y="85" width="150" height="115" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
      <text x="190" y="105" textAnchor="middle" fill="#64748B" fontSize="8" fontWeight="700">
        FLOOR
      </text>

      {/* Sections */}
      {sections.map((s) => (
        <g
          key={s.id}
          onClick={() => onSectionClick?.(s.id)}
          className="cursor-pointer transition-opacity hover:opacity-90"
        >
          <rect
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx="3"
            fill={secFill(s.id, s.id.startsWith("FLR") ? TM_BLUE_DARK : s.id.startsWith("2") ? TM_BLUE_LIGHTER : TM_BLUE)}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <text
            x={s.x + s.w / 2}
            y={s.y + s.h / 2 + 3.5}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8.5"
            fontWeight="700"
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. Theater / Concert Hall SVG (Proscenium Stage + Orchestra + Mezzanine + Balcony)
// ---------------------------------------------------------------------------
function TheaterSvg({
  highlighted,
  onSectionClick,
}: {
  highlighted: Set<string>;
  onSectionClick?: (s: string) => void;
}) {
  const isHl = (s: string) => highlighted.has(s.toUpperCase());
  const secFill = (s: string, base: string) => (isHl(s) ? HL_COLOR : base);

  const sections = [
    // Orchestra Pit
    { id: "PIT", x: 120, y: 70, w: 140, h: 22, label: "ORCHESTRA PIT" },

    // Orchestra Floor (Left, Center, Right)
    { id: "ORCH-L", x: 45, y: 102, w: 85, h: 58, label: "ORCH LEFT" },
    { id: "ORCH-C", x: 138, y: 102, w: 104, h: 58, label: "ORCH CENTER" },
    { id: "ORCH-R", x: 250, y: 102, w: 85, h: 58, label: "ORCH RIGHT" },

    // Boxes
    { id: "BOX-L", x: 12, y: 102, w: 25, h: 100, label: "BOX" },
    { id: "BOX-R", x: 343, y: 102, w: 25, h: 100, label: "BOX" },

    // Mezzanine (Tier 1)
    { id: "MEZZ-L", x: 45, y: 172, w: 85, h: 46, label: "MEZZ LEFT" },
    { id: "MEZZ-C", x: 138, y: 172, w: 104, h: 46, label: "MEZZ CENTER" },
    { id: "MEZZ-R", x: 250, y: 172, w: 85, h: 46, label: "MEZZ RIGHT" },

    // Balcony (Tier 2)
    { id: "BALC-L", x: 45, y: 230, w: 85, h: 44, label: "BALC LEFT" },
    { id: "BALC-C", x: 138, y: 230, w: 104, h: 44, label: "BALC CENTER" },
    { id: "BALC-R", x: 250, y: 230, w: 85, h: 44, label: "BALC RIGHT" },

    // Upper Balcony / Gallery
    { id: "GALLERY", x: 45, y: 284, w: 290, h: 28, label: "UPPER BALCONY / GALLERY" },
  ];

  return (
    <svg viewBox="0 0 380 340" className="w-full h-full">
      <rect width="380" height="340" fill="#FFFFFF" />

      {/* Proscenium Stage Frame */}
      <rect x="70" y="20" width="240" height="36" rx="3" fill="#0F172A" />
      <text x="190" y="43" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" letterSpacing="4">
        STAGE
      </text>

      {/* Sections */}
      {sections.map((s) => (
        <g
          key={s.id}
          onClick={() => onSectionClick?.(s.id)}
          className="cursor-pointer transition-opacity hover:opacity-90"
        >
          <rect
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx="3"
            fill={secFill(s.id, s.id.startsWith("ORCH") ? TM_BLUE : s.id.startsWith("MEZZ") ? TM_BLUE_LIGHT : s.id === "PIT" ? TM_BLUE_DARK : TM_BLUE_LIGHTER)}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <text
            x={s.x + s.w / 2}
            y={s.y + s.h / 2 + 3.5}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8"
            fontWeight="700"
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 4. Club / GA Hall SVG (Stage + GA Standing Floor + VIP Balcony)
// ---------------------------------------------------------------------------
function ClubSvg({
  highlighted,
  onSectionClick,
}: {
  highlighted: Set<string>;
  onSectionClick?: (s: string) => void;
}) {
  const isHl = (s: string) => highlighted.has(s.toUpperCase());
  const secFill = (s: string, base: string) => (isHl(s) ? HL_COLOR : base);

  const sections = [
    { id: "GA-FLR", x: 70, y: 75, w: 240, h: 140, label: "MAIN FLOOR (GENERAL ADMISSION)" },
    { id: "VIP-L", x: 25, y: 75, w: 38, h: 140, label: "VIP L" },
    { id: "VIP-R", x: 317, y: 75, w: 38, h: 140, label: "VIP R" },
    { id: "BALC-GA", x: 50, y: 230, w: 280, h: 48, label: "MEZZANINE / BALCONY OVERHANG" },
    { id: "BAR-REAR", x: 50, y: 288, w: 280, h: 30, label: "REAR LOUNGE & BAR AREA" },
  ];

  return (
    <svg viewBox="0 0 380 340" className="w-full h-full">
      <rect width="380" height="340" fill="#FFFFFF" />

      {/* Stage */}
      <rect x="80" y="20" width="220" height="42" rx="3" fill="#18181B" />
      <text x="190" y="46" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="800" letterSpacing="4">
        STAGE
      </text>

      {sections.map((s) => (
        <g
          key={s.id}
          onClick={() => onSectionClick?.(s.id)}
          className="cursor-pointer transition-opacity hover:opacity-90"
        >
          <rect
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx="4"
            fill={secFill(s.id, s.id.startsWith("VIP") ? TM_BLUE_DARK : s.id.startsWith("GA") ? TM_BLUE : TM_BLUE_LIGHT)}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <text
            x={s.x + s.w / 2}
            y={s.y + s.h / 2 + 3.5}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8.5"
            fontWeight="700"
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 5. Amphitheatre SVG (Fan-shaped outdoor pavilion)
// ---------------------------------------------------------------------------
const CX = 190;
const PIVOT_Y = 390;

function pt(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), PIVOT_Y + r * Math.sin(rad)];
}

function wedge(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = pt(a1, r1);
  const [x2, y2] = pt(a2, r1);
  const [x3, y3] = pt(a2, r2);
  const [x4, y4] = pt(a1, r2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r1} ${r1} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r2} ${r2} 0 ${large} 0 ${x4} ${y4} Z`;
}

function arcMid(r: number, a1: number, a2: number): [number, number] {
  return pt((a1 + a2) / 2, r);
}

function AmphitheatreSvg({
  highlighted,
  onSectionClick,
}: {
  highlighted: Set<string>;
  onSectionClick?: (s: string) => void;
}) {
  const isHl = (s: string) => highlighted.has(s.toUpperCase());
  const secFill = (s: string, base: string) => (isHl(s) ? HL_COLOR : base);

  const R1 = 70, R2 = 120, R3 = 180, R4 = 230, R5 = 280, R6 = 330;

  return (
    <svg viewBox="0 0 380 340" className="w-full h-full">
      <rect width="380" height="340" fill="#FFFFFF" />

      {/* Lawn (Top Arc) */}
      <path
        d={wedge(R6, R5, -162, -18)}
        fill={secFill("LAWN", "#2E7D32")}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        onClick={() => onSectionClick?.("LAWN")}
        className="cursor-pointer"
      />
      {(() => {
        const [mx, my] = arcMid((R5 + R6) / 2, -162, -18);
        return (
          <text x={mx} y={my + 4} textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="800">
            LAWN / GENERAL ADMISSION
          </text>
        );
      })()}

      {/* 200 Level */}
      <path
        d={wedge(R5, R4, -155, -95)}
        fill={secFill("201", TM_BLUE_LIGHT)}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        onClick={() => onSectionClick?.("201")}
        className="cursor-pointer"
      />
      <path
        d={wedge(R5, R4, -93, -25)}
        fill={secFill("202", TM_BLUE_LIGHT)}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        onClick={() => onSectionClick?.("202")}
        className="cursor-pointer"
      />

      {/* 100 Level */}
      <path
        d={wedge(R4, R3, -150, -100)}
        fill={secFill("101", TM_BLUE)}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        onClick={() => onSectionClick?.("101")}
        className="cursor-pointer"
      />
      <path
        d={wedge(R4, R3, -98, -82)}
        fill={secFill("102", TM_BLUE)}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        onClick={() => onSectionClick?.("102")}
        className="cursor-pointer"
      />
      <path
        d={wedge(R4, R3, -80, -30)}
        fill={secFill("103", TM_BLUE)}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        onClick={() => onSectionClick?.("103")}
        className="cursor-pointer"
      />

      {/* Pit / Orchestra */}
      <path
        d={wedge(R3, R2, -135, -45)}
        fill={secFill("PIT", TM_BLUE_DARK)}
        stroke="#FFFFFF"
        strokeWidth="1.5"
        onClick={() => onSectionClick?.("PIT")}
        className="cursor-pointer"
      />
      {(() => {
        const [px, py] = arcMid((R2 + R3) / 2, -135, -45);
        return (
          <text x={px} y={py + 3} textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800">
            PIT
          </text>
        );
      })()}

      {/* Stage */}
      <rect x="110" y="308" width="160" height="24" rx="3" fill="#111827" />
      <text x="190" y="324" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" letterSpacing="3">
        STAGE
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Public SeatMapViewer Component
// ---------------------------------------------------------------------------
export function SeatMapViewer({
  seatMapUrl,
  venueName = "",
  category = "",
  sections = [],
  onSectionClick,
  compact = false,
}: SeatMapViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const highlighted = new Set(sections.map((s) => s.toUpperCase()));
  const venueType = detectVenueType(venueName, category);

  const proxyUrl = seatMapUrl
    ? `/api/seatmap-proxy?url=${encodeURIComponent(seatMapUrl)}`
    : null;

  const showTmImage = proxyUrl && !imgError;
  const showSvg = !showTmImage;

  const height = compact ? "h-[220px]" : "h-[280px]";

  // User-facing badge label
  const venueTypeLabels: Record<VenueType, string> = {
    stadium: "Stadium Layout",
    arena: "Arena Bowl Layout",
    theater: "Theater Layout",
    club: "Club / Hall Layout",
    amphitheatre: "Amphitheatre Layout",
  };

  return (
    <div className="w-full">
      <div
        className={`relative ${height} w-full overflow-hidden rounded-lg bg-white border border-zinc-200 select-none`}
      >
        {/* Zoom controls */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
            className="w-7 h-7 rounded bg-white/95 border border-zinc-200 text-zinc-700 flex items-center justify-center hover:bg-zinc-50 shadow-sm transition-colors cursor-pointer"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.6))}
            className="w-7 h-7 rounded bg-white/95 border border-zinc-200 text-zinc-700 flex items-center justify-center hover:bg-zinc-50 shadow-sm transition-colors cursor-pointer"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoom !== 1 && (
            <button
              onClick={() => setZoom(1)}
              className="w-7 h-7 rounded bg-white/95 border border-zinc-200 text-zinc-700 flex items-center justify-center hover:bg-zinc-50 shadow-sm transition-colors cursor-pointer"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Venue Type & Source Badge */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded bg-white/90 backdrop-blur-sm border border-zinc-200/80 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" />
          <span className="text-[10px] font-semibold text-zinc-700">
            {showTmImage ? "Official Ticketmaster Map" : venueTypeLabels[venueType]}
          </span>
        </div>

        {/* Viewport Canvas */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {showTmImage ? (
            <div className="relative w-full h-full flex items-center justify-center p-3">
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-[#1565C0]" />
                    <span>Loading venue layout…</span>
                  </div>
                </div>
              )}
              <img
                src={proxyUrl}
                alt={venueName ? `${venueName} seating chart` : "Seating chart"}
                className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImgLoaded(true)}
                onError={() => {
                  console.warn("Failed to load official TM seat map, falling back to venue diagram");
                  setImgError(true);
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full p-2">
              {venueType === "stadium" && (
                <StadiumSvg highlighted={highlighted} onSectionClick={onSectionClick} />
              )}
              {venueType === "arena" && (
                <ArenaSvg highlighted={highlighted} onSectionClick={onSectionClick} />
              )}
              {venueType === "theater" && (
                <TheaterSvg highlighted={highlighted} onSectionClick={onSectionClick} />
              )}
              {venueType === "club" && (
                <ClubSvg highlighted={highlighted} onSectionClick={onSectionClick} />
              )}
              {venueType === "amphitheatre" && (
                <AmphitheatreSvg highlighted={highlighted} onSectionClick={onSectionClick} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
