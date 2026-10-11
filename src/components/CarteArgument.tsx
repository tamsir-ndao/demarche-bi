import { Icon, type IconName } from "./Icon";

type CarteArgumentProps = {
  icone: IconName;
  titre: string;
  texte: string;
  /** Contour en pointillés : pour « Je ne devine pas », ce que la fiche ne dit pas. */
  pointille?: boolean;
  /** Version large, pour la page d'accueil sur ordinateur. */
  grande?: boolean;
};

/** Une raison de faire confiance : une icône, un titre, une phrase. */
export function CarteArgument({ icone, titre, texte, pointille = false, grande = false }: CarteArgumentProps) {
  return (
    <div className={`flex items-start rounded-3xl bg-card shadow-soft ${grande ? "gap-4 p-6" : "gap-3.5 p-[18px]"}`}>
      <span
        aria-hidden="true"
        className={`flex flex-none items-center justify-center rounded-full text-leaf ${grande ? "size-12" : "size-11"} ${
          pointille ? "border-[1.5px] border-dashed border-edge" : "bg-tint"
        }`}
      >
        <Icon name={icone} size={grande ? 24 : 22} />
      </span>
      <div className="min-w-0">
        <h2 className={`font-bold ${grande ? "text-lg leading-6" : "text-[17px] leading-6"}`}>{titre}</h2>
        <p className="mt-0.5 text-[15px] leading-[22px] text-ink-2">{texte}</p>
      </div>
    </div>
  );
}
