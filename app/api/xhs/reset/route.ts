import { NextRequest, NextResponse } from 'next/server'

const XHS_HTTP_URL = process.env.XHS_SCRAPER_URL?.replace(':8000', ':8001') ?? 'http://localhost:8001'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${XHS_HTTP_URL}/qr-reset?user_id=${encodeURIComponent(userId)}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
