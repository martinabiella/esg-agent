import { viewPaths } from "@better-auth-ui/core";
import { notFound } from "next/navigation";
import { ResetPassword } from "@/components/auth/reset-password";
import { SignIn } from "@/components/auth/sign-in";
import { SignOut } from "@/components/auth/sign-out";
import { VerifyEmail } from "@/components/auth/verify-email";

const viste = new Map([
  [viewPaths.auth.signIn, <SignIn key="accesso" />],
  [viewPaths.auth.signOut, <SignOut key="uscita" />],
  [viewPaths.auth.resetPassword, <ResetPassword key="reset" />],
  [viewPaths.auth.verifyEmail, <VerifyEmail key="verifica" />],
]);

export function generateStaticParams() {
  return Array.from(viste.keys(), (path) => ({ path }));
}

export default async function PaginaAuth({ params }: PageProps<"/auth/[path]">) {
  const { path } = await params;
  const vista = viste.get(path);
  if (!vista) notFound();

  return <div className="mt-12 flex justify-center">{vista}</div>;
}
