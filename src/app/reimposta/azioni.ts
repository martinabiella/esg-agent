"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type StatoReimposta = { errore?: string } | undefined;

export async function reimposta(
  _stato: StatoReimposta,
  formData: FormData,
): Promise<StatoReimposta> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const conferma = String(formData.get("conferma") ?? "");
  if (!token) return { errore: "Link non valido o scaduto." };
  if (password.length < 8) {
    return { errore: "La password deve avere almeno 8 caratteri." };
  }
  if (password !== conferma) return { errore: "Le password non coincidono." };

  let errore;
  try {
    ({ error: errore } = await auth.resetPassword({
      newPassword: password,
      token,
    }));
  } catch {
    return { errore: "Servizio non disponibile. Riprova tra poco." };
  }
  if (errore) return { errore: "Link non valido o scaduto." };

  redirect("/accedi");
}
