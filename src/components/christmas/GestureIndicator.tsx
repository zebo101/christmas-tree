import { GestureType } from '@/types/christmas';
import { Hand, Grab, Circle, MousePointer } from 'lucide-react';

interface GestureIndicatorProps {
  gesture: GestureType;
  isTracking: boolean;
  usingMouse: boolean;
}

const gestureIcons: Record<GestureType, React.ReactNode> = {
  none: <Circle className="w-5 h-5" />,
  fist: <Grab className="w-5 h-5" />,
  open: <Hand className="w-5 h-5" />,
  pinch: <MousePointer className="w-5 h-5" />,
  pointing: <MousePointer className="w-5 h-5" />,
};

const gestureLabels: Record<GestureType, string> = {
  none: 'Detecting...',
  fist: 'Fist - Tree Mode',
  open: 'Open Palm - Galaxy',
  pinch: 'Pinch - Select',
  pointing: 'Pointing',
};

export function GestureIndicator({ gesture, isTracking, usingMouse }: GestureIndicatorProps) {
  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="glass-gold rounded-xl px-4 py-3 flex items-center gap-3 text-foreground">
        <div className={`
          p-2 rounded-lg 
          ${isTracking 
            ? 'bg-christmas-green/30 text-christmas-snow' 
            : 'bg-muted/50 text-muted-foreground'
          }
          transition-colors duration-300
        `}>
          {usingMouse ? <MousePointer className="w-5 h-5" /> : gestureIcons[gesture]}
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {usingMouse ? 'Mouse Control' : isTracking ? 'Hand Detected' : 'No Hand'}
          </span>
          <span className="text-sm font-medium">
            {usingMouse ? 'Double-click to toggle' : gestureLabels[gesture]}
          </span>
        </div>
        
        {isTracking && (
          <div className="w-2 h-2 rounded-full bg-christmas-green animate-pulse ml-2" />
        )}
      </div>
    </div>
  );
}
