import { Suspense } from "react";
import { AvvisoDiConferma } from "./avviso-di-conferma";
import { Caricamento } from "./caricamento";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Monitoraggio normativa ESG</h1>
      <p className="mt-2 text-sm opacity-70">Scegli una sezione dal menu.</p>
      <Suspense fallback={<Caricamento />}>
        <AvvisoDiConferma />
      </Suspense>
    </div>
  );
}
