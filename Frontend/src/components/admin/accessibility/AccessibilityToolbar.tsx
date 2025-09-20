import React from 'react';
import { Button } from '../../ui/button';
import { useHighContrast } from '../../../hooks/useAccessibility';
import { Contrast, Type, Volume2 } from 'lucide-react';

interface AccessibilityToolbarProps {
  className?: string;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  className = '',
}) => {
  const { isHighContrast, toggleHighContrast } = useHighContrast();

  const increaseFontSize = () => {
    const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    document.documentElement.style.fontSize = `${Math.min(currentSize + 2, 24)}px`;
  };

  const decreaseFontSize = () => {
    const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    document.documentElement.style.fontSize = `${Math.max(currentSize - 2, 12)}px`;
  };

  const resetFontSize = () => {
    document.documentElement.style.fontSize = '';
  };

  return (
    <div
      className={`flex items-center space-x-2 p-2 bg-gray-50 border-b ${className}`}
      role="toolbar"
      aria-label="Accessibility tools"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={toggleHighContrast}
        aria-pressed={isHighContrast}
        aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
        className="flex items-center space-x-1"
      >
        <Contrast className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isHighContrast ? 'Normal' : 'High'} Contrast
        </span>
      </Button>

      <div className="flex items-center space-x-1" role="group" aria-label="Font size controls">
        <Button
          variant="outline"
          size="sm"
          onClick={decreaseFontSize}
          aria-label="Decrease font size"
          className="px-2"
        >
          <Type className="h-3 w-3" />
          <span className="text-xs">-</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetFontSize}
          aria-label="Reset font size"
          className="px-2"
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={increaseFontSize}
          aria-label="Increase font size"
          className="px-2"
        >
          <Type className="h-5 w-5" />
          <span className="text-xs">+</span>
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Screen reader announcement
          const announcement = new SpeechSynthesisUtterance(
            'Admin panel accessibility features are available. Use Tab to navigate, Enter to activate buttons, and Escape to close dialogs.'
          );
          speechSynthesis.speak(announcement);
        }}
        aria-label="Announce accessibility features"
        className="flex items-center space-x-1"
      >
        <Volume2 className="h-4 w-4" />
        <span className="hidden sm:inline">Help</span>
      </Button>
    </div>
  );
};

export default AccessibilityToolbar;