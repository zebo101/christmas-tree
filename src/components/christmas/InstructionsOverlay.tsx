import { useState, useEffect } from 'react';
import { X, Hand, Grab, MousePointer, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstructionsOverlayProps {
  onDismiss: () => void;
}

export function InstructionsOverlay({ onDismiss }: InstructionsOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has seen instructions before
    const hasSeenInstructions = localStorage.getItem('christmas-tree-instructions-seen');
    if (!hasSeenInstructions) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('christmas-tree-instructions-seen', 'true');
    setShow(false);
    onDismiss();
  };

  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="glass-gold rounded-2xl p-8 max-w-md mx-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>

        <h2 className="text-2xl font-display font-bold text-christmas-gold mb-6 text-center">
          🎄 Welcome to the Magic Tree
        </h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-christmas-green/20">
              <Grab className="w-6 h-6 text-christmas-green" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Make a Fist</h3>
              <p className="text-sm text-muted-foreground">
                Particles assemble into a Christmas tree
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-christmas-gold/20">
              <Hand className="w-6 h-6 text-christmas-gold" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Open Your Palm</h3>
              <p className="text-sm text-muted-foreground">
                Tree explodes into a galaxy of particles
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-christmas-red/20">
              <MousePointer className="w-6 h-6 text-christmas-red" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Pinch Gesture</h3>
              <p className="text-sm text-muted-foreground">
                Select and enlarge a photo card
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted/30">
              <Move className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Move Your Hand</h3>
              <p className="text-sm text-muted-foreground">
                Orbit around the scene in galaxy mode
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-4">
            No camera? Double-click to toggle modes, drag to orbit!
          </p>
          
          <Button
            onClick={handleDismiss}
            className="w-full bg-christmas-gold hover:bg-christmas-gold/90 text-christmas-deep-blue font-semibold"
          >
            Let's Go! ✨
          </Button>
        </div>
      </div>
    </div>
  );
}
