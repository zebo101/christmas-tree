import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 20 }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: string[] = [];
    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = Math.min(files.length, remainingSlots);

    Array.from(files).slice(0, filesToProcess).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newPhotos.push(event.target.result as string);
          if (newPhotos.length === filesToProcess) {
            onPhotosChange([...photos, ...newPhotos]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleClearAll = () => {
    onPhotosChange([]);
  };

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <div className="flex flex-col items-end gap-2">
        {photos.length > 0 && (
          <div className="glass rounded-lg p-2 flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground px-2">
              {photos.length}/{maxPhotos} photos
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs text-accent hover:text-accent/80"
            >
              Clear all
            </Button>
          </div>
        )}
        
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={photos.length >= maxPhotos}
          className="glass-gold hover:bg-christmas-gold/30 text-foreground rounded-full px-4 py-2 flex items-center gap-2"
        >
          <ImagePlus className="w-5 h-5" />
          <span className="text-sm font-medium">Add Photos</span>
        </Button>
        
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
