import { useEffect, useState } from "react";
import { checkSessionFn } from "../admin/functions";

const KEY = "tm_user";

export type SessionUser = { 
  email: string; 
  name: string; 
  sessionId?: string; 
  loginMode?: 'single' | 'multiple';
  transfersCount?: number;
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
        },
      })
        .then((res: any) => {
          if (!res.valid) {
            signOut();
          } else if (typeof res.transfersCount === 'number' && initialUser.transfersCount !== res.transfersCount) {
            const latestUser = { ...initialUser, transfersCount: res.transfersCount };
            window.localStorage.setItem(KEY, JSON.stringify(latestUser));
            setUser(latestUser);
            window.dispatchEvent(new Event("tm-auth"));
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
  return { user, ready };
}