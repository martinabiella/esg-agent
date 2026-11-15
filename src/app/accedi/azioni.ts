"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { percorsoInterno } from "@/lib/redirect-sicuro";

export type StatoAccesso = { errore?: string } | undefined;

export async function accedi(
  _stato: StatoAccesso,
  formData: FormData,
): Promise<StatoAccesso> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { errore: "Inserisci email e password." };

  let errore;
  try {
    ({ error: errore } = await auth.signIn.email({ email, password }));
  } catch {
    return { errore: "Servizio di accesso non disponibile. Riprova tra poco." };
  }
  // Messaggio unico: non rivela se l'email esiste.
  if (errore) return { errore: "Email o password non corretti." };

  redirect(percorsoInterno(formData.get("dopo")));
}

const PREFISSO_COOKIE_AUTH = "__Secure-neon-auth";

export async function esci() {
  try {
    await auth.signOut();
  } catch {
    // Neon non ha risposto: la sessione lato Neon resta valida fino a
    // scadenza, ma questo browser viene comunque disconnesso qui sotto.
  }
  // Cancella sempre i cookie di sessione, anche se signOut è fallito.
  const store = await cookies();
  for (const { name } of store.getAll()) {
    if (!name.startsWith(PREFISSO_COOKIE_AUTH)) continue;
    store.set(name, "", {
      path: "/",
      maxAge: 0,
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
  }
  redirect("/accedi");
}
