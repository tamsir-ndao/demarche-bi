"use client";

import { useState } from "react";
import { motsDeFiltre } from "@/lib/texte";
import { CarteDemarche } from "./CarteDemarche";
import { Icon, type IconName } from "./Icon";

export type DemarcheListee = {
  slug: string;
  titre: string;
  detail: string;
  icone: IconName;
  categorie: string;
  /** Le texte dans lequel on cherche : titre, résumé et mots-clés, sans accents. */
  recherche: string;
};

export type CategorieListee = { id: string; libelle: string };

const PUCE = "flex min-h-11 items-center rounded-full border-[1.5px] px-3 text-sm leading-5 font-bold transition-colors";

/** La liste des démarches, avec un champ pour chercher et des catégories pour filtrer. */
export function ListeDemarches({ demarches, categories }: { demarches: DemarcheListee[]; categories: CategorieListee[] }) {
  const [texte, setTexte] = useState("");
  const [categorie, setCategorie] = useState<string | null>(null);

  const mots = motsDeFiltre(texte);
  const visibles = demarches.filter(
    (demarche) =>
      (categorie === null || demarche.categorie === categorie) && mots.every((mot) => demarche.recherche.includes(mot)),
  );

  return (
    <>
      <div className="relative mt-4">
        <label htmlFor="filtre-demarches" className="sr-only">
          Chercher une démarche
        </label>
        <Icon name="loupe" size={22} className="pointer-events-none absolute top-[17px] left-5 text-ink-2" />
        <input
          id="filtre-demarches"
          type="search"
          value={texte}
          onChange={(evenement) => setTexte(evenement.target.value)}
          autoComplete="off"
          placeholder="Chercher une démarche"
          className="block h-14 w-full rounded-full border-[1.5px] border-edge bg-card pr-5 pl-[52px] text-[17px] leading-6 text-ink placeholder:text-ink-3 focus:border-leaf focus:shadow-[0_0_0_4px_var(--glow)]"
        />
      </div>

      {categories.length > 1 ? (
        <div role="group" aria-label="Catégories" className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={categorie === null}
            onClick={() => setCategorie(null)}
            className={`${PUCE} ${categorie === null ? "border-brand bg-brand text-on-brand" : "border-edge bg-card hover:bg-tint-2"}`}
          >
            Toutes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={categorie === cat.id}
              onClick={() => setCategorie(cat.id)}
              className={`${PUCE} ${categorie === cat.id ? "border-brand bg-brand text-on-brand" : "border-edge bg-card hover:bg-tint-2"}`}
            >
              {cat.libelle}
            </button>
          ))}
        </div>
      ) : null}

      <p aria-live="polite" className="mx-1 mt-4 text-sm leading-5 text-ink-2">
        {visibles.length === 0 ? "Aucune démarche" : `${visibles.length} ${visibles.length > 1 ? "démarches" : "démarche"}`}
      </p>

      {visibles.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-3">
          {visibles.map((demarche) => (
            <li key={demarche.slug}>
              <CarteDemarche
                href={`/demarches/${demarche.slug}`}
                titre={demarche.titre}
                detail={demarche.detail}
                icone={demarche.icone}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-3xl bg-card p-5 text-base leading-6 text-ink-2">
          Aucune démarche ne correspond. Essaie avec d’autres mots.
        </p>
      )}
    </>
  );
}
