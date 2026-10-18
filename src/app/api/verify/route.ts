import { NextResponse } from 'next/server'
import { verifyReportFile } from '@/lib/report-verification'

export const dynamic = 'force-dynamic'

/// Public, with no session: the caller proves nothing but that they hold the file.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { sha256?: unknown } | null
  const sha256 = body?.sha256
  if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
    return NextResponse.json({ error: 'sha256 must be 64 lowercase hex characters' }, { status: 400 })
  }
  const report = await verifyReportFile(sha256)
  return NextResponse.json(report ? { match: true, report } : { match: false })
}
