import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import {
  getAgencyBranding,
  getBranding,
  removeAgencyBrandingLogo,
  removeBrandingLogo,
  saveAgencyBranding,
  saveAgencyBrandingLogo,
  saveBranding,
  saveBrandingLogo,
} from '@/lib/branding'
import { CAPTURE_BUCKET, serviceClient } from '@/lib/storage'

afterAll(async () => {
  await db.agency.deleteMany({ where: { name: { startsWith: 'Branding ' } } })
  await db.stakeholder.deleteMany({ where: { name: { startsWith: 'Branding ' } } })
  await db.$disconnect()
})

describe('team branding', () => {
  it('is shared by the team, editable by managers, and hidden from unrelated agents', async () => {
    const [owner, member, outsider] = await Promise.all([
      db.stakeholder.create({ data: { name: 'Branding owner' } }),
      db.stakeholder.create({ data: { name: 'Branding member' } }),
      db.stakeholder.create({ data: { name: 'Branding outsider' } }),
    ])
    const agency = await db.agency.create({
      data: {
        name: 'Branding Harbour Team',
        members: { create: [
          { stakeholderId: owner.id, role: 'OWNER', status: 'ACTIVE' },
          { stakeholderId: member.id, role: 'AGENT', status: 'ACTIVE' },
        ] },
      },
    })

    expect(await saveAgencyBranding(agency.id, owner.id, {
      agencyLicence: ' L3010000A ', phone: ' 6123 4567 ',
    })).toMatchObject({
      agencyName: 'Branding Harbour Team',
      agencyLicence: 'L3010000A',
      phone: '6123 4567',
    })
    await expect(getAgencyBranding(agency.id, member.id)).resolves.toMatchObject({
      agencyLicence: 'L3010000A',
    })
    await expect(saveAgencyBranding(agency.id, member.id, {})).rejects.toThrow('Team not found')
    await expect(getAgencyBranding(agency.id, outsider.id)).rejects.toThrow('Team not found')

    const png = new Uint8Array(readFileSync('public/icon-192.png'))
    expect((await saveAgencyBrandingLogo(agency.id, owner.id, png)).logoUrl)
      .toMatch(/agency-branding%2F|agency-branding\//)
    expect((await removeAgencyBrandingLogo(agency.id, owner.id)).logoUrl).toBeNull()
  })
})

describe('agent branding', () => {
  it('accepts a real raster logo only after the agency is named, and can remove it', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Branding agent' } })
    const png = new Uint8Array(readFileSync('public/icon-192.png'))

    await expect(saveBrandingLogo(agent.id, png)).rejects.toThrow('Save your agency name')
    await expect(saveBranding(agent.id, { agencyName: '  ' })).rejects.toThrow()
    expect(await saveBranding(agent.id, {
      agencyName: 'Harbourline Realty Pte Ltd', agencyLicence: '', ceaRegistration: 'R061234B',
    })).toMatchObject({ agencyName: 'Harbourline Realty Pte Ltd', agencyLicence: null, logoUrl: null })

    // Named as an image, but the bytes are not one.
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    await expect(saveBrandingLogo(agent.id, svg)).rejects.toThrow('Unsupported logo')
    await expect(saveBrandingLogo(agent.id, new Uint8Array(1_000_001).fill(0x89)))
      .rejects.toThrow('Unsupported logo')

    expect((await saveBrandingLogo(agent.id, png))?.logoUrl).toMatch(/branding%2F|branding\//)
    expect((await removeBrandingLogo(agent.id))?.logoUrl).toBeNull()
    expect(await getBranding(agent.id)).toMatchObject({ ceaRegistration: 'R061234B' })
  })

  it('stores any accepted logo as PNG, since the PDF draws only PNG and JPEG', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Branding webp agent' } })
    await saveBranding(agent.id, { agencyName: 'Example Realty' })

    const webp = await sharp({ create: { width: 200, height: 60, channels: 4, background: '#16a34a' } }).webp().toBuffer()
    await saveBrandingLogo(agent.id, webp)
    const { data } = await serviceClient().storage.from(CAPTURE_BUCKET).download(`branding/${agent.id}/logo`)
    expect(Array.from(new Uint8Array(await data!.arrayBuffer()).slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])

    // The right signature with nothing readable behind it: a truncated upload.
    const truncated = (await sharp({ create: { width: 50, height: 50, channels: 3, background: '#000' } }).png().toBuffer()).subarray(0, 40)
    await expect(saveBrandingLogo(agent.id, truncated)).rejects.toThrow(/^Unsupported logo/)
    await removeBrandingLogo(agent.id)
  })

  it('lets the agent set the name printed on their reports', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Branding renamed agent' } })
    await saveBranding(agent.id, { agentName: '  Alaric Yeo ', agencyName: 'Example Realty' })
    expect((await db.stakeholder.findUniqueOrThrow({ where: { id: agent.id } })).name).toBe('Alaric Yeo')
    await db.stakeholder.update({ where: { id: agent.id }, data: { name: 'Branding renamed agent' } })
  })
})
