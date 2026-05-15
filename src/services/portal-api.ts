import { OpenAPI } from "@/generated/core/OpenAPI";
import { DefaultService } from "@/generated/services/DefaultService";
import { readPortalSession } from "@/lib/portal-session";

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

export const PortalService = {
  login: (cpf: string, accessToken: string) =>
    DefaultService.portalAuth({ cpf, accessToken }),

  getProfile: () => withPortalToken(() => DefaultService.portalMe()),

  getAppointments: () => withPortalToken(() => DefaultService.portalAppointments()),

  getReceivables: () => withPortalToken(() => DefaultService.portalReceivables()),

  getDocuments: () => withPortalToken(() => DefaultService.portalDocuments()),
};
