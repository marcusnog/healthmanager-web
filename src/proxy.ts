import { NextRequest, NextResponse } from "next/server";
import { isPublicBackendRoute } from "@/lib/backend-proxy-routes";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/backend" || pathname.startsWith("/backend/")) {
    const backendPath = pathname.slice("/backend".length);
    if (!isPublicBackendRoute(request.method, backendPath)) {
      return new NextResponse(null, { status: 404 });
    }

    const destination = new URL(process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080");
    destination.pathname = backendPath;
    destination.search = request.nextUrl.search;
    return NextResponse.rewrite(destination);
  }

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

export const config = { matcher: ["/", "/portal", "/backend/:path*"] };
