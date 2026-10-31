import type { Metadata } from "next";
import { CarteArgument } from "@/components/CarteArgument";
import { LienBouton } from "@/components/LienBouton";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "À propos" };

export default function Page() {
  return (
    <PageShell actif="a-propos">
      <h1 className="mx-1 mt-3 text-[32px] leading-[38px] font-bold tracking-[-0.01em]">À propos</h1>
      <p className="mx-1 mt-2.5 text-[17px] leading-[26px] text-ink-2">
        Démarche-Bi t’explique les démarches administratives du Sénégal. Pose ta question, je te réponds avec les sources
        officielles.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <CarteArgument
          icone="bouclier"
          titre="Des sources officielles"
          texte="Chaque réponse vient d’une source officielle, que tu peux consulter. Une IA comprend ta question et la reformule, sans inventer d’information."
        />
        <CarteArgument pointille icone="aide" titre="Je ne devine pas" texte="Si je n’ai pas l’information, je te le dis." />
        {/* Le site garde maintenant les questions et les avis : la personne doit pouvoir le lire sans chercher. */}
        <CarteArgument
          icone="info"
          titre="Tes données"
          texte="Je ne te demande aucune donnée personnelle et je ne garde pas ta voix. Ta question est envoyée à Groq, un service d’IA, pour te répondre. Le site la garde (sans savoir qui tu es), avec ton avis si tu en donnes un, pour améliorer le service. Évite d’y mettre ton nom ou ton numéro."
        />
      </div>

      {/* Rouvre la présentation « Bienvenue » de l'accueil, vue une seule fois au premier lancement. */}
      <LienBouton href="/?presentation" variante="secondaire" icone="info" className="mt-5">
        Revoir la présentation
      </LienBouton>
      <div className="min-h-3 flex-1" />
    </PageShell>
  );
}
