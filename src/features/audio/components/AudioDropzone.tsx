import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface AudioDropzoneProps {
  onLoad: (file: File) => void;
  className?: string;
}

export function AudioDropzone({ onLoad, className }: AudioDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileDetails, setFileDetails] = useState<{name: string, size: string} | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processFile = (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'];
    
    if (validTypes.includes(file.type) || (ext && validExts.includes(ext))) {
      setFileDetails({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      });
      onLoad(file);
    } else {
      alert('Unsupported file type. Please upload a valid audio file.');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onLoad]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-colors",
        isDragOver 
          ? "border-zinc-400 bg-zinc-800/50" 
          : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/30",
        className
      )}
    >
      <input
        type="file"
        accept=".mp3,.wav,.aac,.flac,.ogg,.m4a"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        title="Upload Audio File"
      />
      
      <div className="flex flex-col items-center text-center pointer-events-none">
        <UploadCloud className={cn("w-12 h-12 mb-4", isDragOver ? "text-zinc-300" : "text-zinc-500")} />
        
        {fileDetails ? (
          <div className="space-y-1">
            <p className="text-zinc-200 font-medium">{fileDetails.name}</p>
            <p className="text-zinc-500 text-sm">{fileDetails.size}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-zinc-300 font-medium">Drag & drop your audio track here</p>
            <p className="text-zinc-500 text-sm">Supports MP3, WAV, AAC, FLAC, OGG, M4A</p>
          </div>
        )}
      </div>
    </div>
  );
}
