import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  MoreVertical,
  ScanBarcode,
  Send,
  RefreshCw,
  MapPin,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useUser } from "@/lib/auth";
import { useAllTickets } from "@/lib/ticket-store";
import { useSettings } from "@/lib/settings-store";
import type { Ticket } from "@/lib/tickets";
import { getGoogleMapsKey } from "@/lib/ticketmaster.functions";
import { sendTransferEmailFn } from "../admin/functions";

export const Route = createFileRoute("/my-ticket/$id")({
  head: () => ({ meta: [{ title: "Ticket — TicketHub" }] }),
  component: MyTicketDetail,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Link to="/my-tickets" className="text-primary underline">
        Back to My Tickets
      </Link>
    </div>
  ),
});

function parseSeats(t: Ticket): { section: string; row: string; seat: string }[] {
  // Description may start with "Sec X · Row Y · Seat Z"
  const m = t.description?.match(
    /Sec\s+([^\s·]+)(?:\s+·\s+Row\s+([^\s·]+))?(?:\s+·\s+Seat\s+([^\s·\n]+))?/i,
  );
  if (m) {
    return [{ section: m[1] ?? "", row: m[2] ?? "", seat: m[3] ?? "" }];
  }
  return [{ section: "GA", row: "", seat: "1" }];
}

function formatDateBar(t: Ticket): string {
  const ts = Date.parse(`${t.date} ${t.time}`);
  if (!Number.isFinite(ts) || !ts) {
    return `${t.date}${t.time ? ` · ${t.time}` : ""}`.toUpperCase();
  }
  const d = new Date(ts);
  const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${month} ${d.getDate()}, ${d.getFullYear()} · ${time}`;
}

function MyTicketDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  const { settings } = useSettings();
  const all = useAllTickets();
  const ticket = all.find((t) => t.id === id);
  const [tab, setTab] = useState<"tickets" | "extras">("tickets");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [transferStep, setTransferStep] = useState<"none" | "select" | "recipient_select" | "form">("none");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailPhone, setEmailPhone] = useState("");
  const [note, setNote] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [mapsKey, setMapsKey] = useState<string>("");
  const [mapLoadError, setMapLoadError] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [activeBarcodeIdx, setActiveBarcodeIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;
    const newIdx = Math.round(scrollLeft / clientWidth);
    if (newIdx !== activeBarcodeIdx && newIdx >= 0 && newIdx < seatRows.length) {
      setActiveBarcodeIdx(newIdx);
    }
  };

  const scrollToBarcodeSeat = (idx: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const card = container.children[idx] as HTMLElement;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    setActiveBarcodeIdx(idx);
  };

  useEffect(() => {
    getGoogleMapsKey().then((key) => {
      if (key) setMapsKey(key);
    });
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showBarcodeModal) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [showBarcodeModal]);

  const toggleSeatSelection = (seatNum: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seatNum)
        ? prev.filter((s) => s !== seatNum)
        : [...prev, seatNum]
    );
  };

  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);

  const seats = useMemo(() => (ticket ? parseSeats(ticket) : []), [ticket]);
  const seatRows = useMemo(() => {
    if (ticket && ticket.seats && ticket.seats.length > 0) {
      return ticket.seats.map((seatNum) => ({
        section: ticket.section || "GA",
        row: ticket.row || "",
        seat: seatNum,
      }));
    }
    const base = seats[0] ?? { section: "GA", row: "", seat: "1" };
    const baseSeat = Number(base.seat) || 1;
    const fallbackQty = 4;
    return Array.from({ length: fallbackQty }, (_, i) => ({
      section: base.section || "237",
      row: base.row || "10",
      seat: String(baseSeat + i),
    }));
  }, [seats, ticket]);

  const qty = seatRows.length;

  const orderId = useMemo(() => {
    if (!ticket) return "";
    const digits = ticket.id
      .split("")
      .map((c) => c.charCodeAt(0))
      .reduce((a, b) => a + b, 0);
    return `${(digits % 90) + 10}-${((digits * 7) % 90000) + 10000}/WDZ`;
  }, [ticket]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openIdx === null) return;
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpenIdx(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [openIdx]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  if (!ready || !user) return null;

  if (loading) {
    return (
      <main className="h-[100dvh] w-full overflow-hidden bg-zinc-950 relative">
        <div className="max-w-md mx-auto h-[100dvh] relative bg-[#F3F4F6] select-none overflow-hidden">
          {/* Header Placeholder */}
          <div className="absolute top-0 left-0 right-0 h-[calc(48px+env(safe-area-inset-top,48px))] z-30 flex items-end justify-between px-4 pb-3">
            <div className="h-8 w-8 bg-zinc-700/50 rounded-full animate-pulse" />
            <div className="h-8 w-16 bg-zinc-700/50 rounded-full animate-pulse" />
          </div>

          {/* Fixed Background Image and Title placeholder */}
          <div className="absolute top-0 left-0 w-full z-0 flex flex-col bg-[#F3F4F6]">
            <div className="w-full aspect-[16/10] bg-zinc-800 animate-pulse" />
            <div className="bg-[#111] p-4 pb-6 space-y-4">
              <div className="h-6 w-3/4 bg-zinc-700 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-zinc-700 rounded-md animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>

          {/* Overlay Scroll Container (Visual placeholder of the sheet) */}
          <div className="absolute top-[380px] left-0 right-0 bottom-0 bg-white rounded-t-[16px] shadow-2xl p-4 space-y-6 z-10">
            {/* Tabs placeholder */}
            <div className="grid grid-cols-2 border-b border-zinc-200 pb-3">
              <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse mx-auto" />
              <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse mx-auto" />
            </div>

            {/* Content card placeholder */}
            <div className="space-y-4">
              <div className="h-5 w-40 bg-zinc-200 rounded animate-pulse" />
              <div className="h-3 w-20 bg-zinc-200 rounded animate-pulse" />
              <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
                <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse" />
                <div className="h-8 w-full bg-zinc-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Link to="/my-tickets" className="text-primary underline">
          Back to My Tickets
        </Link>
      </main>
    );
  }

  const related = all.filter((t) => t.id !== ticket.id).slice(0, 1);

  // Hero is 16/10 aspect ratio. Total static height is aspect-[16/10] + 154px.
  // The scroll sheet slides up to 100px.
  const dimmerOpacity = Math.min(0.6, scrollOffset / 180);
  const headerTextOpacity = Math.min(1, Math.max(0, (scrollOffset - 80) / 100));

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-zinc-950 relative">
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="max-w-md mx-auto h-[100dvh] relative bg-[#F3F4F6] select-none overflow-hidden">
        {/* Sticky Top Header (Back/Help buttons & title) */}
        <div className="absolute top-0 left-0 right-0 h-[calc(48px+env(safe-area-inset-top,48px))] z-30 flex items-end justify-between px-4 pb-3 text-white overflow-hidden pointer-events-none">
          {/* Header background image slice that covers the scrolling text */}
          <div 
            className="absolute inset-0 z-0 transition-opacity duration-150 pointer-events-none"
            style={{ opacity: scrollOffset > 80 ? 1 : 0 }}
          >
            {ticket.image ? (
              <img
                src={ticket.image}
                alt=""
                className="w-full aspect-[4/3] object-cover absolute top-0 left-0"
              />
            ) : (
              <div className="w-full h-full bg-primary" />
            )}
            <div className="absolute inset-0 bg-black/10" />
            <div 
              className="absolute inset-0 bg-black/60 transition-opacity duration-150"
              style={{ opacity: dimmerOpacity }}
            />
          </div>

          <Link
            to="/my-tickets"
            className="h-[42px] w-[42px] rounded-full bg-black/60 text-white flex items-center justify-center pointer-events-auto z-10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>

          {/* Title and Venue info that fades in as the bottom sheet slides up */}
          <div 
            className="flex flex-col items-center justify-center text-center max-w-[200px] pointer-events-auto z-10 select-none transition-opacity duration-150"
            style={{ opacity: headerTextOpacity }}
          >
            <span className="font-bold text-sm text-white truncate w-full uppercase">
              {ticket.title}
            </span>
            <span className="text-[11px] text-zinc-300 truncate w-full mt-0.5">
              {ticket.venue}{ticket.city ? `, ${ticket.city}` : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto z-10">
            <button
              onClick={() => showToast("Support: support@tickethub.app")}
              className="h-[42px] px-5 rounded-full bg-black/60 text-white text-[14px] font-semibold"
            >
              Help
            </button>
          </div>
        </div>

        {/* Natural scrolling container wrapper */}
        <div 
          onScroll={(e) => setScrollOffset(e.currentTarget.scrollTop)}
          className="w-full h-full overflow-y-auto scrollbar-none"
        >
          {/* Hero image container */}
          <div className="w-full aspect-[4/3] overflow-hidden relative bg-primary pointer-events-none">
            {ticket.image ? (
              <img
                src={ticket.image}
                alt={ticket.title}
                className="h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-black/10" />
            <div 
              className="absolute inset-0 bg-black/60 transition-opacity duration-150"
              style={{ opacity: dimmerOpacity }}
            />
            {/* Date badge absolutely over the photo */}
            <div className="absolute bottom-0 left-0 bg-black text-white px-4 py-2 z-10">
              <p className="text-[11px] font-semibold tracking-wide">
                {formatDateBar(ticket)}
              </p>
            </div>
          </div>

          {/* Title and details block */}
          <div className="flex flex-col w-full bg-[#F3F4F6] shrink-0">
            {/* Title block */}
            <div className="bg-[#111] text-white px-4 pt-4 pb-5 flex items-start justify-between gap-3 z-10 relative h-[100px] box-border">
              <div className="flex-1 min-w-0">
                <h2 
                  className="text-base font-bold uppercase leading-tight line-clamp-2 h-[40px] overflow-hidden text-ellipsis"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                >
                  {ticket.title}
                </h2>
                <p className="mt-4 text-xs text-white/70 truncate h-[16px] overflow-hidden">
                  {ticket.venue}
                  {ticket.city ? `, ${ticket.city}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 text-white/80 shrink-0">
                <ScanBarcode className="h-4 w-4" />
                <span className="text-xs">x{qty}</span>
              </div>
            </div>

            {/* View Tickets CTA Button */}
            <button
              onClick={() => {
                setActiveBarcodeIdx(0);
                setShowBarcodeModal(true);
              }}
              className="w-full bg-primary text-primary-foreground h-[52px] flex items-center justify-center gap-2 text-sm font-semibold z-10 relative cursor-pointer"
            >
              <ScanBarcode className="h-4 w-4" />
              View Tickets
            </button>
          </div>

          {/* Solid White Sheet Container */}
          <div className="bg-white w-full rounded-t-[16px] shadow-2xl flex flex-col pb-40 relative z-10">
            {/* Sticky Tabs */}
            <div className="grid grid-cols-2 sticky top-[calc(48px+env(safe-area-inset-top,48px))] z-20 bg-white border-b border-zinc-200">
              <TabHeader
                label="Tickets"
                active={tab === "tickets"}
                onClick={() => setTab("tickets")}
              />
              <TabHeader
                label="Extras"
                active={tab === "extras"}
                onClick={() => setTab("extras")}
              />
            </div>

            {/* Tab content inside the sheet */}
            {tab === "tickets" ? (
              <div className="px-4 pt-5 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-bold">Order #{orderId}</p>
                    <p className="text-xs text-foreground/50 mt-0.5">
                      x{qty} Tickets
                    </p>
                  </div>
                  <button
                    aria-label="Order actions"
                    onClick={() => showToast("Order actions")}
                    className="p-1"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-4 relative">
                  {seatRows.map((s, i) => (
                    <SeatCard
                      key={i}
                      seat={s}
                      ticketType={ticket.ticketType}
                      entryInfo={ticket.entryInfo}
                    />
                  ))}
                </div>

                {/* More options */}
                <p className="mt-8 text-sm font-bold tracking-wide">MORE OPTIONS</p>
                <div className="mt-3 flex flex-col gap-[4px] w-full rounded-[4px] overflow-hidden border border-foreground/10 bg-white">
                  {settings.mapView !== "No" && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${ticket.venue} ${ticket.city}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block relative group"
                    >
                      {mapsKey && !mapLoadError ? (
                        <div className="relative w-full h-[230px] overflow-hidden">
                          <img
                            alt="Venue Map"
                            src={`https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
                              `${ticket.venue}, ${ticket.city}`,
                            )}&zoom=15&size=600x300&markers=size:mid%7Ccolor:0xff4444%7C${encodeURIComponent(
                              `${ticket.venue}, ${ticket.city}`,
                            )}&key=${mapsKey}`}
                            className="w-full h-full object-cover bg-zinc-100"
                            onError={() => {
                              setMapLoadError(true);
                            }}
                          />
                          <div className="absolute top-3 left-4 text-white text-[19px] font-extrabold tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] [text-shadow:0_2px_4px_rgba(0,0,0,0.85)]">
                            {ticket.venue}
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-[230px] overflow-hidden">
                          <iframe
                            title="Venue Map"
                            width="100%"
                            height="230"
                            style={{ border: 0 }}
                            loading="lazy"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(
                              `${ticket.venue}, ${ticket.city}`,
                            )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            className="w-full h-full bg-zinc-100 pointer-events-none select-none"
                          />
                        </div>
                      )}
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${ticket.venue} ${ticket.city}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <div className="flex items-center justify-center bg-[#F3F4F6] py-[14px] text-[14px] font-bold text-black">
                      Get Directions
                    </div>
                  </a>
                </div>

                {related[0] && (
                  <Link
                    to="/my-ticket/$id"
                    params={{ id: related[0].id }}
                    className="mt-5 block overflow-hidden rounded-[4px] border border-foreground/10 bg-white"
                  >
                    {related[0].image && (
                      <div className="w-full aspect-[16/10] overflow-hidden">
                        <img
                          src={related[0].image}
                          alt={related[0].title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="bg-[#111] text-white px-4 pt-4 pb-5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-white/70">
                          {formatDateBar(related[0])}
                        </p>
                        <p className="mt-1 text-sm font-bold uppercase leading-tight">
                          {related[0].title}
                        </p>
                        <p className="mt-2 text-[10px] text-white/50">
                          {related[0].venue}
                          {related[0].city ? `, ${related[0].city}` : ""}
                        </p>
                      </div>
                      <div className="bg-primary px-3 py-1.5 rounded text-[10px] font-bold uppercase shrink-0 text-center leading-tight">
                        You got<br />tickets
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground bg-white">
                No extras available.
              </div>
            )}
          </div>
        </div>
      </div>

      {transferStep === "none" && (
        <ActionPopover
          onTransfer={() => {
            setTransferStep("select");
            setSelectedSeats([]);
          }}
          onSell={() => showToast("Listed for sale")}
        />
      )}

      {/* Drawer Overlay for Transfer Flow */}
      {transferStep !== "none" && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setTransferStep("none")}
            className="fixed inset-0 bg-black/45 z-40 transition-opacity duration-300 animate-in fade-in"
          />

          {/* Drawer Sheet */}
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-[16px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] z-50 overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out">
            <div
              className="w-[300%] flex transition-transform duration-300 ease-in-out"
              style={{
                transform: transferStep === "form" 
                  ? "translateX(-66.66%)" 
                  : transferStep === "recipient_select" 
                    ? "translateX(-33.33%)" 
                    : "translateX(0%)",
              }}
            >
              {/* Step 1: Select tickets (width 33.33%) */}
              <div className="w-1/3 flex flex-col bg-white">
                {/* Header */}
                <div className="text-center py-4 border-b border-zinc-200">
                  <span className="text-[12px] font-extrabold tracking-wider text-black uppercase">
                    Select Tickets to Transfer
                  </span>
                </div>

                {/* Warning Message */}
                <div className="flex items-center gap-4 px-[20px] py-[16px] border-b border-zinc-200">
                  <div className="w-[32px] h-[32px] rounded-full bg-[#6B7280] text-white flex items-center justify-center text-sm font-black shrink-0">
                    i
                  </div>
                  <p className="text-[14px] font-normal leading-[1.3] text-black">
                    Only transfer tickets to people you know and trust to ensure everyone stays safe
                  </p>
                </div>

                {/* Seat heading */}
                <div className="px-[20px] py-[20px] flex items-center justify-between border-b border-zinc-100">
                  <span className="text-[18px] font-bold text-black">
                    Sec {seatRows[0]?.section || "237"}, Row {seatRows[0]?.row || "10"}
                  </span>
                  <div className="flex items-center gap-1.5 text-black">
                    <svg className="w-5 h-5 text-black fill-current" viewBox="0 0 24 24">
                      <path d="M4 18v-3.5c1 0 1.8-.8 1.8-1.8s-.8-1.8-1.8-1.8V7.5c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v3.5c-1 0-1.8.8-1.8 1.8s.8 1.8 1.8 1.8V18c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2z" />
                    </svg>
                    <span className="text-[14px] font-bold">{qty} tickets</span>
                  </div>
                </div>

                {/* Responsive wrapping Seat Grid */}
                <div className="grid grid-cols-4 gap-[8px] px-[20px] py-[16px]">
                  {seatRows.map((s) => {
                    const isSelected = selectedSeats.includes(s.seat);
                    return (
                      <button
                        key={s.seat}
                        onClick={() => toggleSeatSelection(s.seat)}
                        className="w-full border border-zinc-200 rounded-[8px] overflow-hidden flex flex-col bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
                      >
                        <div className="bg-[#1A56DB] text-white text-[10px] font-bold text-center py-1.5 uppercase tracking-wide w-full">
                          Seat {s.seat}
                        </div>
                        <div className="h-[46px] flex items-center justify-center w-full">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected ? "border-[#1A56DB] bg-[#1A56DB]" : "border-[1.5px] border-zinc-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-auto border-t border-zinc-200 px-[20px] pt-[16px] pb-[calc(16px+env(safe-area-inset-bottom))] flex items-center justify-between bg-white">
                  <span className="text-[15px] font-normal text-black">
                    {selectedSeats.length} Selected
                  </span>
                  <button
                    onClick={() => setTransferStep("recipient_select")}
                    disabled={selectedSeats.length === 0}
                    className="text-[15px] font-bold text-[#1A56DB] uppercase flex items-center gap-0.5 tracking-wider disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Transfer To &gt;
                  </button>
                </div>
              </div>

              {/* Step 2: Recipient Select (width 33.33%) */}
              <div className="w-1/3 flex flex-col bg-white">
                {/* Header */}
                <div className="relative py-4 border-b border-zinc-200 flex items-center justify-center">
                  <button 
                    onClick={() => setTransferStep("select")}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-[#1A56DB] uppercase flex items-center gap-0.5 tracking-wider"
                  >
                    &lt; Back
                  </button>
                  <span className="text-[12px] font-extrabold tracking-wider text-black uppercase">
                    Transfer To
                  </span>
                </div>

                {/* Body Content */}
                <div className="px-[20px] py-[24px] flex flex-col gap-4">
                  {/* Select From Contacts Button (Disabled) */}
                  <button
                    disabled
                    className="w-full h-[56px] border border-zinc-200 rounded-[8px] px-4 flex items-center justify-between bg-white opacity-50 cursor-not-allowed text-left"
                  >
                    <span className="text-[15px] font-bold text-black">Select From Contacts</span>
                    <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m14-10a4 4 0 11-8 0 4 4 0 018 0zm6-1h-2m2 4h-4" />
                    </svg>
                  </button>

                  {/* Manually Enter A Recipient Button (Active) */}
                  <button
                    onClick={() => setTransferStep("form")}
                    className="w-full h-[56px] border border-zinc-200 rounded-[8px] px-4 flex items-center justify-between bg-white text-left transition-colors hover:bg-zinc-50 active:scale-[0.99] cursor-pointer"
                  >
                    <span className="text-[15px] font-bold text-black">Manually Enter A Recipient</span>
                    <svg className="w-5 h-5 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>

                  {/* Icon and Text Blocks in the Center */}
                  <div className="flex flex-col items-center justify-center mt-8 pb-10">
                    <div className="w-16 h-16 bg-zinc-100/70 rounded-full flex items-center justify-center mb-6">
                      <Send className="h-6 w-6 text-zinc-500 -rotate-45 translate-x-0.5 -translate-y-0.5" />
                    </div>

                    <h4 className="text-[16px] font-bold text-black text-center px-4 leading-tight mb-2">
                      Transfer Tickets Via Email or Text Message
                    </h4>

                    <p className="text-[14px] text-zinc-500 text-center px-6 leading-[1.4]">
                      Select an Email or mobile number to transfer tickets to your recipient.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: Form (width 33.33%) */}
              <div className="w-1/3 flex flex-col bg-white">
                {/* Header */}
                <div className="text-center py-4 border-b border-zinc-200">
                  <span className="text-[12px] font-extrabold tracking-wider text-black uppercase">
                    Transfer Tickets
                  </span>
                </div>

                {/* Selection details */}
                <div className="px-[20px] py-[16px] bg-zinc-50/50 border-b border-zinc-200/60">
                  <p className="text-[15px] font-bold text-black">
                    {selectedSeats.length} Ticket{selectedSeats.length > 1 ? "s" : ""} Selected
                  </p>
                  <p className="text-[14px] font-semibold text-zinc-500 mt-1">
                    Sec {seatRows[0]?.section || "237"} Row {seatRows[0]?.row || "10"}{" "}
                    Seat{selectedSeats.length > 1 ? "s" : ""}{" "}
                    {selectedSeats.slice().sort((a,b)=>Number(a)-Number(b)).join(", ")}
                  </p>
                </div>

                {/* Form Fields - Darker borders, closer items, double-height textarea note */}
                <div className="p-[20px] space-y-[12px]">
                  <div>
                    <label className="text-[14px] font-bold text-[#374151]">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-[46px] border border-zinc-400 rounded-[4px] px-3.5 text-[16px] text-black mt-[4px] placeholder-zinc-400 bg-white focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[14px] font-bold text-[#374151]">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-[46px] border border-zinc-400 rounded-[4px] px-3.5 text-[16px] text-black mt-[4px] placeholder-zinc-400 bg-white focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[14px] font-bold text-[#374151]">
                      Email or Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="Email or Mobile Number"
                      value={emailPhone}
                      onChange={(e) => setEmailPhone(e.target.value)}
                      className="w-full h-[46px] border border-zinc-400 rounded-[4px] px-3.5 text-[16px] text-black mt-[4px] placeholder-zinc-400 bg-white focus:border-blue-600 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[14px] font-bold text-[#374151]">
                      Note
                    </label>
                    <textarea
                      placeholder="Note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full h-[92px] border border-zinc-400 rounded-[4px] px-3.5 py-2.5 text-[16px] text-black mt-[4px] placeholder-zinc-400 bg-white focus:border-blue-600 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-auto border-t border-zinc-200 px-[20px] pt-[16px] pb-[calc(16px+env(safe-area-inset-bottom))] flex items-center justify-between bg-white">
                  <button
                    onClick={() => setTransferStep("recipient_select")}
                    className="text-[15px] font-bold text-[#1A56DB] uppercase flex items-center gap-0.5 tracking-wider"
                  >
                    &lt; Back
                  </button>
                  <button
                    onClick={async () => {
                      if (!ticket) return;
                      setSendingEmail(true);
                      try {
                        const seatsText = selectedSeats.length > 1
                          ? `Seats: ${selectedSeats.slice(0, -1).sort((a,b)=>Number(a)-Number(b)).join(', ')} and ${selectedSeats[selectedSeats.length - 1]}`
                          : `Seat: ${selectedSeats[0]}`;
                        const seatDetails = `Section ${seatRows[0]?.section || "B23"}, Row ${seatRows[0]?.row || "14"}, ${seatsText}`;

                        let absoluteImage = ticket.image || "";
                        if (typeof window !== "undefined" && absoluteImage && !absoluteImage.startsWith("http")) {
                          absoluteImage = `${window.location.origin}${absoluteImage}`;
                        }

                        const buyerName = `${firstName.trim()} ${lastName.trim()}`.trim();
                        
                        const ticketData = {
                          title: ticket.title,
                          image: absoluteImage,
                          venue: ticket.venue,
                          city: ticket.city || "",
                          date: formatDateBar(ticket),
                          time: ticket.time || "",
                          quantity: selectedSeats.length,
                          seatDetails: seatDetails,
                          orderId: orderId,
                          buyerName: buyerName,
                          senderName: settings.name || user?.name || "JACQUELINE",
                          backendUrl: typeof window !== "undefined" ? window.location.origin : ""
                        };
                        const base64Token = btoa(unescape(encodeURIComponent(JSON.stringify(ticketData))));

                        await sendTransferEmailFn({
                          data: {
                            buyerName,
                            buyerEmail: emailPhone.trim(),
                            note: note.trim(),
                            ticketTitle: ticket.title,
                            ticketDate: formatDateBar(ticket),
                            ticketVenue: `${ticket.venue}, ${ticket.city || ""}`,
                            ticketImage: absoluteImage,
                            seatDetails,
                            quantity: selectedSeats.length,
                            eventDetailsUrl: `https://ticket-claim.vercel.app/?token=${base64Token}`,
                            senderName: settings.name || user?.name || "JACQUELINE",
                            senderEmail: user?.email,
                          }
                        });

                        showToast(`Transferred ${selectedSeats.length} ticket${selectedSeats.length > 1 ? "s" : ""} successfully!`);
                        setTransferStep("none");
                        setSelectedSeats([]);
                        setFirstName("");
                        setLastName("");
                        setEmailPhone("");
                        setNote("");
                      } catch (err: any) {
                        console.error("Transfer error:", err);
                        showToast(err.message || "Failed to transfer ticket.");
                      } finally {
                        setSendingEmail(false);
                      }
                    }}
                    disabled={!firstName.trim() || !emailPhone.trim() || sendingEmail}
                    className="bg-[#1A56DB] hover:bg-[#1e40af] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-[14px] tracking-wide px-[16px] py-[10px] rounded-[4px] uppercase transition-colors flex items-center justify-center min-w-[140px]"
                  >
                    {sendingEmail ? "Transferring..." : `Transfer ${selectedSeats.length} Ticket${selectedSeats.length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showBarcodeModal && mounted && typeof window !== "undefined" && createPortal(
        <>
          <style>{`
            @keyframes scan {
              0% { left: 0%; }
              50% { left: 100%; }
              100% { left: 0%; }
            }
            .laser-line-scan {
              position: absolute;
              top: 0;
              bottom: 0;
              width: 2.5px;
              background-color: #ff3b30;
              box-shadow: 0 0 8px 1.5px #ff3b30;
              animation: scan 3s infinite linear;
              z-index: 10;
            }
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          
          {/* Backdrop */}
          <div 
            onClick={() => setShowBarcodeModal(false)} 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity duration-300 animate-in fade-in"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center py-6 px-4 overflow-y-auto pointer-events-none animate-in slide-in-from-bottom duration-300">
            <div className="relative w-full max-w-[475px] flex flex-col pointer-events-auto shrink-0 my-auto pb-[env(safe-area-inset-bottom)]">
              
              {/* Close Button */}
              <button 
                onClick={() => setShowBarcodeModal(false)} 
                className="absolute -top-12 right-0 p-2.5 text-white hover:text-gray-300 focus:outline-none bg-black/40 rounded-full z-50 shrink-0"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Carousel Container */}
              <main className="w-full py-4 flex flex-col justify-center items-center overflow-hidden">
                <div 
                  ref={carouselRef}
                  onScroll={handleCarouselScroll}
                  className="w-full flex flex-row overflow-x-auto snap-x snap-mandatory scrollbar-hide" 
                  style={{ scrollBehavior: "smooth" }}
                >
                  {seatRows.map((s, idx) => (
                    <div key={idx} className="snap-center shrink-0 w-full flex justify-center items-center px-4">
                      <div 
                        style={{ 
                          backgroundColor: "#ffffff", 
                          borderRadius: "12px", 
                          overflow: "hidden", 
                          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", 
                          display: "flex", 
                          flexDirection: "column", 
                          position: "relative", 
                          userSelect: "none" 
                        }} 
                        className="w-full max-w-[425px]"
                      >
                        
                        {/* Cover Image Container */}
                        <div className="relative w-full h-[410px] bg-zinc-950 overflow-hidden shrink-0">
                          <img src={ticket?.image || ""} className="w-full h-full object-cover" alt={ticket?.title || ""} />
                          
                          {/* Floating Barcode Badge */}
                          <div 
                            style={{ 
                              backgroundColor: "#ffffff", 
                              color: "#000000", 
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", 
                              borderRadius: "8px" 
                            }} 
                            className="absolute top-4 left-4 right-4 p-3.5 flex flex-col items-center z-20"
                          >
                            <div style={{ color: "#27272a" }} className="text-[11px] font-bold flex items-center justify-center gap-1.5 mb-2.5">
                              Screenshots won't get you in
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const btn = e.currentTarget;
                                  const icon = btn.querySelector('svg');
                                  if (icon) {
                                    icon.classList.add('animate-spin');
                                    setTimeout(() => icon.classList.remove('animate-spin'), 1000);
                                  }
                                }} 
                                className="p-0.5 focus:outline-none text-zinc-500 hover:text-black shrink-0"
                              >
                                <RefreshCw className="h-3.5 w-3.5 text-zinc-800" />
                              </button>
                            </div>
                            
                            <div className="barcode-container relative w-full h-[58px] bg-white flex items-center justify-center overflow-hidden select-none">
                              <div className="laser-line-scan"></div>
                              <div className="flex h-full w-full items-center justify-between gap-[2px] px-2 select-none">
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#ffffff" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                
                                <div style={{ backgroundColor: "#000000" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[3px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[4px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[3px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                
                                <div style={{ backgroundColor: "#ffffff" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#ffffff" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#ffffff" }} className="w-[1px] h-full"></div>
                                
                                <div style={{ backgroundColor: "#000000" }} className="w-[3px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[4px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[3px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[1px] h-full"></div>
                                
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                                <div style={{ backgroundColor: "#ffffff" }} className="w-[1px] h-full"></div>
                                <div style={{ backgroundColor: "#000000" }} className="w-[2px] h-full"></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Event Title Locked Bottom Left */}
                          <div style={{ backgroundColor: "#ffffff", color: "#000000" }} className="absolute bottom-0 left-0 py-3.5 pl-4 pr-7 max-w-[75%] font-black uppercase text-[15px] leading-tight font-outfit select-none z-10">
                            {ticket?.title || ""}
                          </div>
                        </div>
                        
                        {/* 3-Column Seat Info Section */}
                        <div style={{ backgroundColor: "#ffffff" }} className="grid grid-cols-3 text-center py-6 px-4 select-none shrink-0">
                          <div className="flex flex-col items-center">
                            <span style={{ color: "#71717a" }} className="font-bold uppercase tracking-wider text-[11px]">SECTION</span>
                            <span style={{ color: "#000000" }} className="font-black text-[21px] leading-none mt-1.5 font-outfit">{s.section || "GA"}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span style={{ color: "#71717a" }} className="font-bold uppercase tracking-wider text-[11px]">ROW</span>
                            <span style={{ color: "#000000" }} className="font-black text-[21px] leading-none mt-1.5 font-outfit">{s.row || "—"}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span style={{ color: "#71717a" }} className="font-bold uppercase tracking-wider text-[11px]">SEAT</span>
                            <span style={{ color: "#000000" }} className="font-black text-[21px] leading-none mt-1.5 font-outfit">{s.seat}</span>
                          </div>
                        </div>
                        
                        {/* General Admission Bar */}
                        <div style={{ backgroundColor: "#ffffff" }} className="px-5 pb-6 select-none shrink-0">
                          <div style={{ backgroundColor: "#222222", color: "#ffffff" }} className="w-full py-4 text-center font-bold text-[14px] rounded-[4px] tracking-wide">
                            General Admission Ticket
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Dot Indicators */}
                <div className="flex justify-center items-center gap-2 mt-5 shrink-0">
                  {seatRows.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => scrollToBarcodeSeat(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === activeBarcodeIdx ? "w-5 bg-[#025df6]" : "w-1.5 bg-zinc-300"
                      }`}
                    />
                  ))}
                </div>
              </main>
            </div>
          </div>
        </>,
        document.body
      )}

      {toast && (
        <div className="fixed bottom-[165px] left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl z-50">
          {toast}
        </div>
      )}
    </main>
  );
}

function TabHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-[14.5px] text-[16px] text-center relative ${active ? "text-foreground font-bold" : "text-foreground/50"
        }`}
    >
      {label}
      <span
        className={`absolute left-4 right-4 -bottom-px h-0.5 ${active ? "bg-primary" : "bg-foreground/10"
          }`}
      />
    </button>
  );
}

function SeatCard({
  seat,
  ticketType,
  entryInfo,
}: {
  seat: { section: string; row: string; seat: string };
  ticketType?: string;
  entryInfo?: string;
}) {
  return (
    <div className="flex flex-col gap-[2px] w-full select-none">
      <div className="bg-[#eaeaea] px-5 py-[14.5px] rounded-none flex items-center justify-between">
        <span className="font-bold text-[14px] text-black">{ticketType || "Verified Fan Onsale"}</span>
        {entryInfo && (
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {entryInfo}
          </span>
        )}
      </div>
      <div className="bg-[#eaeaea] px-5 py-[14.5px] rounded-none grid grid-cols-3 gap-2">
        <SeatCell label="SECTION" value={seat.section} />
        <SeatCell label="ROW" value={seat.row || "—"} alignCenter />
        <SeatCell label="SEAT" value={seat.seat} alignRight />
      </div>
    </div>
  );
}

function SeatCell({
  label,
  value,
  alignRight,
  alignCenter,
}: {
  label: string;
  value: string;
  alignRight?: boolean;
  alignCenter?: boolean;
}) {
  const alignmentClass = alignRight
    ? "text-right"
    : alignCenter
    ? "text-center"
    : "text-left";
  return (
    <div className={alignmentClass}>
      <p className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="text-[20px] font-bold text-black mt-0.5 leading-none">{value}</p>
    </div>
  );
}

function ActionPopover({
  onTransfer,
  onSell,
}: {
  onTransfer: () => void;
  onSell: () => void;
  onClose?: () => void;
}) {
  const { settings } = useSettings();
  const { user } = useUser();
  
  // Normalize settings state to lowercase for checking
  const transferState = (settings.transferBtn || "Show").toLowerCase();
  const sellState = (settings.sellTab || settings.sellBtn || "Hide").toLowerCase();

  const userHasTransfers = typeof user?.transfersCount === 'number' ? user.transfersCount > 0 : false;
  const showTransfer = transferState !== "hide";
  const fadeTransfer = transferState === "fade" || !userHasTransfers;

  const showSell = sellState !== "hide";
  const fadeSell = sellState === "fade";

  // If both options are hidden, don't show popover bar at all
  if (!showTransfer && !showSell) return null;

  return (
    <div 
      className="fixed bottom-[75px] left-1/2 -translate-x-1/2 z-30 h-[76px] flex flex-row items-center justify-between px-[24px] py-[16px] bg-white rounded-[80px] shadow-[0px_2px_8px_rgba(0,0,0,0.05)] border border-[#E5E7EB]/40 box-border"
      style={{ width: (showTransfer && showSell) ? "214px" : "130px" }}
    >
      {showTransfer && (
        <button
          onClick={fadeTransfer ? undefined : onTransfer}
          disabled={fadeTransfer}
          className={`flex flex-col items-center justify-center flex-1 gap-[4px] transition-all ${
            fadeTransfer 
              ? "text-zinc-400 opacity-60 cursor-not-allowed" 
              : "text-[#1A56DB] hover:opacity-80 active:scale-95 cursor-pointer"
          }`}
        >
          <ArrowUpRight className="h-6 w-6" />
          <span className={`text-[14px] font-semibold leading-none ${fadeTransfer ? "text-zinc-400" : "text-black"}`}>
            Transfer
          </span>
        </button>
      )}

      {showTransfer && showSell && (
        <div className="w-px h-full bg-[#E5E7EB] mx-[12px]" />
      )}

      {showSell && (
        <button
          onClick={fadeSell ? undefined : onSell}
          disabled={fadeSell}
          className={`flex flex-col items-center justify-center flex-1 gap-[4px] transition-all ${
            fadeSell 
              ? "text-zinc-400 opacity-60 cursor-not-allowed" 
              : "text-black hover:opacity-80 active:scale-95 cursor-pointer"
          }`}
        >
          <RefreshCw className="h-6 w-6" />
          <span className={`text-[14px] font-semibold leading-none ${fadeSell ? "text-zinc-400" : "text-black"}`}>
            Sell
          </span>
        </button>
      )}
    </div>
  );
}