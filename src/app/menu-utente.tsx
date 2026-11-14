import Link from "next/link";
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
      <nav className="flex gap-4 text-sm">
        {voci.map((v) => (
          <Link key={v.href} href={v.href} className="hover:underline">
            {v.label}
          </Link>
        ))}
      </nav>
      <form action={esci} className="ml-auto">
        <button type="submit" className="text-sm hover:underline">
          Esci
        </button>
      </form>
    </>
  );
}
