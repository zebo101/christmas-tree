import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioControlProps {
  isPlaying: boolean;
  isMuted: boolean;
  onToggle: () => void;
  onMuteToggle: () => void;
}

export function AudioControl({ isPlaying, isMuted, onToggle, onMuteToggle }: AudioControlProps) {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="glass-gold hover:bg-christmas-gold/20 text-foreground rounded-full w-12 h-12"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onMuteToggle}
        className="glass hover:bg-muted/30 text-foreground rounded-full w-10 h-10"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </Button>
      
      {isPlaying && !isMuted && (
        <div className="flex items-center gap-0.5 ml-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-christmas-gold rounded-full animate-pulse"
              style={{
                height: `${8 + Math.random() * 12}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${0.3 + Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
