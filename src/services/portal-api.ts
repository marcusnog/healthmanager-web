import { OpenAPI } from "@/generated/core/OpenAPI";
import { DefaultService } from "@/generated/services/DefaultService";
import { readPortalSession } from "@/lib/portal-session";
import type { CheckoutResponse } from "./api";

OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend";

async function withPortalToken<T>(fn: () => Promise<T>): Promise<T> {
  const session = readPortalSession();
  const prev = OpenAPI.TOKEN;
  OpenAPI.TOKEN = () => Promise.resolve(session?.accessToken ?? "");
  try {
    return await fn();
  } finally {
    OpenAPI.TOKEN = prev;
  }
}

async function portalFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const session = readPortalSession();
  const response = await fetch(`${OpenAPI.BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Erro ${response.status}`);
  }
  return response;
}

export const PortalService = {
  login: (cpf: string, accessToken: string) =>
    DefaultService.portalAuth({ cpf, accessToken }),

  getProfile: () => withPortalToken(() => DefaultService.portalMe()),

  getAppointments: () => withPortalToken(() => DefaultService.portalAppointments()),

  getReceivables: () => withPortalToken(() => DefaultService.portalReceivables()),

  getDocuments: () => withPortalToken(() => DefaultService.portalDocuments()),

  checkout: (body: {
    receivableId: string;
    paymentMethod: string;
    amount?: number;
  }): Promise<CheckoutResponse> =>
    portalFetch("/portal/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.json()),
};
