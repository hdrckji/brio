import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-3xl font-bold">Page introuvable</h1>
      <Link href="/" className="btn">Retour à la boutique</Link>
    </div>
  );
}
