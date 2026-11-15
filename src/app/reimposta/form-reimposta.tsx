"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reimposta } from "./azioni";

export function FormReimposta({ token }: { token: string }) {
  const [stato, azione, inCorso] = useActionState(reimposta, undefined);
  return (
    <form action={azione} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nuova password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="conferma">Conferma password</Label>
        <Input
          id="conferma"
          name="conferma"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {stato?.errore && (
        <Alert variant="destructive">
          <AlertDescription>{stato.errore}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={inCorso} className="w-full">
        {inCorso ? "Salvataggio…" : "Imposta password"}
      </Button>
    </form>
  );
}
