import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { JWT } from 'google-auth-library'
import { GOOGLE_PLAY_BASE_PLAN_ID, GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_PRODUCTS } from '@/lib/google-play-catalog'

// Use an operator credential for catalog setup, never the deployed runtime key.
// Default is read-only. Draft creation and activation are separate explicit steps.
const mode = process.argv.includes('--create-drafts') ? 'create' : process.argv.includes('--activate') ? 'activate' : 'audit'
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PLAY_PACKAGE_NAME}/subscriptions`

type Product = {
  productId: string
  basePlans?: Array<{
    basePlanId: string; state: string
    autoRenewingBasePlanType?: { billingPeriodDuration: string; resubscribeState?: string }
    regionalConfigs?: Array<{ regionCode: string; newSubscriberAvailability: boolean; price?: { currencyCode: string; units: string; nanos?: number } }>
  }>
}

function verify(product: Product, seats: number) {
  const plan = product.basePlans?.find((value) => value.basePlanId === GOOGLE_PLAY_BASE_PLAN_ID)
  const region = plan?.regionalConfigs?.find((value) => value.regionCode === 'SG')
  if (product.basePlans?.length !== 1 || plan?.autoRenewingBasePlanType?.billingPeriodDuration !== 'P1M' ||
      plan.autoRenewingBasePlanType.resubscribeState !== 'RESUBSCRIBE_STATE_INACTIVE' ||
      !region?.newSubscriberAvailability || region.price?.currencyCode !== 'SGD' ||
      Number(region.price.units) !== 39 * seats || (region.price.nanos ?? 0) !== 0 ||
      plan.regionalConfigs?.some((value) => value.regionCode !== 'SG' && value.newSubscriberAvailability)) {
    throw new Error(`${product.productId}: catalog differs from the reviewed monthly Singapore plan; review in Play Console`)
  }
  return plan.state
}

async function main() {
  const file = process.env.GOOGLE_PLAY_SETUP_CREDENTIALS
  if (!file) throw new Error('Set GOOGLE_PLAY_SETUP_CREDENTIALS to the operator service-account JSON file path')
  const credential = JSON.parse(await readFile(file, 'utf8'))
  if (credential.type !== 'service_account' || !credential.client_email || !credential.private_key) {
    throw new Error('Expected a service-account credential file')
  }
  const client = new JWT({ email: credential.client_email, key: credential.private_key, scopes: ['https://www.googleapis.com/auth/androidpublisher'] })
  const all: Product[] = []
  let pageToken: string | undefined
  do {
    const response = await client.request<{ subscriptions?: Product[]; nextPageToken?: string }>({ url: base, params: { pageSize: 100, ...(pageToken ? { pageToken } : {}) } })
    // Google's empty list response can be 204 with no JSON body.
    if (response.status !== 204) all.push(...(response.data.subscriptions ?? []))
    pageToken = response.status === 204 ? undefined : response.data.nextPageToken
  } while (pageToken)
  for (const catalog of GOOGLE_PLAY_PRODUCTS) {
    let product = all.find((value) => value.productId === catalog.productId)
    if (!product && mode === 'create') {
      const response = await client.request<Product>({
        url: base, method: 'POST', params: { productId: catalog.productId, 'regionsVersion.version': '2022/02' },
        data: {
          packageName: GOOGLE_PLAY_PACKAGE_NAME, productId: catalog.productId,
          listings: [{ languageCode: 'en-US',
            title: catalog.kind === 'personal' ? 'Kivilo Pro' : `Kivilo Pro Team (${catalog.seats} ${catalog.seats === 1 ? 'seat' : 'seats'})`,
            description: catalog.kind === 'personal'
              ? 'A monthly Kivilo Pro subscription for your personal workspace.'
              : `A monthly Kivilo Pro subscription for one team, with ${catalog.seats} ${catalog.seats === 1 ? 'seat' : 'seats'}.`,
            benefits: [`${25 * catalog.seats} active properties`, ...(catalog.kind === 'team' ? ['Shared property allowance for your team'] : [])],
          }],
          basePlans: [{ basePlanId: GOOGLE_PLAY_BASE_PLAN_ID,
            autoRenewingBasePlanType: {
              billingPeriodDuration: 'P1M', gracePeriodDuration: 'P7D', accountHoldDuration: 'P30D',
              // A new purchase needs an authenticated Kivilo workspace binding.
              resubscribeState: 'RESUBSCRIBE_STATE_INACTIVE',
            },
            regionalConfigs: [{ regionCode: 'SG', newSubscriberAvailability: true,
              price: { currencyCode: 'SGD', units: String(39 * catalog.seats), nanos: 0 } }],
          }],
        },
      })
      product = response.data
    }
    if (!product) {
      console.log(`${catalog.productId}: missing`)
      process.exitCode = 1
      continue
    }
    let state = verify(product, catalog.seats)
    if (mode === 'activate' && state !== 'ACTIVE') {
      const response = await client.request<Product>({ url: `${base}/${catalog.productId}/basePlans/${GOOGLE_PLAY_BASE_PLAN_ID}:activate`, method: 'POST', data: {} })
      state = verify(response.data, catalog.seats)
      if (state !== 'ACTIVE') throw new Error(`${catalog.productId}: activation was not confirmed`)
    }
    console.log(`${catalog.productId}: ${state}, SGD ${39 * catalog.seats}/month, ${25 * catalog.seats} active properties`)
  }
}

main().catch((error) => {
  // SDK errors include request credentials. Print only the HTTP status and the
  // provider's enum, or our own errors which contain catalog identifiers only.
  if (error.response || error.config) {
    console.error(`Google Play catalog request failed: HTTP ${error.response?.status ?? 'unknown'} (${error.response?.data?.error?.status ?? 'request_error'}). Check app permissions and payments-profile setup in Play Console.`)
  } else {
    console.error(error instanceof Error ? error.message : 'Google Play catalog setup failed')
  }
  process.exitCode = 1
})
