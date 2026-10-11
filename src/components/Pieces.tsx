import { decouperPiece } from "@/lib/fiches/affichage";
import { EtiquetteAConfirmer } from "./Pastilles";

/** Les pièces à apporter, à cocher au fur et à mesure (la case se barre, sans rien enregistrer). */
export function Pieces({ pieces }: { pieces: string[] }) {
  return (
    <ul className="divide-y divide-line">
      {pieces.map((texte) => {
        const piece = decouperPiece(texte);
        return (
          <li key={texte}>
            <label className="group flex min-h-[50px] cursor-pointer items-start gap-3.5 py-[13px]">
              <input type="checkbox" className="case-cocher" />
              <span className="min-w-0 text-base leading-6 font-semibold">
                <span className="group-has-[:checked]:text-ink-3 group-has-[:checked]:line-through">{piece.principal}</span>
                {piece.aConfirmer ? <EtiquetteAConfirmer /> : null}
                {piece.precision ? (
                  <span className="block text-sm leading-5 font-normal text-ink-2">{piece.precision}</span>
                ) : null}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
