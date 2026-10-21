/* ============================================================
   SESSION / TOKEN HELPERS
   ------------------------------------------------------------
   The app has two completely separate auth realms:

     • student  -> JWT signed with JWT_SECRET        -> /engineering/*
     • admin    -> JWT signed with ADMIN_JWT_SECRET  -> /admin/*

   They use different keys and different secrets, so a token
   from one realm is rejected by the other. Every helper here
   is therefore explicitly scoped to ONE realm. The previous
   shared `getToken()` in api.ts checked `admin_token` first,
   which meant a signed-in admin could send an admin token to
   the student endpoints and get a 401.
   ============================================================ */

export const USER_TOKEN_KEY = "pulselab_token";
export const USER_KEY = "pulselab_user";
export const USER_ID_KEY = "pulselab_userId";

export const ADMIN_TOKEN_KEY = "admin_token";
export const ADMIN_USER_KEY = "admin_user";

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  matric: string;
  phoneNumber?: string;
  gender?: string;
  role: "student" | "admin";
};

export type SessionAdmin = {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  role: "admin";
};

function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the session simply won't survive a reload */
  }
}

function removeSession(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ============================================================
   STUDENT SESSION
   ============================================================ */

export function getUserToken(): string | null {
  return readSession(USER_TOKEN_KEY);
}

export function getCurrentUser(): SessionUser | null {
  const raw = readSession(USER_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;

    return {
      id: String(parsed.id ?? parsed._id ?? parsed.userId ?? ""),
      fullName: parsed.fullName ?? "",
      email: parsed.email ?? "",
      matric: parsed.matric ?? "",
      phoneNumber: parsed.phoneNumber,
      gender: parsed.gender,
      role: parsed.role === "admin" ? "admin" : "student",
    };
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  const explicit = readSession(USER_ID_KEY);

  if (explicit) return explicit;

  return getCurrentUser()?.id ?? null;
}

export function setUserSession(user: SessionUser, token: string) {
  writeSession(USER_KEY, JSON.stringify(user));
  writeSession(USER_TOKEN_KEY, String(token));
  writeSession(USER_ID_KEY, String(user.id));
}

export function clearUserSession() {
  removeSession(USER_KEY);
  removeSession(USER_TOKEN_KEY);
  removeSession(USER_ID_KEY);
}

export function userAuthHeaders(): HeadersInit {
  const token = getUserToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ============================================================
   ADMIN SESSION
   ============================================================ */

export function getAdminToken(): string | null {
  return readSession(ADMIN_TOKEN_KEY);
}

export function getCurrentAdmin(): SessionAdmin | null {
  const raw = readSession(ADMIN_USER_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;

    return {
      _id: parsed._id,
      id: parsed.id ?? parsed._id,
      username: parsed.username ?? "",
      email: parsed.email ?? "",
      role: "admin",
    };
  } catch {
    return null;
  }
}

export function setAdminSession(admin: SessionAdmin, token: string) {
  writeSession(ADMIN_USER_KEY, JSON.stringify({ ...admin, role: "admin" }));
  writeSession(ADMIN_TOKEN_KEY, String(token));
}

export function clearAdminSession() {
  removeSession(ADMIN_USER_KEY);
  removeSession(ADMIN_TOKEN_KEY);
}

export function adminAuthHeaders(): HeadersInit {
  const token = getAdminToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ============================================================
   HELPERS
   ============================================================ */

export function isUserSignedIn(): boolean {
  return Boolean(getUserToken() && getCurrentUserId());
}

export function isAdminSignedIn(): boolean {
  return Boolean(getAdminToken());
}
