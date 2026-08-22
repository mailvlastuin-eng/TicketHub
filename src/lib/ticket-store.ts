import { useEffect, useState } from "react";
import { tickets as seedTickets, type Ticket } from "@/lib/tickets";

const KEY = "tm_custom_tickets";
const EVT = "tm-tickets";

export function getCustomTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Ticket[]) : [];
  } catch {
    return [];
  }
}

function save(list: Ticket[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

export function addCustomTicket(t: Ticket) {
  save([t, ...getCustomTickets()]);
}

export function updateCustomTicket(t: Ticket) {
  save(getCustomTickets().map((item) => (item.id === t.id ? t : item)));
}

const KEY_HIDDEN = "tm_hidden_tickets";

export function getHiddenTicketIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_HIDDEN);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleHideTicket(id: string): boolean {
  const current = getHiddenTicketIds();
  const exists = current.includes(id);
  const next = exists ? current.filter((x) => x !== id) : [...current, id];
  window.localStorage.setItem(KEY_HIDDEN, JSON.stringify(next));
  window.dispatchEvent(new Event(EVT));
  return !exists; // returns true if now hidden, false if unhidden
}

export function deleteCustomTicket(id: string) {
  save(getCustomTickets().filter((t) => t.id !== id));
  const currentHidden = getHiddenTicketIds();
  if (currentHidden.includes(id)) {
    window.localStorage.setItem(
      KEY_HIDDEN,
      JSON.stringify(currentHidden.filter((x) => x !== id))
    );
  }
}


export function getAllTickets(): Ticket[] {
  return [...getCustomTickets(), ...seedTickets];
}

export function useAllTickets() {
  const [list, setList] = useState<Ticket[]>(() => getAllTickets());
  useEffect(() => {
    const sync = () => setList(getAllTickets());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}

export function useCustomTickets() {
  const [list, setList] = useState<Ticket[]>(() => getCustomTickets());
  useEffect(() => {
    const sync = () => setList(getCustomTickets());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}

export function useHiddenTicketIds() {
  const [list, setList] = useState<string[]>(() => getHiddenTicketIds());
  useEffect(() => {
    const sync = () => setList(getHiddenTicketIds());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}