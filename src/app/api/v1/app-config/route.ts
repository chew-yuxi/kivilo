export const dynamic = 'force-dynamic'

/// Read by the native app at launch to learn whether its build has been retired. Public,
/// because the sign-in screen sits behind the same wall, and it says nothing about anyone.
///
/// Each floor comes from the environment, so an old build can be retired without shipping
/// anything to it. Unset is 0, which retires nothing. Raise a floor only once the newer
/// build is live in that store, or the wall sends people to a page with nothing newer on it.
export function GET() {
  return Response.json({
    ios: {
      minBuild: Number(process.env.KIVILO_MIN_BUILD_IOS) || 0,
      storeUrl: 'https://apps.apple.com/app/id6821514302',
    },
    android: {
      minBuild: Number(process.env.KIVILO_MIN_BUILD_ANDROID) || 0,
      storeUrl: 'https://play.google.com/store/apps/details?id=one.kivilo.kivilo',
    },
  })
}
