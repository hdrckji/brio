"use client";

export function PrintButton() {
  return (
    <div className="flex gap-2 print:hidden">
      <a href="/admin/export" className="btn-secondary">Exporter les commandes (CSV)</a>
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        Imprimer
      </button>
    </div>
  );
}
