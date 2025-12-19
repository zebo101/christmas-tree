import { useState, useEffect } from 'react';
import { Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CustomTextOverlayProps {
  isVisible: boolean;
  text: string;
  onTextChange: (text: string) => void;
}

export function CustomTextOverlay({ isVisible, text, onTextChange }: CustomTextOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(text);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Delay text appearance for dramatic effect
      const timer = setTimeout(() => setShowText(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowText(false);
    }
  }, [isVisible]);

  const handleSave = () => {
    onTextChange(inputValue);
    setIsOpen(false);
  };

  return (
    <>
      {/* Custom text display when star is focused */}
      <div 
        className={`fixed inset-0 flex items-start justify-center pointer-events-none z-20 pt-[23vh]`}
      >
        <div 
          className="text-center px-8 transition-all duration-[5000ms] ease-out"
          style={{
            opacity: showText ? 1 : 0,
            transform: showText 
              ? 'scale(1)' 
              : 'scale(0.3)',
          }}
        >
          <h1 
            className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-yellow-200 via-amber-100 to-yellow-300 bg-clip-text text-transparent"
            style={{
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {text}
          </h1>
        </div>
      </div>

      {/* Edit button in bottom right - moved up */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-16 right-4 z-30 bg-neutral-800/80 border-white/20 hover:bg-neutral-700/80 text-foreground"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-white/20">
          <DialogHeader>
            <DialogTitle className="text-foreground">自定义祝福语</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入你的祝福语..."
              className="bg-background/50 border-white/20 text-foreground placeholder:text-muted-foreground"
              maxLength={50}
            />
            <Button onClick={handleSave} className="w-full">
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
