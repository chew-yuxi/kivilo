import { describe, expect, it } from 'vitest'
import { moveInDefectWindow, singaporeCalendarDate } from '@/lib/move-in-defect-window'

describe('move-in defect window', () => {
  it('counts Singapore calendar days inclusively across month and leap-year boundaries', () => {
    const tenancy = { startDate: new Date('2028-02-20T00:00:00Z'), defectWindowDays: 10 }
    const first = moveInDefectWindow(tenancy, new Date('2028-02-19T16:00:00Z'))
    expect(first.open).toBe(true)
    expect(singaporeCalendarDate(first.opensAt)).toBe('2028-02-20')
    expect(first.deadline?.toISOString()).toBe('2028-02-29T15:59:59.999Z')
    expect(moveInDefectWindow(tenancy, new Date('2028-02-29T15:59:59.999Z')).open).toBe(true)
    expect(moveInDefectWindow(tenancy, new Date('2028-02-29T16:00:00Z')).open).toBe(false)
    expect(moveInDefectWindow(tenancy, new Date('2028-02-19T15:59:59.999Z')).open).toBe(false)
  })

  it('uses the Singapore day of the start and supports disabling the window', () => {
    const startDate = new Date('2026-10-17T19:00:00Z')
    const first = moveInDefectWindow({ startDate, defectWindowDays: 1 }, new Date('2026-10-18T15:59:59Z'))
    expect(singaporeCalendarDate(first.opensAt)).toBe('2026-10-18')
    expect(first.deadline?.toISOString()).toBe('2026-10-18T15:59:59.999Z')
    expect(first.open).toBe(true)
    expect(moveInDefectWindow({ startDate, defectWindowDays: 0 }).deadline).toBeNull()
    expect(moveInDefectWindow({ startDate, defectWindowDays: 0 }).open).toBe(false)
  })
})
