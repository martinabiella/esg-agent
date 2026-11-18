import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { UserButton } from "@/components/auth/user/user-button";

const voci = [
  { href: "/normative", label: "Normative" },
  { href: "/settori", label: "Settori" },
  { href: "/clienti", label: "Clienti" },
  { href: "/notizie", label: "Notizie" },
];

export async function MenuUtente() {
  await connection();
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
      <UserButton className="ml-auto" size="icon" align="end" hideSettings />
    </>
  );
}
