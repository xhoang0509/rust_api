import React, { useState, useEffect, useRef } from 'react';
import type { ReactionType } from '../../types';
import { REACTION_CONFIG, REACTION_ORDER } from './constants';

interface ReactionPopoverProps {
  isOpen: boolean;
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
  currentReaction?: ReactionType | null;
}

export const ReactionPopover: React.FC<ReactionPopoverProps> = ({
  isOpen,
  onSelect,
  onClose,
  currentReaction,
}) => {
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setHoveredReaction(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="toolbar"
      aria-label="Reactions"
      className="absolute bottom-full left-0 mb-2.5 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {REACTION_ORDER.map((type) => {
        const config = REACTION_CONFIG[type];
        const isSelected = currentReaction === type;
        const isHovered = hoveredReaction === type;

        return (
          <div key={type} className="relative flex flex-col items-center">
            {/* Tooltip */}
            {isHovered && (
              <span
                role="tooltip"
                className="absolute -top-7 px-2 py-0.5 text-[11px] font-medium text-white bg-gray-900 rounded-full shadow-md whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-100"
              >
                {config.label}
              </span>
            )}

            <button
              type="button"
              onClick={() => onSelect(type)}
              onMouseEnter={() => setHoveredReaction(type)}
              onMouseLeave={() => setHoveredReaction(null)}
              onFocus={() => setHoveredReaction(type)}
              onBlur={() => setHoveredReaction(null)}
              className={`text-2xl p-1.5 rounded-full transition-all duration-150 transform hover:scale-135 active:scale-95 focus:outline-hidden cursor-pointer ${
                isSelected ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-100'
              }`}
              aria-label={config.label}
              title={config.label}
            >
              <span className="block leading-none select-none">{config.emoji}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
