import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createClient } from '@supabase/supabase-js'
import { SECTION_KEYS } from './src/lib/sections.js' // 7섹션 키 SSOT (드리프트 방지)

const STATUSES = ['완료', '진행중']
const MAX_BODY = 1_000_000 // 1MB

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) { const e = new Error('요청 본문이 너무 큽니다.'); e.statusCode = 413; reject(e); req.destroy(); return }
      else chunks.push(c)
    })
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}) }
      catch { reject(new Error('JSON 파싱 실패')) }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, obj) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(obj))
}

function validateAndBuildRow(payload) {
  const errors = []
  const { title, summary, status, activity_date, end_date,
          tech_stack, demo_url, repo_url, sections } = payload ?? {}

  if (!title?.trim()) errors.push('title(제목)은 필수입니다.')
  if (!summary?.trim()) errors.push('summary(한 줄 요약)는 필수입니다.')
  if (!activity_date) errors.push('activity_date(활동 시작일)는 필수입니다.')
  if (status && !STATUSES.includes(status)) errors.push(`status는 ${STATUSES.join('/')} 중 하나여야 합니다.`)
  // 완료 프로젝트는 기간이 명확해야 함(상세의 단일 월 표기 방지). 단발성이면 시작=종료로.
  const effectiveStatus = status || '완료'
  if (effectiveStatus === '완료' && !end_date) errors.push('완료 프로젝트는 end_date(종료일)가 필요합니다.')

  const cleanSections = {}
  if (sections == null || typeof sections !== 'object' || Array.isArray(sections)) {
    errors.push('sections(7섹션 객체)가 필요합니다.')
  } else {
    for (const key of SECTION_KEYS) {
      const v = sections[key]
      if (v != null && typeof v !== 'string') errors.push(`sections.${key}는 문자열이어야 합니다.`)
      cleanSections[key] = (v ?? '').toString()
    }
    if (!cleanSections.intro?.trim()) errors.push('sections.intro(01 프로젝트 소개)는 필수입니다.')
  }

  // 링크는 http(s)만 허용(javascript:/data: 등 차단)
  const httpOk = (u) => !u || /^https?:\/\//i.test(String(u).trim())
  if (!httpOk(demo_url)) errors.push('demo_url은 http(s) URL이어야 합니다.')
  if (!httpOk(repo_url)) errors.push('repo_url은 http(s) URL이어야 합니다.')

  if (errors.length) { const e = new Error('검증 실패'); e.details = errors; throw e }

  // '진행중'이면 end_date 무시(NULL) — status/end_date 모순 방지
  const safeEnd = status === '진행중' ? null : (end_date || null)
  return {
    title: title.trim(),
    summary: summary.trim(),
    sections: cleanSections,
    content: cleanSections.intro.trim() || summary.trim(), // content NOT NULL 잔존 환경 안전용
    activity_date,
    end_date: safeEnd,
    category: '프로젝트', // 폼은 프로젝트 전용
    tech_stack: Array.isArray(tech_stack)
      ? [...new Set(tech_stack.map((t) => String(t).trim()).filter(Boolean))]
      : [],
    demo_url: demo_url?.trim() || null,
    repo_url: repo_url?.trim() || null,
    status: status || '완료',
  }
}

// dev 서버 전용 쓰기 API. service_role 키는 이 Node 컨텍스트에서만 참조(클라이언트 번들 미포함).
function localWriteApi(env) {
  const url = env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const devToken = env.VITE_DEV_WRITE_TOKEN
  return {
    name: 'local-write-api',
    apply: 'serve', // dev(serve)에서만 적용. build/preview/배포엔 없음
    configureServer(server) {
      server.middlewares.use('/api/posts', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        // (a) 소켓이 루프백인지 1차 판정 (Host 헤더는 위조 가능)
        const remote = req.socket?.remoteAddress || ''
        const isLoopback = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
        if (!isLoopback)
          return sendJson(res, 403, { error: '로컬 연결에서만 허용됩니다.' })
        // (a) Host 화이트리스트(방어 심화)
        const host = (req.headers.host || '').split(':')[0]
        if (host !== 'localhost' && host !== '127.0.0.1')
          return sendJson(res, 403, { error: '로컬 호스트에서만 허용됩니다.' })
        // (a) Origin 동일 출처
        const origin = req.headers.origin
        if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1):5191$/.test(origin))
          return sendJson(res, 403, { error: '허용되지 않은 Origin.' })
        // (b) 커스텀 헤더 토큰 → cross-origin simple POST 차단(CSRF 방어)
        if (!devToken || req.headers['x-dev-token'] !== devToken)
          return sendJson(res, 403, { error: 'X-Dev-Token 불일치.' })
        if (!serviceKey || !url)
          return sendJson(res, 500, {
            error: '로컬 쓰기 비활성: .env.local에 SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_URL / VITE_DEV_WRITE_TOKEN 설정 필요.',
          })
        try {
          const row = validateAndBuildRow(await readJsonBody(req))
          const admin = createClient(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
          const { data, error } = await admin.from('posts').insert(row).select().single()
          if (error) return sendJson(res, 500, { error: `저장 실패: ${error.message}` })
          return sendJson(res, 201, { post: data })
        } catch (e) {
          const code = e.statusCode || (e.details ? 400 : 500)
          return sendJson(res, code, { error: e.message, details: e.details ?? null })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' = 모든 env 로드(비-VITE_ 포함). 이 객체는 플러그인 클로저에서만 사용 — define으로 절대 넘기지 말 것.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localWriteApi(env)],
    server: {
      port: 5191,
      strictPort: true, // 포트 충돌 시 조용히 옮기지 말고 명확히 실패
    },
  }
})
