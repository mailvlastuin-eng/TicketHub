import { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface SeatMapViewerProps {
  /** Static image URL from Ticketmaster (passed to /api/seatmap-proxy) */
  seatMapUrl?: string;
  /** Section labels that belong to this ticket – highlighted in the SVG fallback */
  sections?: string[];
  /** Called when the user taps a section in the SVG fallback */
  onSectionClick?: (section: string) => void;
  /** If true, renders in a compact height suitable for the create-ticket form */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Ticketmaster-style fan-shaped arena SVG
// White background · TM blue sections · white text labels
// Matches the Riverbend Music Center layout from the screenshot:
//   STAGE (bottom center) → PIT → 100-200 → 300-500 → 600-700 → 800-900 → LAWN
// ---------------------------------------------------------------------------

// All geometry is relative to a pivot point at the bottom-center (cx, pivotY)
// so that every arc radiates outward from behind the stage.
const SVG_W = 380;
const SVG_H = 340;
const CX = 190;          // horizontal center
const PIVOT_Y = 390;     // arc pivot — sits below the SVG viewport
const STAGE_Y = 318;     // top of the STAGE bar

// TM brand blue (exact match to their UI)
const TM_BLUE = "#1565C0";
const TM_BLUE_LIGHT = "#1976D2"; // outer bands slightly lighter like TM does
const TM_BLUE_LIGHTER = "#1E88E5";

// Highlighted section color (brighter accent when user's section)
const HL_COLOR = "#0D47A1"; // deeper blue for highlighted

/** Convert polar (angle from pivot, radius) → SVG absolute x,y */
function pt(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [
    CX + r * Math.cos(rad),
    PIVOT_Y + r * Math.sin(rad),
  ];
}

/** Build a donut-arc wedge path between two radii and two angles */
function wedge(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = pt(a1, r1);
  const [x2, y2] = pt(a2, r1);
  const [x3, y3] = pt(a2, r2);
  const [x4, y4] = pt(a1, r2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${r1} ${r1} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${r2} ${r2} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

/** Mid-point of an arc (used for label placement) */
function arcMid(r: number, a1: number, a2: number): [number, number] {
  const mid = (a1 + a2) / 2;
  return pt(mid, r);
}

// ─── Arena ring definitions ─────────────────────────────────────────────────
// Angles: -180° = left, -90° = top, 0° = right
// Fan spans from about -155° (left wing) to -25° (right wing)
const L_WING = -155;   // left edge of fan
const R_WING = -25;    // right edge of fan
const L_WING_W = -162; // wider outer rings
const R_WING_W = -18;

// Radial band boundaries (inner → outer)
const R = {
  stageInner: 0,
  stageOuter: 28,
  pit:        46,
  r100:       80,
  r200:       118,
  r300:       158,
  r400:       198,
  r500:       238,
  r600:       274,  // LAWN starts here
  lawn:       316,
};

// Aisle divider angles — these split sections within each band
// Center vertical + two symmetric diagonals
const AISLES_INNER = [-90, -126, -54];      // PIT/100/200 bands
const AISLES_MID   = [-90, -130, -110, -70, -50]; // 300/400/500 bands
const AISLES_OUTER = [-90, -135, -115, -65, -45]; // 600-900/LAWN bands

type SectionDef = {
  id: string;
  label: string;
  r1: number;
  r2: number;
  a1: number;
  a2: number;
  color: string;
  fontSize?: number;
};

const SECTIONS: SectionDef[] = [
  // PIT – innermost, narrow band
  { id: "PIT",  label: "PIT",  r1: R.stageOuter, r2: R.pit,  a1: L_WING, a2: R_WING, color: TM_BLUE, fontSize: 9 },

  // 100 / 200 – second ring, split left-center-right
  { id: "100", label: "100", r1: R.pit,  r2: R.r100, a1: -126, a2: -54,  color: TM_BLUE, fontSize: 10 },
  { id: "300", label: "300", r1: R.pit,  r2: R.r100, a1: L_WING, a2: -126, color: TM_BLUE, fontSize: 10 },
  { id: "200", label: "200", r1: R.pit,  r2: R.r100, a1: -54,  a2: R_WING, color: TM_BLUE, fontSize: 10 },

  // 200 / 400 / 500 band — three sections: left 400, center 200, right 400
  { id: "500", label: "500", r1: R.r100, r2: R.r200, a1: -110, a2: -70,   color: TM_BLUE, fontSize: 10 },
  { id: "400", label: "400", r1: R.r100, r2: R.r200, a1: L_WING, a2: -130, color: TM_BLUE, fontSize: 10 },
  { id: "600", label: "600", r1: R.r100, r2: R.r200, a1: -50,  a2: R_WING, color: TM_BLUE, fontSize: 10 },
  { id: "BOXES_L", label: "BOXES", r1: R.r100, r2: R.r200, a1: -130, a2: -110, color: TM_BLUE, fontSize: 7 },
  { id: "BOXES_R", label: "BOXES", r1: R.r100, r2: R.r200, a1: -70,  a2: -50,  color: TM_BLUE, fontSize: 7 },
  { id: "MIX",     label: "MIX",   r1: R.r100, r2: R.r200, a1: -70,  a2: -50,  color: TM_BLUE, fontSize: 7 },

  // 300 / 600 / 700 band
  { id: "300b", label: "300", r1: R.r200, r2: R.r300, a1: L_WING,  a2: -115,  color: TM_BLUE_LIGHT, fontSize: 10 },
  { id: "200b", label: "200", r1: R.r200, r2: R.r300, a1: -115,    a2: -90,   color: TM_BLUE_LIGHT, fontSize: 10 },
  { id: "200c", label: "200", r1: R.r200, r2: R.r300, a1: -90,     a2: -65,   color: TM_BLUE_LIGHT, fontSize: 10 },
  { id: "700",  label: "700", r1: R.r200, r2: R.r300, a1: -65,     a2: R_WING, color: TM_BLUE_LIGHT, fontSize: 10 },

  // 800 / 900 band
  { id: "600b", label: "600",  r1: R.r300, r2: R.r400, a1: L_WING_W, a2: -135, color: TM_BLUE_LIGHT, fontSize: 10 },
  { id: "800L", label: "800",  r1: R.r300, r2: R.r400, a1: -135,     a2: -90,  color: TM_BLUE_LIGHT, fontSize: 10 },
  { id: "800R", label: "800",  r1: R.r300, r2: R.r400, a1: -90,      a2: -45,  color: TM_BLUE_LIGHT, fontSize: 10 },
  { id: "700b", label: "700",  r1: R.r300, r2: R.r400, a1: -45,      a2: R_WING_W, color: TM_BLUE_LIGHT, fontSize: 10 },

  // 900 band
  { id: "900L", label: "900", r1: R.r400, r2: R.r500, a1: L_WING_W, a2: -90, color: TM_BLUE_LIGHTER, fontSize: 10 },
  { id: "900R", label: "900", r1: R.r400, r2: R.r500, a1: -90,      a2: R_WING_W, color: TM_BLUE_LIGHTER, fontSize: 10 },

  // LAWN – outermost, full span + ADA nub on right
  { id: "LAWN", label: "LAWN",     r1: R.r500, r2: R.r600, a1: L_WING_W, a2: -40,      color: TM_BLUE_LIGHTER, fontSize: 11 },
  { id: "ADA",  label: "ADA\nLAWN", r1: R.r500, r2: R.lawn, a1: -40,     a2: R_WING_W, color: TM_BLUE_LIGHTER, fontSize: 7  },
];

function FanSVG({
  highlighted,
  onSectionClick,
}: {
  highlighted: Set<string>;
  onSectionClick?: (id: string) => void;
}) {
  // Sections to actually render (de-dup display; BOXES_R/MIX overlap — skip MIX)
  const renderSections = SECTIONS.filter((s) => s.id !== "MIX" && s.id !== "BOXES_R");

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-full"
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* White background — exact TM style */}
      <rect width={SVG_W} height={SVG_H} fill="#ffffff" />

      {/* ── Section wedges ── */}
      {renderSections.map((sec) => {
        // Match highlighted if the ticket's section matches any prefix of id
        const isHl = highlighted.has(sec.id.replace(/[LRbc]$/, "").toUpperCase()) ||
                     highlighted.has(sec.id.toUpperCase()) ||
                     highlighted.has(sec.label.toUpperCase());
        const fill = isHl ? HL_COLOR : sec.color;

        return (
          <path
            key={sec.id}
            d={wedge(sec.r1, sec.r2, sec.a1, sec.a2)}
            fill={fill}
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinejoin="round"
            style={{
              cursor: onSectionClick ? "pointer" : "default",
              transition: "fill 0.15s ease",
              filter: isHl ? "brightness(0.85)" : undefined,
            }}
            onClick={() => onSectionClick?.(sec.label)}
          />
        );
      })}

      {/* ── Section labels (white text, bold, centered in each wedge) ── */}
      {renderSections.map((sec) => {
        if (sec.id === "BOXES_L") return null; // skip — too narrow
        const midR = (sec.r1 + sec.r2) / 2;
        const [lx, ly] = arcMid(midR, sec.a1, sec.a2);
        const lines = sec.label.split("\n");
        const fs = sec.fontSize ?? 10;
        const lineH = fs + 2;

        return (
          <text
            key={`lbl-${sec.id}`}
            x={lx}
            y={ly - ((lines.length - 1) * lineH) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fs}
            fontWeight="700"
            fill="#ffffff"
            letterSpacing="0.3"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {lines.map((line, i) => (
              <tspan key={i} x={lx} dy={i === 0 ? 0 : lineH}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}

      {/* ── STAGE bar ── */}
      <rect
        x={CX - 56} y={STAGE_Y}
        width={112} height={22}
        rx={2}
        fill="#1a1a1a"
      />
      <text
        x={CX} y={STAGE_Y + 11}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fontWeight="800"
        fill="#ffffff"
        letterSpacing="2"
        style={{ userSelect: "none" }}
      >
        STAGE
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Public SeatMapViewer component
// ---------------------------------------------------------------------------
export function SeatMapViewer({
  seatMapUrl,
  sections = [],
  onSectionClick,
  compact = false,
}: SeatMapViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const highlighted = new Set(sections.map((s) => s.toUpperCase()));

  const proxyUrl = seatMapUrl
    ? `/api/seatmap-proxy?url=${encodeURIComponent(seatMapUrl)}`
    : null;

  const showTmImage = proxyUrl && !imgError;
  const showSvg = !showTmImage;

  const height = compact ? "h-[220px]" : "h-[280px]";

  return (
    <div className="w-full">
      <div
        className={`relative ${height} w-full overflow-hidden rounded-lg bg-white border border-zinc-200 select-none`}
      >
        {/* Zoom controls */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
            className="w-7 h-7 rounded bg-white/90 border border-zinc-200 text-zinc-700 flex items-center justify-center hover:bg-zinc-50 shadow-sm transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.6))}
            className="w-7 h-7 rounded bg-white/90 border border-zinc-200 text-zinc-700 flex items-center justify-center hover:bg-zinc-50 shadow-sm transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoom !== 1 && (
            <button
              onClick={() => setZoom(1)}
              className="w-7 h-7 rounded bg-white/90 border border-zinc-200 text-zinc-700 flex items-center justify-center hover:bg-zinc-50 shadow-sm transition-colors"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.2s ease",
          }}
        >
          {showTmImage && (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="w-6 h-6 border-2 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )}
              <img
                src={proxyUrl!}
                alt="Venue seat map"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={`w-full h-full object-contain transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              />
            </>
          )}

          {showSvg && (
            <div className="w-full h-full p-1">
              <FanSVG highlighted={highlighted} onSectionClick={onSectionClick} />
            </div>
          )}
        </div>

        {/* Highlighted section badges */}
        {sections.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[75%]">
            {[...new Set(sections)].map((sec) => (
              <span
                key={sec}
                className="text-[9px] font-bold bg-[#1565C0] text-white px-1.5 py-0.5 rounded"
              >
                Sec {sec}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
