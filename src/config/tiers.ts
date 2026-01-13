// Tier configuration - single source of truth
export const TIER_LIMITS = {
  free: {
    sessions_per_month: 3,
    llm_calls_per_month: 0,
    team_members: 1,
    organizations: 1,
    enhanced_speech: false,
    intelligent_detection: false,
    display_customization: false,
    ai_summaries: false,
    watermark: true,
    translations: ['KJV'],
  },
  pro: {
    sessions_per_month: Infinity,
    llm_calls_per_month: 500,
    team_members: 3,
    organizations: 1,
    enhanced_speech: true,
    intelligent_detection: true,
    display_customization: true,
    ai_summaries: true,
    watermark: false,
    translations: ['KJV', 'WEB', 'ASV'],
  },
  church: {
    sessions_per_month: Infinity,
    llm_calls_per_month: 2000,
    team_members: Infinity,
    organizations: 3,
    enhanced_speech: true,
    intelligent_detection: true,
    display_customization: true,
    ai_summaries: true,
    watermark: false,
    translations: ['KJV', 'WEB', 'ASV'],
  },
} as const;

export type TierName = keyof typeof TIER_LIMITS;

export function canAccessFeature(plan: TierName, feature: keyof typeof TIER_LIMITS.free): boolean {
  const tierConfig = TIER_LIMITS[plan];
  const value = tierConfig[feature];
  return typeof value === 'boolean' ? value : true;
}

export function getLimit(plan: TierName, limit: keyof typeof TIER_LIMITS.free): number {
  const tierConfig = TIER_LIMITS[plan];
  const value = tierConfig[limit];
  return typeof value === 'number' ? value : 0;
}
