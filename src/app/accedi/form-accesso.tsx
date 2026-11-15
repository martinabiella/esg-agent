"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accedi } from "./azioni";

export function FormAccesso({ dopo }: { dopo: string }) {
  const [stato, azione, inCorso] = useActionState(accedi, undefined);
  return (
    <form action={azione} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="dopo" value={dopo} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {stato?.errore && (
        <Alert variant="destructive">
          <AlertDescription>{stato.errore}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={inCorso} className="w-full">
        {inCorso ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>
  );
}
