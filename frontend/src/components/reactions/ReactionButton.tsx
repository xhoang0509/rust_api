import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactionType } from '../../types';
import { REACTION_CONFIG } from './constants';
import { ReactionPopover } from './ReactionPopover';

interface ReactionButtonProps {
  userReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  onRemoveReaction: () => void;
  disabled?: boolean;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  userReaction,
  onReact,
  onRemoveReaction,
  disabled = false,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    hoverTimerRef.current = setTimeout(() => {
      setShowPopover(true);
    }, 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => {
      setShowPopover(false);
    }, 300);
  };

  const handleClick = () => {
    if (disabled) return;
    if (showPopover) {
      setShowPopover(false);
    }
    if (userReaction) {
      onRemoveReaction();
    } else {
      onReact('like');
    }
  };

  const handleSelectReaction = useCallback(
    (type: ReactionType) => {
      setShowPopover(false);
      if (userReaction === type) {
        onRemoveReaction();
      } else {
        onReact(type);
      }
    },
    [userReaction, onReact, onRemoveReaction]
  );

  const activeConfig = userReaction ? REACTION_CONFIG[userReaction] : null;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ReactionPopover
        isOpen={showPopover}
        onSelect={handleSelectReaction}
        onClose={() => setShowPopover(false)}
        currentReaction={userReaction}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          activeConfig
            ? `${activeConfig.textColor} font-semibold hover:bg-gray-100`
            : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100 font-medium'
        }`}
        aria-label={activeConfig ? `Reacted ${activeConfig.label}` : 'Like post'}
      >
        <span className="text-base leading-none select-none">
          {activeConfig ? activeConfig.emoji : '👍'}
        </span>
        <span>{activeConfig ? activeConfig.label : 'Like'}</span>
      </button>
    </div>
  );
};
