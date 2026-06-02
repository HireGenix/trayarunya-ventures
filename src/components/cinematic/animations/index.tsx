'use client';

import React from 'react';
import AIBrainAnimation from './AIBrainAnimation';
import LeadFilterAnimation from './LeadFilterAnimation';
import OutreachAnimation from './OutreachAnimation';
import ContentCreationAnimation from './ContentCreationAnimation';
import ContentPostingAnimation from './ContentPostingAnimation';
import AdsAnimation from './AdsAnimation';

export {
  AIBrainAnimation,
  LeadFilterAnimation,
  OutreachAnimation,
  ContentCreationAnimation,
  ContentPostingAnimation,
  AdsAnimation,
};

/** Maps a stage's `animation` key (from growthEngine data) to its component. */
export const stageAnimations: Record<string, React.ComponentType> = {
  leadFilter: LeadFilterAnimation,
  outreach: OutreachAnimation,
  contentCreation: ContentCreationAnimation,
  contentPosting: ContentPostingAnimation,
  ads: AdsAnimation,
};

/** Renders the animation for a given stage key, or null if unknown. */
export const StageAnimation = ({ name }: { name: string }) => {
  const Cmp = stageAnimations[name];
  return Cmp ? <Cmp /> : null;
};
