/** Les étapes dans l'ordre, reliées par un trait ; la dernière, la ligne d'arrivée, est en vert plein. */
export function Etapes({ etapes }: { etapes: string[] }) {
  return (
    <ol className="list-none">
      {etapes.map((etape, index) => {
        const derniere = index === etapes.length - 1;
        return (
          <li
            key={etape}
            className="relative flex gap-3.5 pb-[18px] last:pb-0 after:absolute after:top-[38px] after:bottom-1.5 after:left-[15px] after:w-0.5 after:bg-line last:after:hidden"
          >
            <span
              className={`flex size-8 flex-none items-center justify-center rounded-full text-[15px] font-bold ${
                derniere ? "bg-brand text-on-brand" : "bg-tint-2 text-leaf-deep"
              }`}
            >
              {index + 1}
            </span>
            <p className="mt-1 min-w-0 text-base leading-6 font-medium">{etape}</p>
          </li>
        );
      })}
    </ol>
  );
}
