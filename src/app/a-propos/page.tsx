import type { Metadata } from "next";
import { Carte } from "@/components/Carte";
import { CarteArgument } from "@/components/CarteArgument";
import { Icon } from "@/components/Icon";
import { LienBouton } from "@/components/LienBouton";
import { PageShell } from "@/components/PageShell";
import { REPO_URL, URL_CONTRIBUER, URL_SIGNALER } from "@/lib/liens";

export const metadata: Metadata = { title: "À propos" };

const QUESTIONS = [
  {
    question: "D’où viennent les informations ?",
    reponse: "Des fiches écrites à partir de pages officielles. Chaque fiche montre ses sources et la date de sa dernière relecture.",
  },
  {
    question: "Puis-je me fier aux réponses pour mes démarches ?",
    reponse:
      "Les informations sont indicatives. Confirme toujours auprès de l’administration concernée avant de te déplacer ou de payer quoi que ce soit.",
  },
  {
    question: "Comment ajouter ou corriger une fiche ?",
    reponse:
      "Sur GitHub, où tout le monde peut proposer un changement. Un modèle de fiche et un guide t’expliquent la méthode pas à pas.",
  },
  {
    question: "Est-ce que tu gardes mes données ?",
    reponse:
      "Je ne te demande aucune donnée personnelle et je ne garde pas ta voix. Pour te répondre, ta question est envoyée à Groq, un service d’IA. Évite d’y mettre ton nom ou ton numéro.",
  },
];

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
      </div>

      <section aria-labelledby="titre-questions" className="mt-6">
        <h2 id="titre-questions" className="mx-1 mb-3 text-xl leading-7 font-bold">
          Questions fréquentes
        </h2>
        <div className="flex flex-col gap-2">
          {QUESTIONS.map(({ question, reponse }) => (
            <details key={question} className="group rounded-3xl bg-card shadow-soft">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-[18px] py-3 text-base leading-[22px] font-bold [&::-webkit-details-marker]:hidden">
                {question}
                <Icon name="chevron-bas" className="flex-none transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-[18px] pb-4 text-[15px] leading-[22px] text-ink-2">{reponse}</p>
            </details>
          ))}
        </div>
      </section>

      <Carte fond="teinte" aria-labelledby="titre-aide" className="mt-4">
        <h2 id="titre-aide" className="text-lg leading-6 font-bold">
          Tu veux aider&nbsp;?
        </h2>
        <p className="mt-1 text-[15px] leading-[22px] text-ink-2">
          Une démarche manque ou une information a changé&nbsp;? Dis-le-nous.
        </p>
        <div className="mt-3.5 flex flex-col gap-2">
          <LienBouton href={URL_CONTRIBUER} externe taille="moyen" icone="plus">
            Proposer une démarche
          </LienBouton>
          <LienBouton href={URL_SIGNALER} externe variante="secondaire" taille="moyen">
            Signaler une erreur
          </LienBouton>
          <LienBouton href={REPO_URL} externe variante="secondaire" taille="moyen" icone="code">
            Voir le code sur GitHub
          </LienBouton>
        </div>
      </Carte>

      <p className="mt-3 text-center text-[13px] leading-[18px] text-ink-3">Logiciel libre sous licence MIT.</p>
      <div className="min-h-3 flex-1" />
    </PageShell>
  );
}
