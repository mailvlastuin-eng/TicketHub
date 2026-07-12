import { useEffect, useState } from "react";

const KEY = "tm_user";

export type SessionUser = { email: string; name: string };

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
    setUser(getUser());
    setReady(true);
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