import { useState } from "react";
import { X, MapPin } from "lucide-react";
import { SeatMapViewer } from "./SeatMapViewer";
import type { SeatedTicketEntry } from "@/lib/tickets";

interface SeatPickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** All seated ticket entries available on this ticket */
  seatedTickets: SeatedTicketEntry[];
  /** Static seat map image URL (from Ticketmaster, optional) */
  seatMapUrl?: string;
  /** Currently selected seat identifiers (e.g. ["7", "8"]) */
  selectedSeats: string[];
  /** Callback fired when selection changes */
  onSelectionChange: (seats: string[]) => void;
  /** Called when user confirms selection */
  onConfirm: (seats: string[]) => void;
}

export function SeatPickerDrawer({
  isOpen,
  onClose,
  seatedTickets,
  seatMapUrl,
  selectedSeats,
  onSelectionChange,
  onConfirm,
}: SeatPickerDrawerProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!isOpen) return null;

  // Flatten all seats, grouped by entry for display
  const allSections = [...new Set(seatedTickets.map((e) => e.section))];

  const filteredEntries = activeSection
    ? seatedTickets.filter((e) => e.section === activeSection)
    : seatedTickets;

  const totalAvailable = seatedTickets.reduce((n, e) => n + e.seats.length, 0);

  const toggleSeat = (seatNum: string) => {
    onSelectionChange(
      selectedSeats.includes(seatNum)
        ? selectedSeats.filter((s) => s !== seatNum)
        : [...selectedSeats, seatNum]
    );
  };

  const selectAll = () => {
    const all = filteredEntries.flatMap((e) => e.seats);
    const newSelected = [...new Set([...selectedSeats, ...all])];
    onSelectionChange(newSelected);
  };

  const clearAll = () => {
    const inView = new Set(filteredEntries.flatMap((e) => e.seats));
    onSelectionChange(selectedSeats.filter((s) => !inView.has(s)));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-[20px] shadow-[0_-8px_40px_rgba(0,0,0,0.3)] z-50 overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out flex flex-col max-h-[92dvh]">
        {/* Handle */}
        <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 mb-0 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 shrink-0">
          <div>
            <p className="text-[15px] font-bold text-zinc-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Seat Map
            </p>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              {totalAvailable} seat{totalAvailable !== 1 ? "s" : ""} available · {selectedSeats.length} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-600" />
          </button>
        </div>

        {/* Seat map image */}
        <div className="px-4 pt-3 pb-2 shrink-0 bg-white">
          <SeatMapViewer
            seatMapUrl={seatMapUrl}
            sections={seatedTickets.map((e) => e.section)}
            onSectionClick={(sec) =>
              setActiveSection((prev) => (prev === sec ? null : sec))
            }
            compact
          />
        </div>

        {/* Section filter tabs */}
        {allSections.length > 1 && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto shrink-0 scrollbar-none">
            <button
              onClick={() => setActiveSection(null)}
              className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                activeSection === null
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              All
            </button>
            {allSections.map((sec) => (
              <button
                key={sec}
                onClick={() =>
                  setActiveSection((prev) => (prev === sec ? null : sec))
                }
                className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                  activeSection === sec
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Sec {sec}
              </button>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center justify-between px-5 pb-2 shrink-0">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            {activeSection ? `Section ${activeSection}` : "All Sections"}
          </span>
          <div className="flex gap-3">
            <button
              onClick={selectAll}
              className="text-[12px] font-bold text-blue-600 hover:opacity-75"
            >
              Select all
            </button>
            {selectedSeats.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[12px] font-bold text-zinc-400 hover:opacity-75"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Seat grid – scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 min-h-0">
          {filteredEntries.map((entry) => (
            <div key={entry.id}>
              {/* Entry header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-800">
                  Sec {entry.section}
                  {entry.row ? ` · Row ${entry.row}` : ""}
                </span>
                {entry.ticketType && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {entry.ticketType}
                  </span>
                )}
              </div>

              {/* Seat cards grid */}
              <div className="grid grid-cols-4 gap-2">
                {entry.seats.map((seatNum) => {
                  const isSelected = selectedSeats.includes(seatNum);
                  return (
                    <button
                      key={`${entry.id}-${seatNum}`}
                      onClick={() => toggleSeat(seatNum)}
                      className={`flex flex-col overflow-hidden rounded-lg border shadow-sm transition-all active:scale-95 ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 shadow-blue-200"
                          : "border-zinc-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      {/* Top strip */}
                      <div
                        className={`w-full py-1 text-center text-[9px] font-bold uppercase tracking-wide ${
                          isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        Seat {seatNum}
                      </div>
                      {/* Circle indicator */}
                      <div className="h-11 flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-white bg-white"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {entry.entryInfo && (
                <p className="mt-1.5 text-[10px] text-zinc-400 font-medium">
                  Entry: {entry.entryInfo}
                </p>
              )}
            </div>
          ))}

          {filteredEntries.length === 0 && (
            <div className="py-8 text-center text-sm text-zinc-400">
              No seats in this section.
            </div>
          )}
        </div>

        {/* Confirm CTA */}
        <div className="border-t border-zinc-100 px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))] shrink-0 bg-white">
          <button
            onClick={() => onConfirm(selectedSeats)}
            disabled={selectedSeats.length === 0}
            className="w-full h-12 rounded-xl bg-blue-600 text-white font-bold text-[15px] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] hover:bg-blue-700 shadow-sm"
          >
            {selectedSeats.length === 0
              ? "Select a seat to continue"
              : `Confirm ${selectedSeats.length} Seat${selectedSeats.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}
