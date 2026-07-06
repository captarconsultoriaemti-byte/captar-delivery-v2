import { ImageOff } from "lucide-react";

export function ProdutoThumbnail({
  fotoUrl,
  nome,
  className = "h-10 w-10",
  iconSize = 16,
}: {
  fotoUrl: string | null;
  nome: string;
  className?: string;
  iconSize?: number;
}) {
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fotoUrl} alt={nome} className={`${className} rounded object-cover`} />;
  }

  return (
    <div
      className={`${className} flex items-center justify-center rounded bg-secondary/10 text-secondary/50`}
    >
      <ImageOff size={iconSize} />
    </div>
  );
}
