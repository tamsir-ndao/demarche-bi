"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { type DonneesHorsConnexion, lireDonnees, URL_DONNEES } from "@/lib/hors-connexion/donnees";
import { searchFiches } from "@/lib/fiches/search";
import { nettoyerQuestion, urlReponse } from "@/lib/texte";
import { BulleQuestion } from "./BulleQuestion";
import { CarteDemarche } from "./CarteDemarche";
import { iconeCategorie } from "./Icon";
import { LienBouton } from "./LienBouton";
import { QuestionForm } from "./QuestionForm";

const TITRE = "mt-5 px-1 text-[28px] leading-[34px] font-bold tracking-[-0.01em]";
const TEXTE = "mt-2 px-1 text-[17px] leading-[26px] text-ink-2";

type Copie = Pick<DonneesHorsConnexion, "fiches" | "cartes">;

/** Les fiches gardées sur le téléphone : `undefined` pendant la lecture, `null` si elles manquent ou sont abîmées. */
function useCopie(): Copie | null | undefined {
  const [copie, setCopie] = useState<Copie | null | undefined>(undefined);
  useEffect(() => {
    let annule = false;
    fetch(URL_DONNEES)
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((brut) => !annule && setCopie(lireDonnees(brut)))
      .catch(() => !annule && setCopie(null));
    return () => {
      annule = true;
    };
  }, []);
  return copie;
}

/**
 * La page ouverte quand la question ne peut pas partir (voir public/sw.js) : sans IA, on cherche les mots de la
 * question dans les fiches gardées sur le téléphone et on propose les démarches qui ressemblent.
 */
export function ResultatsHorsConnexion() {
  const question = nettoyerQuestion(useSearchParams().get("q") ?? undefined);
  const copie = useCopie();
  const trouvees = useMemo(
    () => (copie && question ? searchFiches(copie.fiches, question, { inclureBrouillons: true }) : []),
    [copie, question],
  );

  return (
    <>
      {question ? <BulleQuestion question={question} /> : null}
      <section aria-labelledby="titre-hors-connexion">
        <h1 id="titre-hors-connexion" className={TITRE}>
          Pas de connexion
        </h1>
        {copie === undefined ? <p className={TEXTE}>Je cherche dans les fiches de ton téléphone…</p> : null}
        {copie === null ? (
          <>
            <p className={TEXTE}>Je n’ai pas encore de fiches sur ce téléphone. Reviens quand tu as du réseau, et je les garderai.</p>
            <LienBouton href={question ? urlReponse(question) : "/"} className="mt-5">
              Réessayer
            </LienBouton>
          </>
        ) : null}
        {copie ? (
          <>
            <p className={TEXTE}>
              {question
                ? "Je ne peux pas te répondre avec l’IA sans internet. Voici ce que je trouve dans les fiches de ton téléphone."
                : "Je ne peux pas utiliser l’IA sans internet. Tu peux écrire ta question : je cherche dans les fiches de ton téléphone."}
            </p>
            {question && trouvees.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-3">
                {trouvees.map(({ fiche }) => {
                  const carte = copie.cartes.find((c) => c.slug === fiche.slug);
                  return (
                    <li key={fiche.slug}>
                      <CarteDemarche
                        href={`/demarches/${fiche.slug}`}
                        titre={carte?.titre ?? fiche.titre}
                        detail={carte?.detail ?? ""}
                        icone={iconeCategorie(fiche.categorie)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {question && trouvees.length === 0 ? <p className={TEXTE}>Je ne trouve pas de fiche qui ressemble à ta question.</p> : null}
            <div className="mt-5">
              <QuestionForm id="question-hors-connexion" valeurInitiale={question} />
            </div>
            <LienBouton href="/demarches" variante="secondaire" icone="livre" className="mt-5">
              Voir les démarches que je connais
            </LienBouton>
            {question ? (
              <LienBouton href={urlReponse(question)} variante="lien" className="mt-3">
                Réessayer avec l’IA
              </LienBouton>
            ) : null}
          </>
        ) : null}
      </section>
    </>
  );
}
