export type ClinicRole = "PlatformAdmin" | "Admin" | "Secretary" | "Doctor";

export type SessionState = {
  name: string;
  role: ClinicRole;
  clinicName: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  session: SessionState;
  userId?: string;
  clinicId?: string;
  email?: string;
};
