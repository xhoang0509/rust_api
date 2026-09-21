import type { ReactionType } from '../../types';

export interface ReactionConfig {
  type: ReactionType;
  label: string;
  emoji: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export const REACTION_CONFIG: Record<ReactionType, ReactionConfig> = {
  like: {
    type: 'like',
    label: 'Like',
    emoji: '👍',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  love: {
    type: 'love',
    label: 'Love',
    emoji: '❤️',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  haha: {
    type: 'haha',
    label: 'Haha',
    emoji: '😆',
    textColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  wow: {
    type: 'wow',
    label: 'Wow',
    emoji: '😮',
    textColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  sad: {
    type: 'sad',
    label: 'Sad',
    emoji: '😢',
    textColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  angry: {
    type: 'angry',
    label: 'Angry',
    emoji: '😡',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
};

export const REACTION_ORDER: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
