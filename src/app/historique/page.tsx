import type { Metadata } from "next";
import { ListeHistorique } from "@/components/ListeHistorique";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Historique" };

export default function Page() {
  return (
    <PageShell actif="historique">
      <h1 className="mx-1 mt-3 text-[32px] leading-[38px] font-bold tracking-[-0.01em]">Historique</h1>
      <ListeHistorique />
      <div className="min-h-3 flex-1" />
    </PageShell>
  );
}
