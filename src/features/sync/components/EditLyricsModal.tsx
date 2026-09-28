import { useState, useEffect } from 'react';
import { useSyncStore } from '../store';
import { parseLyrics } from '../utils/parse-lyrics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { FileEdit, Check } from 'lucide-react';
import type { LyricLine } from '@/features/project/types';

interface EditLyricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLyricsModal({ open, onOpenChange }: EditLyricsModalProps) {
  const { lines, setLines } = useSyncStore();
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) {
      const lyricText = lines.map(l => l.text).join('\n');
      setText(lyricText);
    }
  }, [open, lines]);

  const handleSave = () => {
    const parsed = parseLyrics(text);
    
    // Attempt to preserve timestamps for lines with matching text
    const existingMap = new Map<string, LyricLine>();
    for (const l of lines) {
      if (l.start !== null && l.text.trim()) {
        existingMap.set(l.text.trim().toLowerCase(), l);
      }
    }

    const mergedLines = parsed.map(newLine => {
      const key = newLine.text.trim().toLowerCase();
      const existing = existingMap.get(key);
      if (existing) {
        return {
          ...newLine,
          start: existing.start,
          end: existing.end,
          status: existing.status,
        };
      }
      return newLine;
    });

    setLines(mergedLines);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-6 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-heading flex items-center gap-2 text-white">
            <FileEdit className="h-5 w-5 text-blue-400" />
            Editar Letras del Proyecto
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            Modifica, corrige errores o añade nuevas líneas. Las líneas que ya coincidan con marcas existentes conservarán sus tiempos.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-80 font-mono text-sm bg-zinc-900/80 border-zinc-800 text-zinc-100 p-4 rounded-xl resize-none focus-visible:ring-blue-500/50"
            placeholder="Pega o escribe tu letra aquí..."
          />
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            <Check className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
