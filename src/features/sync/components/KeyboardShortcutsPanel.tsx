
export function KeyboardShortcutsPanel() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col gap-4">
      <h3 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">Keyboard Shortcuts</h3>
      <div className="flex flex-col gap-2 text-sm">
        <ShortcutRow label="Mark line start" shortcut="Space" />
        <ShortcutRow label="Undo last mark" shortcut="Backspace / Ctrl+Z" />
        <ShortcutRow label="Mark silence/instr" shortcut="B" />
        <ShortcutRow label="Skip line" shortcut="S" />
        <ShortcutRow label="Play / Pause" shortcut="K" />
        <ShortcutRow label="Seek -3s / +3s" shortcut="J / L" />
      </div>
    </div>
  );
}

function ShortcutRow({ label, shortcut }: { label: string; shortcut: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-zinc-300">{label}</span>
      <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-xs font-mono">{shortcut}</span>
    </div>
  );
}
