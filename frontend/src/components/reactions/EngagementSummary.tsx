import React from 'react';
import type { ReactionBreakdown } from '../../types';
import { REACTION_CONFIG, REACTION_ORDER } from './constants';

interface EngagementSummaryProps {
  totalReactions: number;
  breakdown?: ReactionBreakdown;
  totalComments: number;
  onToggleComments: () => void;
  isCommentsOpen?: boolean;
}

export const EngagementSummary: React.FC<EngagementSummaryProps> = ({
  totalReactions,
  breakdown,
  totalComments,
  onToggleComments,
  isCommentsOpen = false,
}) => {
  if (totalReactions === 0 && totalComments === 0) {
    return null;
  }

  // Determine top reaction emojis to show
  let topEmojis: string[] = [];
  if (breakdown) {
    topEmojis = REACTION_ORDER
      .filter((type) => breakdown[type] > 0)
      .sort((a, b) => breakdown[b] - breakdown[a])
      .slice(0, 3)
      .map((type) => REACTION_CONFIG[type].emoji);
  }

  if (topEmojis.length === 0 && totalReactions > 0) {
    topEmojis = ['👍'];
  }

  const formatCommentCount = (count: number) => {
    if (count === 1) return '1 comment';
    return `${count} comments`;
  };

  return (
    <div className="flex items-center justify-between py-2 px-1 text-xs text-gray-500 border-b border-gray-100 mb-2">
      {/* Reactions side */}
      <div className="flex items-center gap-1.5 min-h-[22px]">
        {totalReactions > 0 && (
          <>
            <div className="flex items-center -space-x-1">
              {topEmojis.map((emoji, index) => (
                <span
                  key={index}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-50 border border-white shadow-xs text-xs select-none"
                  style={{ zIndex: 10 - index }}
                >
                  {emoji}
                </span>
              ))}
            </div>
            <span className="font-medium text-gray-600 ml-0.5">{totalReactions}</span>
          </>
        )}
      </div>

      {/* Comments side */}
      <div>
        {totalComments > 0 && (
          <button
            type="button"
            onClick={onToggleComments}
            className={`hover:underline hover:text-gray-700 cursor-pointer font-medium ${
              isCommentsOpen ? 'text-blue-600 underline' : ''
            }`}
          >
            {formatCommentCount(totalComments)}
          </button>
        )}
      </div>
    </div>
  );
};
