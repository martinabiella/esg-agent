import { notFound } from "next/navigation";
import { trovaCliente } from "@/db/clienti";
import { idCliente } from "@/lib/cliente";

// Cliente indicato dall'indirizzo; 404 se l'id non è valido o non esiste.
export async function clienteDaParams(params: Promise<{ id: string }>) {
  const id = idCliente((await params).id);
  if (id === null) notFound();
  const cliente = await trovaCliente(id);
  if (!cliente) notFound();
  return cliente;
}
