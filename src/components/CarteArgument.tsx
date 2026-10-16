import { Icon, type IconName } from "./Icon";

type CarteArgumentProps = {
  icone: IconName;
  titre: string;
  texte: string;
  /** Contour en pointillés : pour « Je ne devine pas », ce que la fiche ne dit pas. */
  pointille?: boolean;
};

/** Une raison de faire confiance : une icône, un titre, une phrase (page « À propos »). */
export function CarteArgument({ icone, titre, texte, pointille = false }: CarteArgumentProps) {
  return (
    <div className="flex items-start gap-3.5 rounded-3xl bg-card p-[18px] shadow-soft">
      <span
        aria-hidden="true"
        className={`flex size-11 flex-none items-center justify-center rounded-full text-leaf ${
          pointille ? "border-[1.5px] border-dashed border-edge" : "bg-tint"
        }`}
      >
        <Icon name={icone} size={22} />
      </span>
      <div className="min-w-0">
        <h2 className="text-[17px] leading-6 font-bold">{titre}</h2>
        <p className="mt-0.5 text-[15px] leading-[22px] text-ink-2">{texte}</p>
      </div>
    </div>
  );
}
