import type { AuthResponse } from "@/generated";
import type { AuthSession, ClinicRole, SessionState } from "@/types/app";

const STORAGE_KEY = "healthmanager.auth";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend";

function parseStoredSession(value: string | null): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    const session = JSON.parse(value) as AuthSession;
    if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function deriveClinicName(email?: string, clinicId?: string) {
  if (!clinicId) {
    return "Operacao interna";
  }

  if (email?.endsWith("@clinicaaurora.com")) {
    return "Clinica Aurora";
  }

  return "Clinica conectada";
}

function normalizeRole(role?: string): ClinicRole {
  if (
    role === "PlatformAdmin" ||
    role === "Admin" ||
    role === "Secretary" ||
    role === "Doctor"
  ) {
    return role;
  }

  return "Admin";
}

export function createAuthSession(response: AuthResponse): AuthSession | null {
  if (
    !response.accessToken ||
    !response.refreshToken ||
    !response.expiresAt ||
    !response.user?.name ||
    !response.user?.email
  ) {
    return null;
  }

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: response.expiresAt,
    userId: response.user.id,
    clinicId: response.user.clinicId,
    email: response.user.email,
    session: {
      name: response.user.name,
      role: normalizeRole(response.user.role),
      clinicName: deriveClinicName(response.user.email, response.user.clinicId),
    },
  };
}

export function readAuthSession() {
  if (typeof window === "undefined") return null;
  return parseStoredSession(window.localStorage.getItem(STORAGE_KEY));
}

export function persistAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function readStoredSessionState(): SessionState | null {
  return readAuthSession()?.session ?? null;
}

async function refreshAuthSession(session: AuthSession) {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: session.refreshToken,
    }),
  });

  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  const payload = (await response.json()) as AuthResponse;
  const refreshedSession = createAuthSession(payload);

  if (!refreshedSession) {
    clearAuthSession();
    return null;
  }

  persistAuthSession(refreshedSession);
  return refreshedSession;
}

export async function getValidAccessToken() {
  const session = readAuthSession();

  if (!session) {
    return undefined;
  }

  const expiresAt = Date.parse(session.expiresAt);
  if (!Number.isNaN(expiresAt) && expiresAt - Date.now() > 30_000) {
    return session.accessToken;
  }

  const refreshedSession = await refreshAuthSession(session);
  return refreshedSession?.accessToken;
}

export async function logoutAuthSession() {
  const session = readAuthSession();

  if (!session) {
    clearAuthSession();
    return;
  }

  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: session.refreshToken,
      }),
    });
  } catch {
    // Local logout should still clear browser state if the API is unavailable.
  } finally {
    clearAuthSession();
  }
}
