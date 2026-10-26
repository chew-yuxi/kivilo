export const GOOGLE_PLAY_PACKAGE_NAME = 'one.kivilo.kivilo'
export const GOOGLE_PLAY_BASE_PLAN_ID = 'monthly'

// Different seat counts grant different entitlements, so each is a subscription
// product. A base plan represents its billing period, not its property allowance.
export const GOOGLE_PLAY_PRODUCTS = [
  { productId: 'kivilo_pro', seats: 1, kind: 'personal' as const, basePlanId: GOOGLE_PLAY_BASE_PLAN_ID },
  ...Array.from({ length: 20 }, (_, index) => ({
    productId: `kivilo_pro_team_${index + 1}`,
    seats: index + 1,
    kind: 'team' as const,
    basePlanId: GOOGLE_PLAY_BASE_PLAN_ID,
  })),
] as const
