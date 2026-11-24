import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  destinazioneDopoAccesso,
  PERCORSO_ACCESSO,
  PERCORSO_RESET,
} from "@/lib/redirect-sicuro";

const protezione = auth.middleware({ loginUrl: PERCORSO_ACCESSO });

export default async function proxy(request: NextRequest) {
  const { origin, pathname, search, searchParams } = request.nextUrl;

  // Compatibilità con i vecchi link di accesso e di reset inviati da Neon.
  if (pathname === "/accedi") {
    const url = new URL(PERCORSO_ACCESSO, origin);
    url.searchParams.set("redirectTo", destinazioneDopoAccesso(searchParams.get("dopo")));
    return NextResponse.redirect(url);
  }
  if (pathname === "/reimposta") {
    return NextResponse.redirect(new URL(PERCORSO_RESET + search, origin));
  }

  // Il provider legge redirectTo dall'URL anche per i callback via email.
  const redirectTo = searchParams.get("redirectTo");
  if (pathname.startsWith("/auth/") && redirectTo !== null) {
    const destinazione = destinazioneDopoAccesso(redirectTo);
    if (redirectTo !== destinazione) {
      const url = request.nextUrl.clone();
      url.searchParams.set("redirectTo", destinazione);
      return NextResponse.redirect(url);
    }
  }

  const risposta = await protezione(request);
  const location = risposta?.headers.get("location");
  if (location) {
    const url = new URL(location, origin);
    if (url.origin === origin && url.pathname === PERCORSO_ACCESSO) {
      // I parametri della pagina protetta appartengono solo alla destinazione.
      url.search = "";
      url.searchParams.set("redirectTo", destinazioneDopoAccesso(pathname + search));
      risposta.headers.set("location", url.toString());
    }
  }
  return risposta;
}

// Il webhook di Parallel (src/app/api/parallel/webhook) e il cron delle
// Ricerche (src/app/api/cron/esecuzione) non hanno una sessione: si
// autenticano con la firma e con CRON_SECRET, quindi restano fuori dal proxy.
// Il cron di Vercel non segue i redirect: un 307 verso l'accesso lo
// fermerebbe senza errori.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/parallel/webhook|api/cron/esecuzione).*)",
  ],
};
