import type { Metadata } from "next";
import Link from "next/link";
import { CarteArgument } from "@/components/CarteArgument";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "À propos" };

export default function Page() {
  return (
    <PageShell actif="a-propos">
      <h1 className="mx-1 mt-3 text-[32px] leading-[38px] font-bold tracking-[-0.01em]">À propos</h1>
      <p className="mx-1 mt-2.5 text-[17px] leading-[26px] text-ink-2">
        Démarche-Bi t’explique les démarches administratives du Sénégal. Écris ta question, je te réponds avec les sources
        officielles.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <CarteArgument
          icone="bouclier"
          titre="Des sources officielles"
          texte="Chaque réponse vient d’une page officielle. Tu vois la source et la date."
        />
        <CarteArgument pointille icone="aide" titre="Je ne devine pas" texte="Si je n’ai pas l’information, je te le dis." />
        <CarteArgument
          icone="personnes"
          titre="Ouvert à tous"
          texte="Les démarches et le code sont publics. Tout le monde peut les corriger."
        />
        {/* Le site garde maintenant les questions et les avis : la personne doit pouvoir le lire sans chercher. */}
        <CarteArgument
          icone="info"
          titre="Tes données"
          texte="Je ne te demande aucune donnée personnelle et je ne garde pas ta voix. Ta question est envoyée à Groq, un service d’IA, pour te répondre. Le site la garde (sans savoir qui tu es), avec ton avis si tu en donnes un, pour améliorer les fiches. Évite d’y mettre ton nom ou ton numéro."
        />
      </div>

      <p className="mt-3 text-center text-[13px] leading-[18px] text-ink-3">
        Logiciel libre sous licence MIT.{" "}
        <Link href="/projet" className="inline-flex min-h-11 items-center font-bold text-leaf-deep underline underline-offset-4">
          Voir le projet
        </Link>
      </p>
      <div className="min-h-3 flex-1" />
    </PageShell>
  );
}
