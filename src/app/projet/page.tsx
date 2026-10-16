import type { Metadata } from "next";
import { Carte } from "@/components/Carte";
import { Icon } from "@/components/Icon";
import { LienBouton } from "@/components/LienBouton";
import { PageShell } from "@/components/PageShell";
import { REPO_URL, URL_CONTRIBUER, URL_SIGNALER } from "@/lib/liens";

export const metadata: Metadata = { title: "Le projet" };

// La page pour le jury et les contributeurs : elle n'est pas dans le menu, seulement un lien discret au bas de « À propos ».
// Ce que les utilisateurs doivent savoir (sources, « je ne devine pas », leurs données) reste dans « À propos ».
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
];

export default function Page() {
  return (
    <PageShell retour={{ href: "/a-propos", libelle: "Retour à À propos" }}>
      <h1 className="mx-1 mt-3 text-[32px] leading-[38px] font-bold tracking-[-0.01em]">Le projet</h1>
      <p className="mx-1 mt-2.5 text-[17px] leading-[26px] text-ink-2">
        Démarche-Bi est un logiciel libre, né à l’Open Source × AI Hackathon 2026 (Galsen DEV), dans la catégorie Civic Tech
        et services publics. Le code, les fiches et leurs sources sont publics.
      </p>

      <section aria-labelledby="titre-questions" className="mt-6">
        <h2 id="titre-questions" className="mx-1 mb-3 text-xl leading-7 font-bold">
          Questions fréquentes
        </h2>
        <div className="flex flex-col gap-2">
          {QUESTIONS.map(({ question, reponse }) => (
            <details key={question} className="group rounded-3xl bg-card">
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
