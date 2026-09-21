import React from 'react';
import { Tooltip } from 'antd';
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

  const breakdownTooltip = breakdown ? (
    <div className="space-y-1 text-xs">
      {REACTION_ORDER.map((type) => {
        const count = breakdown[type];
        if (count <= 0) return null;
        const config = REACTION_CONFIG[type];
        return (
          <div key={type} className="flex items-center justify-between gap-3">
            <span>
              {config.emoji} {config.label}
            </span>
            <span className="font-bold">{count}</span>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="flex items-center justify-between py-2 px-1 text-xs text-gray-500 border-b border-gray-100 mb-1">
      {/* Reactions side */}
      <div className="flex items-center gap-1.5 min-h-[22px]">
        {totalReactions > 0 && (
          <Tooltip title={breakdownTooltip} placement="topLeft">
            <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
              <div className="flex items-center -space-x-1">
                {topEmojis.map((emoji, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border border-gray-200 shadow-2xs text-xs select-none"
                    style={{ zIndex: 10 - index }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <span className="font-medium text-gray-700 ml-0.5">{totalReactions}</span>
            </div>
          </Tooltip>
        )}
      </div>

      {/* Comments side */}
      <div>
        {totalComments > 0 && (
          <button
            type="button"
            onClick={onToggleComments}
            className={`hover:underline hover:text-gray-800 cursor-pointer font-medium ${
              isCommentsOpen ? 'text-blue-600 font-semibold' : ''
            }`}
          >
            {totalComments} bình luận
          </button>
        )}
      </div>
    </div>
  );
};
