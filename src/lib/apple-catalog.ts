export const APPLE_BUNDLE_ID = 'one.kivilo.kivilo'
export const APPLE_APP_ID = 6821514302

// Two subscription groups let an Apple account own Personal and one team's plan.
// Team tiers share a group so seat changes replace, rather than stack, subscriptions.
// Prices live in App Store Connect; the client always displays StoreKit's price.
export const APPLE_PRODUCTS = [
  { productId: 'kivilo_pro_monthly', seats: 1, kind: 'personal' as const },
  ...Array.from({ length: 20 }, (_, index) => ({
    productId: `kivilo_pro_team_${index + 1}_monthly`, seats: index + 1, kind: 'team' as const,
  })),
]
