import { authed } from '@/lib/api/route'
import { disableDeviceInstallation, registerDeviceInstallation } from '@/lib/push'

export const POST = authed(async (stakeholder, _params, request) =>
  registerDeviceInstallation(stakeholder.id, await request.json()))

export const DELETE = authed(async (stakeholder, _params, request) => {
  await disableDeviceInstallation(stakeholder.id, await request.json())
  return { ok: true }
})
