import { Skeleton } from "@/components/ui/skeleton";

export function Caricamento() {
  return (
    <div className="mt-4 flex items-center gap-3" role="status" aria-label="Caricamento">
      <Skeleton className="h-4 w-4 rounded-full" />
      <span className="text-sm text-muted-foreground">Caricamento…</span>
    </div>
  );
}
