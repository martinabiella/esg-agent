"use client";

import { createAuthClient } from "@neon/auth/next";
import { QueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { percorsoInterno } from "@/lib/redirect-sicuro";

const authClient = createAuthClient();
const emailAndPassword = { forgotPassword: false, confirmPassword: true };
const localization = {
  auth: {
    signIn: "Accedi",
    signOut: "Esci",
    email: "Email",
    password: "Password",
    passwordPlaceholder: "Inserisci la password",
    newPasswordPlaceholder: "Inserisci la nuova password",
    confirmPassword: "Conferma password",
    confirmPasswordPlaceholder: "Inserisci di nuovo la password",
    showPassword: "Mostra la password",
    hidePassword: "Nascondi la password",
    fieldRequired: "Questo campo è obbligatorio.",
    invalidEmail: "Inserisci un indirizzo email valido.",
    tooShort: "Usa almeno {{min}} caratteri.",
    tooLong: "Usa al massimo {{max}} caratteri.",
    passwordsDoNotMatch: "Le password non coincidono.",
    resetPassword: "Imposta la password",
    invalidResetPasswordToken: "Link non valido o scaduto.",
    passwordResetSuccess: "Password aggiornata. Accedi con la nuova password.",
    verifyEmail: "Verifica l’indirizzo email",
    checkYourEmail: "Controlla la tua posta per trovare il link di verifica.",
  },
  errors: { generic: "Operazione non riuscita. Riprova." },
};

export function ProviderAuth({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const router = useRouter();
  const naviga = useCallback(({ to, replace }: { to: string; replace?: boolean }) => {
    const destinazione = percorsoInterno(to);
    if (destinazione.startsWith("/auth/") && window.location.pathname !== "/auth/sign-out") {
      if (replace) router.replace(destinazione);
      else router.push(destinazione);
    } else {
      // Ricarica anche i componenti server che leggono la sessione.
      if (replace) window.location.replace(destinazione);
      else window.location.assign(destinazione);
    }
  }, [router]);

  return (
    <AuthProvider
      authClient={authClient}
      queryClient={queryClient}
      navigate={naviga}
      Link={Link}
      localization={localization}
      emailAndPassword={emailAndPassword}
    >
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </AuthProvider>
  );
}
