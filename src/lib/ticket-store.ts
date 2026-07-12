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

export function deleteCustomTicket(id: string) {
  save(getCustomTickets().filter((t) => t.id !== id));
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