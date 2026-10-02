import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const credentials = new Set(["email", "password", "cpf", "accesstoken", "refreshtoken"]);
  let cleaned = false;

  for (const key of [...url.searchParams.keys()]) {
    if (credentials.has(key.toLowerCase())) {
      url.searchParams.delete(key);
      cleaned = true;
    }
  }

  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (forwardedProtocol === "https" || forwardedProtocol === "http") {
    url.protocol = `${forwardedProtocol}:`;
  }
  const response = cleaned ? NextResponse.redirect(url, 303) : NextResponse.next();
  response.headers.set("Referrer-Policy", "no-referrer");
  if (cleaned) response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/", "/portal"] };
