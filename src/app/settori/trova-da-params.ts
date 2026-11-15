import { notFound } from "next/navigation";
import { trovaSettore } from "@/db/settori";
import { idSettore } from "@/lib/settore";

// Settore indicato dall'indirizzo; 404 se l'id non è valido o non esiste.
export async function settoreDaParams(params: Promise<{ id: string }>) {
  const id = idSettore((await params).id);
  if (id === null) notFound();
  const settore = await trovaSettore(id);
  if (!settore) notFound();
  return settore;
}
