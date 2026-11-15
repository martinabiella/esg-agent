import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { esci } from "./accedi/azioni";

const voci = [
  { href: "/normative", label: "Normative" },
  { href: "/settori", label: "Settori" },
  { href: "/clienti", label: "Clienti" },
  { href: "/notizie", label: "Notizie" },
];

export async function MenuUtente() {
  const { data: sessione } = await auth.getSession();
  if (!sessione?.user) return null;
  return (
    <>
      <nav className="flex gap-1 text-sm" aria-label="Navigazione principale">
        {voci.map((v) => (
          <Button key={v.href} variant="ghost" size="sm" render={<Link href={v.href} />}>
            {v.label}
          </Button>
        ))}
      </nav>
      <form action={esci} className="ml-auto">
        <Button type="submit" variant="ghost" size="sm">
          Esci
        </Button>
      </form>
    </>
  );
}
