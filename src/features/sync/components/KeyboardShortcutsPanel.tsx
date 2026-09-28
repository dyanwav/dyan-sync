export function KeyboardShortcutsPanel() {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-3">
      <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Atajos de Teclado</h3>
      <div className="flex flex-col gap-1.5 text-xs">
        <ShortcutRow label="Sincronizar línea actual" shortcut="Espacio" />
        <ShortcutRow label="Línea anterior (-2.5s)" shortcut="↑ / P" />
        <ShortcutRow label="Línea siguiente" shortcut="↓ / N" />
        <ShortcutRow label="Re-marcar línea (-2.5s)" shortcut="R" />
        <ShortcutRow label="Deshacer marca" shortcut="Backspace / Ctrl+Z" />
        <ShortcutRow label="Silencio / Instrumental" shortcut="B" />
        <ShortcutRow label="Omitir línea" shortcut="S" />
        <ShortcutRow label="Pausar / Reanudar" shortcut="Esc / K" />
        <ShortcutRow label="Saltar -3s / +3s" shortcut="J / L" />
      </div>
    </div>
  );
}

function ShortcutRow({ label, shortcut }: { label: string; shortcut: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-zinc-400 font-medium">{label}</span>
      <span className="bg-zinc-950/80 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
        {shortcut}
      </span>
    </div>
  );
}
