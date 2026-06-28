import { OpenAPI } from "@/generated/core/OpenAPI";
import { DefaultService } from "@/generated/services/DefaultService";
import { getValidAccessToken } from "@/lib/auth-session";

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

export async function downloadPatientDocument(
  patientId: string,
  documentId: string,
) {
  const accessToken = await getValidAccessToken();
  const response = await fetch(
    `${OpenAPI.BASE}/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    },
  );

  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:unauthorized"));
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel baixar o documento.");
  }

  return response.blob();
}

export async function patientsDelete(patientId: string): Promise<void> {
  await apiFetch(`/patients/${encodeURIComponent(patientId)}`, {
    method: "DELETE",
  });
}

export async function doctorsDelete(doctorId: string): Promise<void> {
  await apiFetch(`/doctors/${encodeURIComponent(doctorId)}`, {
    method: "DELETE",
  });
}

export async function appointmentsUpdate(
  appointmentId: string,
  body: {
    doctorId?: string;
    startAt?: string;
    durationMinutes?: number;
    notes?: string;
    type?: string;
    amount?: number;
  },
) {
  const response = await apiFetch(
    `/appointments/${encodeURIComponent(appointmentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  return response.json();
}

export async function paymentsList(
  page: number = 1,
  pageSize: number = 20,
  receivableId?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const params = new URLSearchParams();
  params.set("Page", String(page));
  params.set("PageSize", String(pageSize));
  if (receivableId) params.set("ReceivableId", receivableId);
  if (dateFrom) params.set("DateFrom", dateFrom);
  if (dateTo) params.set("DateTo", dateTo);

  const response = await apiFetch(`/payments?${params.toString()}`);
  return response.json();
}

export async function dashboardSummary(doctorId?: string) {
  const params = doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : "";
  const response = await apiFetch(`/dashboard/summary${params}`);
  return response.json() as Promise<import("@/generated").DashboardSummaryResponse>;
}

export async function doctorsListPaged(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
) {
  const params = new URLSearchParams();
  params.set("Page", String(page));
  params.set("PageSize", String(pageSize));
  if (search) params.set("Search", search);

  const response = await apiFetch(`/doctors?${params.toString()}`);
  return response.json() as Promise<{
    items: import("@/generated").DoctorResponse[];
    page: number;
    pageSize: number;
    total: number;
  }>;
}

export { DefaultService };
