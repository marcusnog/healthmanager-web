import type { PatientPortalProfileResponse } from "@/generated";

const STORAGE_KEY = "healthmanager.portal";

export interface PortalSession {
  accessToken: string;
  expiresAt: string;
  patient: PatientPortalProfileResponse;
}

export function readPortalSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PortalSession;
    if (new Date(session.expiresAt) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function savePortalSession(session: PortalSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearPortalSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
