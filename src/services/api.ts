import { OpenAPI } from "@/generated/core/OpenAPI";
import { getValidAccessToken } from "@/lib/auth-session";

export interface HealthInsuranceResponse {
  id: string;
  name: string;
  phone?: string;
  contactName?: string;
}

export interface SpecialtyResponse {
  id: string;
  name: string;
  doctors: Array<{ id: string; name: string; crm: string }>;
}

interface PagedApiResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

OpenAPI.BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend";
OpenAPI.TOKEN = async () => (await getValidAccessToken()) ?? "";

async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await getValidAccessToken();
  const response = await fetch(`${OpenAPI.BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:unauthorized"));
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Erro ${response.status}`);
  }

  return response;
}

export async function expensesList(
  page: number = 1,
  pageSize: number = 20,
  category?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const params = new URLSearchParams();
  params.set("Page", String(page));
  params.set("PageSize", String(pageSize));
  if (category) params.set("Category", category);
  if (status) params.set("Status", status);
  if (dateFrom) params.set("DateFrom", dateFrom);
  if (dateTo) params.set("DateTo", dateTo);
  const response = await apiFetch(`/financial/expenses?${params.toString()}`);
  return response.json();
}

export async function expenseSave(id: string | undefined, body: {
  description: string;
  amount: number;
  category: string;
  paymentMethod: string;
  paidAt?: string;
  status?: string;
  notes?: string;
}) {
  const method = id ? "PUT" : "POST";
  const url = id ? `/financial/expenses/${id}` : `/financial/expenses`;
  const response = await apiFetch(url, { method, body: JSON.stringify(body) });
  return response.json();
}

export async function expenseDelete(id: string) {
  await apiFetch(`/financial/expenses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ── Health Insurance ──

export async function healthInsurancesList(page = 1, pageSize = 20, search?: string) {
  const params = new URLSearchParams();
  params.set("Page", String(page));
  params.set("PageSize", String(pageSize));
  if (search) params.set("Search", search);
  const response = await apiFetch(`/health-insurances?${params.toString()}`);
  return response.json() as Promise<PagedApiResponse<HealthInsuranceResponse>>;
}

export async function healthInsuranceCreate(body: { name: string; phone?: string; contactName?: string }) {
  const response = await apiFetch("/health-insurances", { method: "POST", body: JSON.stringify(body) });
  return response.json();
}

export async function healthInsuranceUpdate(id: string, body: { name: string; phone?: string; contactName?: string }) {
  const response = await apiFetch(`/health-insurances/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) });
  return response.json();
}

export async function healthInsuranceDelete(id: string) {
  await apiFetch(`/health-insurances/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Specialties ──

export async function specialtiesList(page = 1, pageSize = 20, search?: string) {
  const params = new URLSearchParams();
  params.set("Page", String(page));
  params.set("PageSize", String(pageSize));
  if (search) params.set("Search", search);
  const response = await apiFetch(`/specialties?${params.toString()}`);
  return response.json() as Promise<PagedApiResponse<SpecialtyResponse>>;
}

export async function specialtyCreate(body: { name: string }) {
  const response = await apiFetch("/specialties", { method: "POST", body: JSON.stringify(body) });
  return response.json();
}

export async function specialtyUpdate(id: string, body: { name: string }) {
  const response = await apiFetch(`/specialties/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) });
  return response.json();
}

export async function specialtyDelete(id: string) {
  await apiFetch(`/specialties/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Doctor Availabilities ──

export async function availabilitiesList(page = 1, pageSize = 50, doctorId?: string) {
  const params = new URLSearchParams();
  params.set("Page", String(page));
  params.set("PageSize", String(pageSize));
  if (doctorId) params.set("DoctorId", doctorId);
  const response = await apiFetch(`/doctor-availabilities?${params.toString()}`);
  return response.json();
}

export async function availabilityCreate(body: {
  doctorId: string; dayOfWeek: number; startTime: string; endTime: string; isAvailable?: boolean;
}) {
  const response = await apiFetch("/doctor-availabilities", { method: "POST", body: JSON.stringify(body) });
  return response.json();
}

export async function availabilityUpdate(id: string, body: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }) {
  const response = await apiFetch(`/doctor-availabilities/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) });
  return response.json();
}

export async function availabilityDelete(id: string) {
  await apiFetch(`/doctor-availabilities/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function financialSummary() {
  const response = await apiFetch(`/financial/summary`);
  return response.json() as Promise<{
    totalReceived: number;
    totalExpenses: number;
    balance: number;
  }>;
}

export { DefaultService } from "@/generated/services/DefaultService";

