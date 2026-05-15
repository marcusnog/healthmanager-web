import { OpenAPI } from "@/generated/core/OpenAPI";
import { DefaultService } from "@/generated/services/DefaultService";
import { getValidAccessToken } from "@/lib/auth-session";

OpenAPI.BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend";
OpenAPI.TOKEN = async () => (await getValidAccessToken()) ?? "";

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

  if (!response.ok) {
    throw new Error("Nao foi possivel baixar o documento.");
  }

  return response.blob();
}

export { DefaultService };
