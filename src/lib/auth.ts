import { useEffect, useState } from "react";
import { checkSessionFn, logoutUserFn } from "../admin/functions";
import { getCustomTickets } from "./ticket-store";

const KEY = "tm_user";

export type SessionUser = { 
  email: string; 
  name: string; 
  username?: string;
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
  // Invalidate HttpOnly cookie on server
  logoutUserFn().catch(() => {});
}

export function useUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialUser = getUser();
    setUser(initialUser);
    setReady(true);

    // Validate session with server (via HttpOnly cookie or backward-compatible sessionId)
    if (initialUser) {
      checkSessionFn({
        data: {
          email: initialUser.email,
          sessionId: initialUser.sessionId,
          ticketsCount: getCustomTickets().length,
        },
      })
        .then((res: any) => {
          if (!res || !res.valid) {
            signOut();
          } else {
            const latestUser: SessionUser = {
              email: res.email || initialUser.email,
              name: res.name || initialUser.name,
              username: res.username || initialUser.username,
              sessionId: res.sessionId || initialUser.sessionId,
              loginMode: res.loginMode || initialUser.loginMode || 'single',
              userType: res.userType || initialUser.userType || 'payment',
              transfersCount: typeof res.transfersCount === 'number' ? res.transfersCount : initialUser.transfersCount,
              acceptedTransfers: res.acceptedTransfers || initialUser.acceptedTransfers || [],
              ticketSlots: typeof res.ticketSlots === 'number' ? res.ticketSlots : initialUser.ticketSlots,
              ticketsCreatedCount: typeof res.ticketsCreatedCount === 'number' ? res.ticketsCreatedCount : initialUser.ticketsCreatedCount,
              tokensCount: typeof res.tokensCount === 'number' ? res.tokensCount : initialUser.tokensCount,
            };

            const changed =
              latestUser.transfersCount !== initialUser.transfersCount ||
              latestUser.ticketSlots !== initialUser.ticketSlots ||
              latestUser.ticketsCreatedCount !== initialUser.ticketsCreatedCount ||
              latestUser.tokensCount !== initialUser.tokensCount ||
              JSON.stringify(latestUser.acceptedTransfers) !== JSON.stringify(initialUser.acceptedTransfers);

            if (changed) {
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
      if (currentUser) {
        checkSessionFn({
          data: {
            email: currentUser.email,
            sessionId: currentUser.sessionId,
            ticketsCount: getCustomTickets().length,
          }
        })
          .then((res: any) => {
            if (res && res.valid) {
              const latestUser: SessionUser = {
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