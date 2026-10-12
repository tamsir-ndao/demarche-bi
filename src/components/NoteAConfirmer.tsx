import { decouperTelephones } from "@/lib/fiches/affichage";
import { Icon } from "./Icon";

/** Une information que la fiche demande de confirmer. Un numéro vert cité dans la note devient un lien d'appel. */
export function NoteAConfirmer({ texte }: { texte: string }) {
  return (
    <aside aria-label="À confirmer" data-lecture="a-confirmer" className="mt-4 flex gap-3 rounded-[20px] border-[1.5px] border-edge px-4 py-3.5">
      <Icon name="info" size={24} strokeWidth={2} className="mt-px flex-none text-leaf" />
      <p className="min-w-0 text-[15px] leading-[22px] text-ink-2">
        <strong className="text-ink">À confirmer.</strong>{" "}
        {decouperTelephones(texte).map((segment, index) =>
          segment.type === "tel" ? (
            <a key={index} href={segment.href} className="font-bold whitespace-nowrap text-leaf-deep underline">
              {segment.valeur}
            </a>
          ) : (
            <span key={index}>{segment.valeur}</span>
          ),
        )}
      </p>
    </aside>
  );
}
