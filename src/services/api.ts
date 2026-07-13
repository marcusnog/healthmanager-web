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

export async function financialSummary() {
  const response = await apiFetch(`/financial/summary`);
  return response.json() as Promise<{
    totalReceived: number;
    totalExpenses: number;
    balance: number;
  }>;
}

export { DefaultService } from "@/generated/services/DefaultService";

