import { useEffect, useState } from "react";
import { checkSessionFn } from "../admin/functions";
import { getCustomTickets } from "./ticket-store";

const KEY = "tm_user";

export type SessionUser = { 
  email: string; 
  name: string; 
  sessionId?: string; 
  loginMode?: 'single' | 'multiple' | 'token';
  userType?: 'payment' | 'token';
  transfersCount?: number;
  tokensCount?: number;
  acceptedTransfers?: { ticketId: string; seats: string[]; buyerName: string; acceptedAt?: string }[];
  ticketSlots?: number;
  ticketsCreatedCount?: number;
};

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function signIn(user: SessionUser) {
  window.localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("tm-auth"));
}

export function signOut() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("tm-auth"));
}

export function useUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const initialUser = getUser();
    setUser(initialUser);
    setReady(true);

    if (initialUser && initialUser.sessionId) {
      checkSessionFn({
        data: {
          email: initialUser.email,
          sessionId: initialUser.sessionId,
          ticketsCount: getCustomTickets().length,
        },
      })
        .then((res: any) => {
          if (!res.valid) {
            signOut();
          } else {
            const countChanged = typeof res.transfersCount === 'number' && initialUser.transfersCount !== res.transfersCount;
            const acceptedChanged = res.acceptedTransfers && JSON.stringify(initialUser.acceptedTransfers) !== JSON.stringify(res.acceptedTransfers);
            const slotsChanged = typeof res.ticketSlots === 'number' && initialUser.ticketSlots !== res.ticketSlots;
            const createdChanged = typeof res.ticketsCreatedCount === 'number' && initialUser.ticketsCreatedCount !== res.ticketsCreatedCount;
            const tokensChanged = typeof res.tokensCount === 'number' && initialUser.tokensCount !== res.tokensCount;
            
            if (countChanged || acceptedChanged || slotsChanged || createdChanged || tokensChanged) {
              const latestUser = {
                ...initialUser,
                transfersCount: typeof res.transfersCount === 'number' ? res.transfersCount : initialUser.transfersCount,
                acceptedTransfers: res.acceptedTransfers || initialUser.acceptedTransfers || [],
                ticketSlots: typeof res.ticketSlots === 'number' ? res.ticketSlots : initialUser.ticketSlots,
                ticketsCreatedCount: typeof res.ticketsCreatedCount === 'number' ? res.ticketsCreatedCount : initialUser.ticketsCreatedCount,
                tokensCount: typeof res.tokensCount === 'number' ? res.tokensCount : initialUser.tokensCount,
              };
              window.localStorage.setItem(KEY, JSON.stringify(latestUser));
              setUser(latestUser);
              window.dispatchEvent(new Event("tm-auth"));
            }
          }
        })
        .catch((err) => {
          console.error("Failed to validate user session in background:", err);
        });
    }

    const onChange = () => setUser(getUser());
    window.addEventListener("tm-auth", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("tm-auth", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Listen to ticket updates (created/deleted) to sync remaining slot counts in real-time
  useEffect(() => {
    const syncTicketsWithServer = () => {
      const currentUser = getUser();
      if (currentUser && currentUser.sessionId) {
        checkSessionFn({
          data: {
            email: currentUser.email,
            sessionId: currentUser.sessionId,
            ticketsCount: getCustomTickets().length,
          }
        })
          .then((res: any) => {
            if (res.valid) {
              const latestUser = {
                ...currentUser,
                transfersCount: typeof res.transfersCount === 'number' ? res.transfersCount : currentUser.transfersCount,
                acceptedTransfers: res.acceptedTransfers || currentUser.acceptedTransfers || [],
                ticketSlots: typeof res.ticketSlots === 'number' ? res.ticketSlots : currentUser.ticketSlots,
                ticketsCreatedCount: typeof res.ticketsCreatedCount === 'number' ? res.ticketsCreatedCount : currentUser.ticketsCreatedCount,
                tokensCount: typeof res.tokensCount === 'number' ? res.tokensCount : currentUser.tokensCount,
              };
              window.localStorage.setItem(KEY, JSON.stringify(latestUser));
              setUser(latestUser);
              window.dispatchEvent(new Event("tm-auth"));
            }
          })
          .catch((err) => {
            console.error("Failed to sync tickets count on ticket update:", err);
          });
      }
    };

    window.addEventListener("tm-tickets", syncTicketsWithServer);
    return () => {
      window.removeEventListener("tm-tickets", syncTicketsWithServer);
    };
  }, []);

  return { user, ready };
}