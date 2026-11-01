import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { ReglageEffacer, ReglageVoix } from "@/components/ReglagesActions";
import { version } from "../../../package.json";

export const metadata: Metadata = { title: "Réglages" };

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mx-4 text-[13px] leading-[18px] font-semibold text-ink-2">{titre}</h2>
      <div className="mt-2 flex flex-col divide-y divide-line overflow-hidden rounded-2xl bg-card">{children}</div>
    </section>
  );
}

function Ligne({ icone, titre, texte }: { icone: IconName; titre: string; texte: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-xl bg-tint text-leaf">
        <Icon name={icone} size={19} />
      </span>
      <div className="min-w-0">
        <p className="text-[16px] leading-[22px] font-semibold">{titre}</p>
        <p className="mt-0.5 text-[14px] leading-5 text-ink-2">{texte}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <PageShell actif="reglages">
      <h1 className="mx-1 mt-3 text-[32px] leading-[38px] font-bold tracking-[-0.01em]">Réglages</h1>

      <Groupe titre="Préférences">
        <ReglageVoix />
      </Groupe>

      <Groupe titre="Mes données">
        <ReglageEffacer />
      </Groupe>

      <Groupe titre="À savoir">
        <Ligne icone="bouclier" titre="Sources officielles" texte="Chaque réponse vient d’une source officielle." />
        <Ligne icone="aide" titre="Je ne devine pas" texte="Si je n’ai pas l’information, je te le dis." />
        <Ligne icone="info" titre="Tes données" texte="Ta voix n’est pas gardée. Tes questions sont traitées par un service d’IA et gardées sans savoir qui tu es." />
        {/* Le détail reste accessible : le site garde les questions et les avis, la personne doit pouvoir le lire. */}
        <details className="group">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] leading-5 font-semibold [&::-webkit-details-marker]:hidden">
            Confidentialité
            <Icon name="chevron-bas" size={18} className="flex-none text-ink-2 transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-4 pb-4 text-[14px] leading-5 text-ink-2">
            Je ne te demande aucune donnée personnelle et je ne garde pas ta voix. Ta question est envoyée à Groq, un service d’IA, pour te répondre. Le site la garde (sans savoir qui tu es), avec ton avis si tu en donnes un, pour améliorer le service. Évite d’y mettre ton nom ou ton numéro. Une IA comprend ta question et la reformule, sans inventer d’information. Un code anonyme, tiré au hasard sur ce téléphone, sert seulement à compter les utilisateurs : il ne dit pas qui tu es. Ton historique reste sur ce téléphone.
          </p>
        </details>
      </Groupe>

      <Groupe titre="Application">
        <div className="flex min-h-[52px] items-center justify-between px-4 py-3 text-[15px] leading-5">
          <span className="font-semibold">Version</span>
          <span className="text-ink-2">{version}</span>
        </div>
      </Groupe>
      <div className="min-h-6 flex-1" />
    </PageShell>
  );
}
