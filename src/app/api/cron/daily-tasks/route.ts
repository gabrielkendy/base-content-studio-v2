/**
 * GET/POST /api/cron/daily-tasks
 *
 * Cron consolidado pra ficar dentro do limite Hobby da Vercel (2 crons/projeto).
 * Roda 1x por dia e dispara internamente:
 *   1) /api/posts/process-scheduled  — publica posts agendados que venceram
 *   2) /api/cron/trial-reminders     — notifica trials expirando/expirados
 *
 * Cada sub-job continua com seu próprio endpoint disponível pra trigger
 * manual via n8n/curl (com CRON_SECRET).
 *
 * Se um sub-job falhar, o outro ainda roda. Erros são reportados na resposta
 * mas não causam HTTP 500 (cron deve sempre retornar 200 pra Vercel não
 * marcar como falho).
 */
import { NextRequest, NextResponse } from 'next/server'

interface SubJobResult {
  job: string
  ok: boolean
  status?: number
  error?: string
  data?: unknown
  duration_ms: number
}

async function runSubJob(
  baseUrl: string,
  path: string,
  cronSecret: string,
  jobName: string,
): Promise<SubJobResult> {
  const start = Date.now()
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
      // Cron sub-job não pode timeout muito longo — Vercel function tem limite
      signal: AbortSignal.timeout(50_000),
    })
    const duration_ms = Date.now() - start
    let data: unknown
    try {
      data = await res.json()
    } catch {
      data = { raw: await res.text() }
    }
    return {
      job: jobName,
      ok: res.ok,
      status: res.status,
      data,
      duration_ms,
    }
  } catch (err: any) {
    return {
      job: jobName,
      ok: false,
      error: err?.message || String(err),
      duration_ms: Date.now() - start,
    }
  }
}

async function handler(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET
  if (!CRON_SECRET) {
    console.error('[cron/daily-tasks] CRON_SECRET not set')
    return NextResponse.json(
      { error: 'Server misconfigured: CRON_SECRET not set' },
      { status: 500 },
    )
  }

  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const isAuthorized = authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // baseUrl = host atual; em produção é app.agenciabase.tech, em dev é localhost
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host') || 'app.agenciabase.tech'
  const baseUrl = `${proto}://${host}`

  // Roda em paralelo. Se um falhar, o outro continua.
  const results = await Promise.all([
    runSubJob(baseUrl, '/api/posts/process-scheduled', CRON_SECRET, 'process-scheduled'),
    runSubJob(baseUrl, '/api/cron/trial-reminders', CRON_SECRET, 'trial-reminders'),
  ])

  const allOk = results.every(r => r.ok)
  const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0)

  console.log(
    `[cron/daily-tasks] ${allOk ? 'OK' : 'PARTIAL FAILURE'} — total=${totalDuration}ms`,
    JSON.stringify(results.map(r => ({ job: r.job, ok: r.ok, status: r.status, duration_ms: r.duration_ms }))),
  )

  return NextResponse.json({
    success: allOk,
    ran_at: new Date().toISOString(),
    total_duration_ms: totalDuration,
    sub_jobs: results,
  })
}

export const GET = handler
export const POST = handler
