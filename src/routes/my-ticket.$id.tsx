import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import type { Ticket } from "@/lib/tickets";
import { getGoogleMapsKey } from "@/lib/ticketmaster.functions";

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
  const all = useAllTickets();
  const ticket = all.find((t) => t.id === id);
  const [tab, setTab] = useState<"tickets" | "extras">("tickets");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [transferStep, setTransferStep] = useState<"none" | "select" | "form">("none");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailPhone, setEmailPhone] = useState("");
  const [note, setNote] = useState("");
  const [mapsKey, setMapsKey] = useState<string>("");
  const [mapLoadError, setMapLoadError] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [detailsHeight, setDetailsHeight] = useState(156);
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!detailsRef.current) return;
    setDetailsHeight(detailsRef.current.offsetHeight);

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDetailsHeight(entry.target.clientHeight);
      }
    });
    observer.observe(detailsRef.current);
    return () => observer.disconnect();
  }, [ticket?.id]);

  useEffect(() => {
    getGoogleMapsKey().then((key) => {
      if (key) setMapsKey(key);
    });
  }, []);

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

      <div className="max-w-md mx-auto h-[100dvh] relative flex flex-col bg-[#F3F4F6] select-none overflow-hidden">
        {/* Sticky Top Header (Back/Help buttons & title) */}
        <div className="absolute top-0 left-0 right-0 h-[calc(48px+env(safe-area-inset-top,48px))] z-30 flex items-end justify-between px-4 pb-3 text-white overflow-hidden pointer-events-none">
          {/* Header background image slice that covers the scrolling text */}
          <div 
            className="absolute inset-0 z-0 transition-opacity duration-150 pointer-events-none"
            style={{ opacity: scrollOffset > 0 ? 1 : 0 }}
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

         {/* Static Event Background Card (Layer 1) - Everything in this is static */}
        <div className="absolute top-0 left-0 right-0 z-0 select-none flex flex-col bg-[#F3F4F6]">
          {/* Hero image wrapper - Taller (aspect-4/3) and responsive */}
          <div className="w-full aspect-[4/3] overflow-hidden relative bg-primary pointer-events-none">
            {ticket.image ? (
              <img
                src={ticket.image}
                alt={ticket.title}
                className="h-full w-full object-cover"
              />
            ) : null}
            {/* Static minimal black overlay */}
            <div className="absolute inset-0 bg-black/10" />
            {/* Dynamic dark tint dimmer overlay */}
            <div 
              className="absolute inset-0 bg-black/60 transition-opacity duration-150"
              style={{ opacity: dimmerOpacity }}
            />
            {/* Big title in center that fades out as we scroll */}
            <div 
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center px-6 transition-opacity duration-150"
              style={{ opacity: 1 - dimmerOpacity }}
            >
              <h1 className="text-white text-4xl sm:text-5xl font-black tracking-tight leading-none uppercase drop-shadow">
                {ticket.title}
              </h1>
            </div>
          </div>

          {/* Wrapper for dynamic measurement */}
          <div ref={detailsRef} className="flex flex-col w-full bg-[#F3F4F6]">
            {/* Date bar */}
            <div className="bg-black text-white px-4 py-2 -mt-8 relative w-fit z-10 self-start">
              <p className="text-[11px] font-semibold tracking-wide">
                {formatDateBar(ticket)}
              </p>
            </div>

            {/* Title block */}
            <div className="bg-[#111] text-white px-4 pt-4 pb-5 flex items-start justify-between gap-3 z-10 relative">
              <div>
                <h2 className="text-base font-bold uppercase leading-tight">
                  {ticket.title}
                </h2>
                <p className="mt-4 text-xs text-white/70">
                  {ticket.venue}
                  {ticket.city ? `, ${ticket.city}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 text-white/80 shrink-0">
                <ScanBarcode className="h-4 w-4" />
                <span className="text-xs">x{qty}</span>
              </div>
            </div>

            {/* View Tickets CTA */}
            <button
              onClick={() => showToast("Tickets ready to scan")}
              className="w-full bg-primary text-primary-foreground py-3.5 flex items-center justify-center gap-2 text-sm font-semibold z-10 relative pointer-events-auto"
            >
              <ScanBarcode className="h-4 w-4" />
              View Tickets
            </button>
          </div>
        </div>

        {/* Scrollable Container (Nested Scrolling Sheet) */}
        <div 
          onScroll={(e) => setScrollOffset(e.currentTarget.scrollTop)}
          className="h-full overflow-y-auto z-10 relative scrollbar-none"
        >
          {/* Top spacer matching background card height (aspect-[4/3] + detailsHeight of static content) */}
          <div className="w-full shrink-0 pointer-events-none flex flex-col">
            <div className="w-full aspect-[4/3]" />
            <div style={{ height: detailsHeight }} className="w-full" />
          </div>

          {/* Scroll Sheet Body */}
          <div className="bg-white min-h-[calc(100dvh-calc(48px+env(safe-area-inset-top,48px)))] relative z-10 flex flex-col pb-0 shadow-2xl rounded-t-[16px]">
            
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
              <div className="px-4 pt-5 bg-white pb-[calc(100px+env(safe-area-inset-bottom,32px))]">
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
                    className="mt-5 block relative overflow-hidden rounded-[4px]"
                  >
                    {related[0].image && (
                      <img
                        src={related[0].image}
                        alt={related[0].title}
                        className="w-full aspect-[16/10] object-cover"
                      />
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                      <div className="bg-black/80 text-white p-3 max-w-[75%]">
                        <p className="text-[10px] font-semibold">
                          {formatDateBar(related[0])}
                        </p>
                        <p className="mt-1 text-sm font-bold uppercase leading-tight">
                          {related[0].title}
                        </p>
                        <p className="mt-2 text-[10px] text-white/70">
                          {related[0].venue}
                          {related[0].city ? `, ${related[0].city}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="absolute inset-y-0 right-0 w-1/3 bg-primary/85 flex items-center justify-center">
                      <span className="text-white text-sm font-bold uppercase text-center leading-tight">
                        You got<br />tickets
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground bg-white pb-[calc(100px+env(safe-area-inset-bottom,32px))]">
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
              className="w-[200%] flex transition-transform duration-300 ease-in-out"
              style={{
                transform: transferStep === "form" ? "translateX(-50%)" : "translateX(0%)",
              }}
            >
              {/* Step 1: Select tickets (width 50%) */}
              <div className="w-1/2 flex flex-col bg-white">
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
                    onClick={() => setTransferStep("form")}
                    disabled={selectedSeats.length === 0}
                    className="text-[15px] font-bold text-[#1A56DB] uppercase flex items-center gap-0.5 tracking-wider disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Transfer To &gt;
                  </button>
                </div>
              </div>

              {/* Step 2: Form (width 50%) */}
              <div className="w-1/2 flex flex-col bg-white">
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
                    onClick={() => setTransferStep("select")}
                    className="text-[15px] font-bold text-[#1A56DB] uppercase flex items-center gap-0.5 tracking-wider"
                  >
                    &lt; Back
                  </button>
                  <button
                    onClick={() => {
                      showToast(`Transferred ${selectedSeats.length} ticket${selectedSeats.length > 1 ? "s" : ""} successfully!`);
                      setTransferStep("none");
                      setSelectedSeats([]);
                      setFirstName("");
                      setLastName("");
                      setEmailPhone("");
                      setNote("");
                    }}
                    disabled={!firstName.trim() || !emailPhone.trim()}
                    className="bg-[#1A56DB] hover:bg-[#1e40af] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-[14px] tracking-wide px-[16px] py-[10px] rounded-[4px] uppercase transition-colors"
                  >
                    Transfer {selectedSeats.length} Ticket{selectedSeats.length !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
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
  return (
    <div className="fixed bottom-[75px] left-1/2 -translate-x-1/2 z-30 w-[214px] h-[76px] flex flex-row items-center justify-between px-[24px] py-[16px] bg-white rounded-[80px] shadow-[0px_2px_8px_rgba(0,0,0,0.05)] border border-[#E5E7EB]/40 box-border">
      <button
        onClick={onTransfer}
        className="flex flex-col items-center justify-center flex-1 gap-[4px] text-[#1A56DB] hover:opacity-80 active:scale-95 transition-all"
      >
        <ArrowUpRight className="h-6 w-6" />
        <span className="text-[14px] font-semibold text-black leading-none">Transfer</span>
      </button>
      <div className="w-px h-full bg-[#E5E7EB]" />
      <button
        onClick={onSell}
        className="flex flex-col items-center justify-center flex-1 gap-[4px] text-black hover:opacity-80 active:scale-95 transition-all"
      >
        <RefreshCw className="h-6 w-6" />
        <span className="text-[14px] font-semibold text-black leading-none">Sell</span>
      </button>
    </div>
  );
}