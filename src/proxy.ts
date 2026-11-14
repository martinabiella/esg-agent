import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const protezione = auth.middleware({ loginUrl: "/accedi" });

export default async function proxy(request: NextRequest) {
  const risposta = await protezione(request);
  // Quando reindirizza all'accesso, ricorda la pagina richiesta.
  const location = risposta?.headers.get("location");
  if (location) {
    const url = new URL(location, request.url);
    if (url.origin === request.nextUrl.origin && url.pathname === "/accedi") {
      url.searchParams.set("dopo", request.nextUrl.pathname + request.nextUrl.search);
      risposta.headers.set("location", url.toString());
    }
  }
  return risposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
