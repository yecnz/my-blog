# 송연지 포트폴리오 블로그 재설계 — 구현 계획서

> 6개 분과 설계 + 검증 결과를 통합한 단일 실행 계획. 검증가가 지적한 **치명 모순 5건 / 보안 2건 / 누락 다수**를 모두 해소하는 결정을 본 문서가 확정한다. 본 문서의 결정이 분과 설계와 충돌할 경우 **본 문서가 우선**한다.

---

## 1. 개요 · 목표

### 1.1 전환 요약
| 항목 | 현재 (달력형) | 재설계 (카드 그리드형) |
|---|---|---|
| 메인 | 연도 탭 + 12칸 월 그리드 | 프로젝트 카드 그리드 (3/2/1열 반응형) |
| 본문 | `content` TEXT 자유 텍스트 | `sections` JSONB 7섹션 |
| 비프로젝트 활동 | 달력 셀에 혼재 | About 하단 "경험·활동" 리스트 |
| 자격증/기술 | 달력 셀(자격증) / 없음 | profile.js 고정값 → About |
| 쓰기 | Supabase 대시보드 수동 | dev 전용 미들웨어(service_role) |
| 배포본 쓰기 | 없음 | 없음(구조적 0) |

### 1.2 확정 결정(검증 모순 해소 — 본 문서가 못박음)

| 쟁점 | 분과 충돌 | **최종 결정** |
|---|---|---|
| **7섹션 키 (07번)** | `skills`/`competency`/`skill` 3종 | **`skills`** 단일. 객체 `{intro,overview,work,process,result,growth,skills}` |
| **sections 자료구조** | 객체 vs 배열 | **객체** `{key: value}`. 배열 분기 전부 제거 |
| **`src/lib/sections.js` API** | 3개 분과가 서로 다른 export | **단일 모듈**: `SECTION_SCHEMA` + `emptySections()` + `resolveSections()` (아래 §4.1 확정) |
| **비프로젝트 행 DELETE vs KEEP** | profile=삭제, 나머지=보존 | **KEEP(보존)**. 메인은 클라이언트에서 `category`로 분리. Experience는 DB행 표시 |
| **App.jsx fetch** | `.eq('프로젝트')` vs `.select('*')` | **`.select('*')` + 클라이언트 분리** (Experience가 동작하려면 필수) |
| **content NOT NULL** | 합성 vs 생략 | **3단계 순서 강제**(§2.3). 전환 완료 전엔 `content`를 `intro`로 합성 |
| **상세 컴포넌트** | PostModal 유지 vs PostDetail 신규 | **`PostModal.jsx` 내용만 교체**(파일명 유지, App import 불변) |
| **formatPeriod 위치** | period.js / dates.js / calendar.js | **`src/lib/dates.js`** 1곳 |
| **메인 섹션 헤더 CSS** | `.timeline*` 삭제 vs 재명명 | `.timeline*` **삭제**, `.projects*` 신설 |
| **PostCard 카테고리 배지** | 제거 vs 유지 | 메인 카드는 전부 프로젝트 → **배지 제거** |
| **카드 한 줄 소개 소스** | summary vs sections.intro | **`summary` 컬럼 유지**. 폼은 summary만 받고 intro와 분리 |

---

## 2. 최종 데이터 모델 & SQL DDL

### 2.1 최종 posts 스키마 (논리)

| 컬럼 | 타입 | 카드 | 상세 | 결정 |
|---|---|---|---|---|
| `id` | INT8 PK | key | key | 유지 |
| `title` | TEXT NOT NULL | O | O | 유지 |
| `summary` | TEXT NOT NULL | O(한 줄) | O | 유지 — 카드 소개 소스 |
| `sections` | **JSONB NOT NULL DEFAULT `'{}'`** | - | O(7섹션) | **신규** |
| `content` | TEXT (NOT NULL 해제 → 후속 DROP) | - | 레거시 폴백 | **폐기 진행** |
| `activity_date` | DATE NOT NULL | 정렬 | 기간 | 유지 |
| `end_date` | DATE | - | 기간 | 유지 |
| `category` | TEXT NOT NULL | - | 배지 | 유지 — 클라이언트 분리 키 |
| `tech_stack` | TEXT[] | O(칩) | O | 유지 |
| `demo_url`/`repo_url` | TEXT | - | O(버튼) | 유지 |
| `status` | TEXT NOT NULL | O(배지) | O | 유지 |
| `author`/`created_at` | — | - | - | 유지 |

`sections` JSONB 형태(객체로 확정):
```jsonc
{
  "intro":    "01 프로젝트 소개 — 서비스명/특징 + 한 줄 소개",
  "overview": "02 프로젝트 개요 — 배경·목적",
  "work":     "03 진행한 일 — 배경-문제-핵심-해결",
  "process":  "04 과정 — 직접 액션 + 인사이트",
  "result":   "05 결과물 — 최종 내용 + 포인트",
  "growth":   "06 성장한 점 — 성과 또는 배운점",
  "skills":   "07 나의 역량 — 느낀점+배운점+다짐"
}
```

### 2.2 파일 분리 (운영 사고 방지 — 검증 must_fix)

현 `supabase/schema.sql:8`의 `DROP TABLE IF EXISTS posts;`를 운영에서 실행하면 전 데이터 소실. **두 파일로 물리 분리.**

```
supabase/
  schema.sql                       # 신규 셋업 전용(DROP+CREATE+sections 포함). 실습/초기화용
  migrations/0001_add_sections.sql # 운영 마이그레이션 전용(ALTER+백필, DROP TABLE 없음)
```

#### `supabase/schema.sql` 변경 (신규 셋업용)
- `CREATE TABLE`에 `sections JSONB NOT NULL DEFAULT '{}'::jsonb` 추가.
- `content`를 `TEXT`(NOT NULL 제거)로 변경.
- INSERT를 `sections` 기반으로 갱신(프로젝트 3건 7섹션 채움, 비프로젝트 5건 보존 — `sections`는 `'{}'`).
- 상단 주석에 **"이 파일은 신규 셋업 전용. 운영 DB에는 절대 실행 금지. 운영은 migrations/0001 사용"** 명시.

#### `supabase/migrations/0001_add_sections.sql` (운영용, 신규)
```sql
-- =============================================================
-- 0001: sections JSONB 추가 + content NOT NULL 해제 + 프로젝트 백필
-- 운영 DB 전용. 비파괴(ALTER). DROP TABLE 없음.
-- Supabase SQL Editor에서 순서대로 실행.
-- =============================================================

-- (1) sections 컬럼 추가
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '{}'::jsonb;

-- (2) content NOT NULL 해제 (즉시 DROP 안 함 = 롤백 안전)
ALTER TABLE posts
  ALTER COLUMN content DROP NOT NULL;

-- (3) 프로젝트 3건 7섹션 백필 — 운영은 id 기준 권장(아래는 repo_url 매칭, 실행 전 id 확인).
--     ⚠ 운영 적용 시: SELECT id, title, repo_url FROM posts WHERE category='프로젝트';
--        로 id 확인 후 WHERE repo_url=... 를 WHERE id=<n> 으로 바꿔 실행할 것.
UPDATE posts SET sections = jsonb_build_object(
  'intro',    'MySave — 다시 읽지 않는 북마크 문제를 해결하는 리마인드 기반 북마크 관리 서비스.',
  'overview', '저장만 하고 다시 보지 않는 북마크가 쌓이는 문제를 해결하기 위해, 저장·메모·태그·리마인드·웹 대시보드를 제공하는 팀 프로젝트로 기획했습니다.',
  'work',     '배경: 북마크가 방치됨 / 문제: 재방문 동기 부재 / 핵심: 리마인드와 태그 기반 정리 / 해결: Chrome Extension + 웹 대시보드 연동 구현.',
  'process',  'Chrome Extension에서 Fetch API로 링크를 저장하고 대시보드와 데이터를 연동했습니다. 확장 프로그램과 웹 간 상태 공유 구조를 직접 설계했습니다.',
  'result',   'Chrome Extension 저장 기능, 메모/태그, 리마인드 알림, 웹 대시보드를 완성했습니다. 저장-회수의 전체 흐름을 한 서비스로 묶은 점이 핵심입니다.',
  'growth',   '확장 프로그램과 웹앱이 데이터를 주고받는 구조를 처음 구현하며 클라이언트 간 통신 흐름을 이해했습니다.',
  'skills',   '팀 협업과 기능 분담의 중요성을 느꼈고, Fetch 기반 데이터 연동을 배웠습니다. 사용자 동기를 설계에 반영하겠다고 다짐했습니다.'
) WHERE repo_url = 'https://github.com/MySave1/MySave-Final-Project';

UPDATE posts SET sections = jsonb_build_object(
  'intro',    'Tongkk — 요약·퀴즈·통계로 학습 흐름을 관리하는 AI 학습 서비스.',
  'overview', '학습 자료를 효율적으로 소화하고 진행 상황을 추적하기 위해, AI 요약·퀴즈 생성·학습 통계를 한 곳에서 제공하는 서비스를 만들었습니다.',
  'work',     '배경: 자료는 많고 정리는 어려움 / 문제: 학습 진행 파악 곤란 / 핵심: AI 요약·퀴즈 + 통계 / 해결: React+TypeScript로 학습 워크플로우 구현.',
  'process',  'TypeScript와 React, Vite 환경에서 컴포넌트 구조를 설계하고 AI 요약/퀴즈 흐름을 연결했습니다. 타입 안전성을 위해 데이터 모델을 명세했습니다.',
  'result',   'AI 요약, 퀴즈 생성, 학습 통계 화면을 구현했습니다(진행중). 학습 데이터를 시각화해 동기를 부여하는 점이 핵심입니다.',
  'growth',   'TypeScript로 대규모 상태를 다루며 타입 설계의 이점을 체감했습니다.',
  'skills',   '타입 기반 개발의 안정성을 배웠고, AI 기능을 제품에 녹이는 경험을 했습니다. 사용자 학습 데이터를 더 잘 활용하겠다고 다짐했습니다.'
) WHERE repo_url = 'https://github.com/yecnz/tongkk';

UPDATE posts SET sections = jsonb_build_object(
  'intro',    'SurfRide — JavaScript 기반 서핑 테마 웹 미니게임.',
  'overview', '브라우저에서 즐기는 가벼운 미니게임을 목표로, 서핑을 주제로 한 인터랙티브 웹 게임을 제작했습니다.',
  'work',     '배경: 순수 JS 역량 강화 필요 / 문제: 게임 루프·충돌 처리 경험 부족 / 핵심: 게임 루프와 UI 상태 관리 / 해결: src·index.html·style.css 구조로 구현.',
  'process',  '게임 루프, 입력 처리, 화면 갱신을 JavaScript로 직접 구현하며 DOM/Canvas 기반 렌더링 흐름을 익혔습니다.',
  'result',   '플레이 가능한 서핑 미니게임을 완성했습니다. 프레임워크 없이 바닐라 JS로 게임 UI를 구성한 점이 핵심입니다.',
  'growth',   '게임 루프와 상태 갱신을 직접 다루며 JavaScript 실행 흐름을 깊게 이해했습니다.',
  'skills',   '바닐라 JS만으로 인터랙션을 구현하는 자신감을 얻었습니다. 코드 구조화의 중요성을 배웠고, 더 견고한 설계를 하겠다고 다짐했습니다.'
) WHERE repo_url = 'https://github.com/hnneul/SurfRide';

-- (4) [데이터 정합] Tongkk status/end_date 모순 해소 (검증: 진행중인데 end_date 과거)
--     '진행중'이면 end_date를 NULL로 — formatPeriod가 '~ 진행중' 라벨을 내도록.
UPDATE posts SET end_date = NULL WHERE status = '진행중';

-- (5) [후속 릴리스, 프론트 전환·검증 완료 후 별도 실행] content 완전 제거
-- ALTER TABLE posts DROP COLUMN content;
```

### 2.3 content NOT NULL 처리 순서 (검증 must_fix — 엄수)
1. **migrations/0001 실행** → `content` NOT NULL 해제 + `sections` 추가 + 백필.
2. **프론트 전환·배포** → 상세는 `sections` 우선, 없으면 `content` 폴백. dev 미들웨어는 그 사이 `content`를 `intro`로 합성해 INSERT(NOT NULL 잔존 환경 안전).
3. **후속 릴리스** → `ALTER TABLE posts DROP COLUMN content` + 폴백 코드 제거.

> 1 완료 전에는 dev 미들웨어가 `content`를 합성해야 INSERT가 깨지지 않는다. content 생략 INSERT는 NOT NULL 해제 후에만 허용.

### 2.4 신규 INSERT (dev 미들웨어가 service_role로 실행)
```js
// supabase-js, sections는 객체로 자동 JSONB 직렬화
await admin.from('posts').insert({
  title, summary, sections,            // sections: {intro,...,skills}
  activity_date, end_date,             // 진행중이면 end_date=null로 강제(검증)
  category: '프로젝트',
  tech_stack, demo_url, repo_url, status,
  content: sections.intro || summary,  // [2.3 단계1 완료 전까지만] NOT NULL 폴백
});
```

---

## 3. 로컬 전용 쓰기 아키텍처

### 3.1 안전 보장 3중 근거
1. **이름 규칙**: 키 이름이 `SUPABASE_SERVICE_ROLE_KEY` — `VITE_` 접두사 없음 → Vite가 `import.meta.env`로 클라이언트 번들에 노출하지 않음.
2. **실행 위치**: 키는 `vite.config.js`(Node)의 `loadEnv(mode, cwd, '')` 결과와 플러그인 클로저에서만 참조. `src/**`는 import 불가.
3. **경로 부재**: 쓰기는 `configureServer` 미들웨어(dev 서버에만 존재). `vite build`/`preview`/Vercel엔 dev 서버가 없어 엔드포인트 자체가 0개. 폼 코드는 `import.meta.env.DEV` 가드로 데드코드 제거.

### 3.2 보안 보강 (검증 must_fix — 분과 누락분 추가)

**CSRF/Origin 방어가 전 분과에 없었음.** service_role은 RLS를 우회하므로 인증 0 미들웨어는 위험. 다음을 미들웨어에 **필수** 추가:
- **(a) Host/Origin 화이트리스트**: `req.headers.host`가 `localhost`/`127.0.0.1` + 포트 5191인지 검증. `Origin` 헤더 존재 시 동일 출처만 허용.
- **(b) 커스텀 헤더 요구**: 폼이 `X-Dev-Token: <임의 비밀>` 헤더를 보내고 미들웨어가 일치 검증. 커스텀 헤더는 simple-request가 아니므로 CSRF preflight를 강제 → 외부 사이트의 simple POST 차단. 토큰은 `.env.local`의 비-`VITE_` 변수 `DEV_WRITE_TOKEN`로 두되, **폼이 이 토큰을 알아야 하므로** 폼에는 별도의 `VITE_DEV_WRITE_TOKEN`(노출되어도 무방한 dev 전용 약한 토큰)을 쓰고 미들웨어가 그 값을 비교. (목적은 비밀 보호가 아니라 cross-origin simple POST 차단)
- **(c) 메서드/크기 가드**: POST만, 본문 1MB 상한.

> 보안 주의: VITE_SUPABASE_URL이 **운영** 프로젝트를 가리키면 로컬 폼이 운영 DB에 쓴다. 문서(README/CLAUDE)에 "로컬 쓰기는 운영 DB에 직접 기록됨. 테스트는 dev 전용 Supabase 프로젝트 권장"을 명시.

### 3.3 `vite.config.js` (수정)
```js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createClient } from '@supabase/supabase-js'

const SECTION_KEYS = ['intro','overview','work','process','result','growth','skills'] // §4.1과 일치
const STATUSES = ['완료', '진행중']

function readJsonBody(req) { /* 1MB 가드 + JSON.parse, 실패 시 reject */ }
function sendJson(res, status, obj) { /* statusCode + JSON.stringify */ }

function validateAndBuildRow(payload) {
  const errors = []
  const { title, summary, status, activity_date, end_date,
          tech_stack, demo_url, repo_url, sections } = payload ?? {}
  if (!title?.trim())   errors.push('title(제목)은 필수입니다.')
  if (!summary?.trim()) errors.push('summary(한 줄 요약)는 필수입니다.')
  if (!activity_date)   errors.push('activity_date(활동 시작일)는 필수입니다.')
  if (status && !STATUSES.includes(status)) errors.push(`status는 ${STATUSES.join('/')} 중 하나여야 합니다.`)

  const cleanSections = {}
  if (sections == null || typeof sections !== 'object' || Array.isArray(sections)) {
    errors.push('sections(7섹션 객체)가 필요합니다.')
  } else {
    for (const key of SECTION_KEYS) {
      const v = sections[key]
      if (v != null && typeof v !== 'string') errors.push(`sections.${key}는 문자열이어야 합니다.`)
      cleanSections[key] = (v ?? '').toString()
    }
    if (!cleanSections.intro.trim()) errors.push('sections.intro(01 프로젝트 소개)는 필수입니다.')
  }
  if (errors.length) { const e = new Error('검증 실패'); e.details = errors; throw e }

  // [검증 must_fix] status='진행중'이면 end_date 무시(NULL) — Tongkk 모순 방지
  const safeEnd = status === '진행중' ? null : (end_date || null)
  return {
    title: title.trim(), summary: summary.trim(),
    sections: cleanSections,
    content: cleanSections.intro.trim() || summary.trim(), // [2.3 단계1 완료 전까지만]
    activity_date, end_date: safeEnd,
    category: '프로젝트', // 폼은 프로젝트 전용(아래 §10 결정)
    tech_stack: Array.isArray(tech_stack) ? tech_stack : [],
    demo_url: demo_url || null, repo_url: repo_url || null,
    status: status || '완료',
  }
}

function localWriteApi(env) {
  const url = env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const devToken = env.VITE_DEV_WRITE_TOKEN
  return {
    name: 'local-write-api',
    apply: 'serve', // dev 전용. build/preview엔 미적용
    configureServer(server) {
      server.middlewares.use('/api/posts', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        // (a) Host 화이트리스트
        const host = (req.headers.host || '').split(':')[0]
        if (host !== 'localhost' && host !== '127.0.0.1')
          return sendJson(res, 403, { error: '로컬 호스트에서만 허용됩니다.' })
        // (a) Origin 동일 출처
        const origin = req.headers.origin
        if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1):5191$/.test(origin))
          return sendJson(res, 403, { error: '허용되지 않은 Origin.' })
        // (b) 커스텀 헤더 토큰 → cross-origin simple POST 차단
        if (!devToken || req.headers['x-dev-token'] !== devToken)
          return sendJson(res, 403, { error: 'X-Dev-Token 불일치.' })
        if (!serviceKey || !url)
          return sendJson(res, 500, { error: '로컬 쓰기 비활성: .env.local에 SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_URL 설정 필요.' })
        try {
          const row = validateAndBuildRow(await readJsonBody(req))
          const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
          const { data, error } = await admin.from('posts').insert(row).select().single()
          if (error) return sendJson(res, 500, { error: `저장 실패: ${error.message}` })
          return sendJson(res, 201, { post: data })
        } catch (e) {
          return sendJson(res, e.details ? 400 : 500, { error: e.message, details: e.details ?? null })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // '' = 모든 env (Node에서만). define으로 절대 넘기지 말 것
  return {
    plugins: [react(), localWriteApi(env)],
    server: { port: 5191, strictPort: true },
  }
})
```

> 엔드포인트 경로는 `/api/posts`로 통일(refactor-map의 `/__dev/posts`는 폐기). dist grep 대상 문자열도 이에 맞춤.

### 3.4 환경 파일
`.env.local` (커밋 금지):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # ⚠ 서버 전용. VITE_ 금지. 커밋/Vercel 등록 금지
VITE_DEV_WRITE_TOKEN=dev-local-only   # cross-origin POST 차단용 약한 토큰(노출 무방)
```
`.env.example` (커밋, 자리표시자 + 경고 주석). `.gitignore`는 `.env.*`로 이미 `.env.local` 무시 → service_role 주석 1줄만 추가.

### 3.5 빌드 후 검증 (CI/문서 강제 — 권장 아닌 필수 단계)
```
npm run build && grep -rE "service_role|SUPABASE_SERVICE_ROLE_KEY|/api/posts" dist/
```
결과가 **비어 있어야** 통과. CLAUDE.md §9 체크리스트에 이 명령을 박제.

---

## 4. 7섹션 작성 폼

### 4.1 `src/lib/sections.js` (신규, 단일 정규 모듈 — 검증 must_fix)
3개 분과의 충돌 API를 하나로 수렴. **모든 컴포넌트·폼·미들웨어가 이 모듈만 참조.**
```js
// src/lib/sections.js — 7섹션 양식의 단일 진실. (객체 {key:value} 구조)
export const SECTION_SCHEMA = [
  { key: 'intro',    no: '01', title: '프로젝트 소개', hint: '서비스명 / 특징 + 한 줄 소개' },
  { key: 'overview', no: '02', title: '프로젝트 개요', hint: '배경 · 목적' },
  { key: 'work',     no: '03', title: '진행한 일',     hint: '배경-문제-핵심-해결' },
  { key: 'process',  no: '04', title: '과정',          hint: '직접 액션 + 인사이트' },
  { key: 'result',   no: '05', title: '결과물',        hint: '최종 내용 + 포인트' },
  { key: 'growth',   no: '06', title: '성장한 점',     hint: '성과 또는 배운점' },
  { key: 'skills',   no: '07', title: '나의 역량',     hint: '느낀점 + 배운점 + 다짐' },
];

export const SECTION_KEYS = SECTION_SCHEMA.map((s) => s.key); // 미들웨어 화이트리스트와 동일

export function emptySections() {
  return Object.fromEntries(SECTION_SCHEMA.map((s) => [s.key, '']));
}

// sections(객체) → 빈 body 제외한 [{key,no,title,body}] (렌더 순서 = SCHEMA 순서)
export function resolveSections(sections) {
  if (!sections || typeof sections !== 'object') return [];
  return SECTION_SCHEMA
    .map((s) => ({ ...s, body: (sections[s.key] ?? '').toString().trim() }))
    .filter((s) => s.body.length > 0);
}
```

### 4.2 `src/components/dev/NewPostForm.jsx` (신규, DEV 전용)
- `meta`(title, summary 필수 / category 고정 '프로젝트' / status / activity_date 필수 / end_date / tech_stack 쉼표 / demo_url / repo_url) + `sections`(SECTION_SCHEMA 순회 textarea, `intro` 필수).
- **status='진행중'이면 end_date 입력 disabled**(검증 정합 — UI 단에서도 모순 차단).
- 제출: `fetch('/api/posts', { method:'POST', headers:{'Content-Type':'application/json','X-Dev-Token': import.meta.env.VITE_DEV_WRITE_TOKEN}, body: JSON.stringify({...meta, tech_stack: split, sections}) })`.
- 성공/실패 `aria-live="polite"` + Font Awesome 아이콘(`fa-circle-check`/`fa-circle-exclamation`). 키는 절대 만지지 않음.
- props: `{ onCreated: (post) => void }` → 부모가 목록 재조회.

### 4.3 App.jsx의 DEV 가드 + lazy
```jsx
const NewPostForm = import.meta.env.DEV
  ? lazy(() => import('./components/dev/NewPostForm.jsx'))
  : null;
// ...
{import.meta.env.DEV && NewPostForm && (
  <Suspense fallback={null}>
    <NewPostForm onCreated={() => refetchPosts()} />
  </Suspense>
)}
```
`import.meta.env.DEV`가 빌드 시 `false` 정적 치환 → 폼 모듈 청크가 production 빌드에서 물리적으로 제외.

---

## 5. 메인 카드 그리드

### 5.1 App.jsx (재작성 — fetch 정책 확정)
**`.select('*')` + 클라이언트 분리**(검증 must_fix: `.eq` 쓰면 Experience가 빈값).
```jsx
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { profile } from './data/profile.js';
import About from './components/About.jsx';
import ProjectGrid from './components/ProjectGrid.jsx';
import PostModal from './components/PostModal.jsx';   // 파일명 유지(내용만 §6에서 교체)

const NewPostForm = import.meta.env.DEV
  ? lazy(() => import('./components/dev/NewPostForm.jsx')) : null;

function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const refetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('activity_date', { ascending: false });
    if (error) setError(error.message);
    else setPosts(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { refetchPosts(); }, [refetchPosts]);

  const projects = posts.filter((p) => p.category === '프로젝트');
  const currentYear = new Date().getFullYear();

  if (loading) return <div className="state-screen"><p>프로젝트를 불러오는 중…</p></div>;
  if (error)   return <div className="state-screen"><p className="state-screen__error">데이터를 불러오지 못했습니다.</p><p className="state-screen__hint">잠시 후 새로고침하거나 Supabase 연결 설정을 확인해 주세요.</p></div>;

  return (
    <div className="page">
      <div className="container">
        <About profile={profile} />   {/* 자격증/기술/경험은 About 내부에서 렌더(§7) */}
        <section className="projects" aria-label="프로젝트">
          <div className="projects__head">
            <h2 className="projects__title">프로젝트</h2>
            <span className="projects__count">{projects.length}개</span>
          </div>
          <ProjectGrid projects={projects} onSelectPost={setSelectedPost} />
        </section>
        {import.meta.env.DEV && NewPostForm && (
          <Suspense fallback={null}><NewPostForm onCreated={() => refetchPosts()} /></Suspense>
        )}
        <footer className="site-footer"><p>© {currentYear} {profile.name} · Data from Supabase</p></footer>
      </div>
      {selectedPost && <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
  );
}
export default App;
```
제거: `useMemo`, `buildCalendar`/`getYears` import, `YearSwitcher`/`MonthGrid` import, `pickedYear`/`selectedYear`/`calendar`/`years`/`monthsData`/`now`/`currentMonth`.

> 화면 순서: **About(프로필+자격증+기술+경험) → 프로젝트 그리드**. (검증 누락 — §10에서 모바일 순서 결정 확정)

### 5.2 `src/components/ProjectGrid.jsx` (신규)
```jsx
import PostCard from './PostCard.jsx';
export default function ProjectGrid({ projects, onSelectPost }) {
  if (!projects?.length) return (
    <div className="project-grid project-grid--empty" role="status">
      <i className="fa-regular fa-folder-open project-grid__empty-icon" aria-hidden="true" />
      <p className="project-grid__empty-text">아직 등록된 프로젝트가 없습니다.</p>
    </div>
  );
  return (
    <ul className="project-grid" role="list">
      {projects.map((post) => (
        <li key={post.id} className="project-grid__item">
          <PostCard post={post} onSelect={onSelectPost} />
        </li>
      ))}
    </ul>
  );
}
```

### 5.3 `src/components/PostCard.jsx` (수정)
- `categoryClass` import·카테고리 배지 **제거**(전부 프로젝트).
- status 배지(`badge--ongoing`/`badge--done`) + 제목 + `summary`(2줄 clamp) + `tech_stack` 칩(최대 3 + `+N`).
- 카드 소개 소스 = **`post.summary`**(확정). intro 폴백 없음.

### 5.4 CSS (`src/styles/index.css`)
- **삭제**: `.timeline*`, `.year-switcher`/`.year-tab*`, `.month-grid`/`.month-cell*` 및 해당 반응형 규칙.
- **추가**: `.projects`/`.projects__head`/`.projects__count`, `.project-grid`(데스크톱 `repeat(3,1fr)`), `.project-grid--empty`, `.post-card` 보강(padding `sp-6`, 제목 18px, `surface` 배경, `shadow-md` 호버, `margin-top:auto` 칩 하단 정렬, `:focus-visible` 갈색 outline).
- **반응형**: `@media(max-width:860px)` 2열, `@media(max-width:600px)` 1열. 신규 색 없음(토큰만).

---

## 6. 상세 뷰 (`src/components/PostModal.jsx` 내용 교체 — 파일명 유지)

App import 불변을 위해 **파일명 PostModal.jsx 유지, 내용만 재작성**(검증 결정). props `{ post, onClose }` 그대로.

### 6.1 렌더 계약
- `resolveSections(post.sections)`로 **빈 섹션 제외** 후 SCHEMA 순서 렌더.
- `sections`가 비고 `content`도 없으면 "본문이 준비 중입니다" 최소 안내(검증 누락: 빈 본문 UX). `sections` 비고 `content` 있으면 **레거시 폴백**(content 단일 문단).
- 본문 줄바꿈 보존: `white-space: pre-line` (마크다운 파서 미도입).
- `formatPeriod`는 **`../lib/dates.js`**에서 import.

### 6.2 a11y / 반응형
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`(제목 id).
- **포커스 트랩**(직접 구현): 열릴 때 닫기 버튼 focus, Tab/Shift+Tab 순환, 닫힐 때 트리거 카드로 복원. focusable 0개 대비 패널 `tabindex=-1` 보강.
- ESC 닫기 + 배경 클릭 닫기 + body 스크롤 잠금(복원 보장) + `.detail__body { overflow-y:auto; overscroll-behavior:contain }`.
- 닫기 버튼: 텍스트 `✕` 제거 → `<i className="fa-solid fa-xmark" aria-hidden="true" />` + `aria-label="닫기"` (이모지 금지 준수).
- 헤더(배지/상태/기간) + 본문(제목/summary/칩/링크/7섹션) 분리. sticky 헤더 + 본문만 스크롤.
- 데스크톱=중앙 모달, **모바일(≤600px)=하단 풀스크린 시트**(CSS만 전환: `align-items:flex-end` + `translateY(100%)→0`, 상단 모서리만 둥글게). `prefers-reduced-motion` 대응.

### 6.3 CSS
기존 `.modal*` 블록 → `.detail*`(backdrop/head/body/title/summary/tags/links + `.detail-section*`)로 교체. 토큰만 사용.

### 6.4 `src/lib/dates.js` (신규 — calendar.js 분할)
`parseYearMonth` + `formatPeriod`만 이전. `MONTH_LABELS`/`resolveEnd`/`buildCalendar`/`getYears`는 폐기. **calendar.js 삭제 전 dates.js 추출·import 경로 변경을 먼저 끝낼 것**(빌드 깨짐 방지).

> 주의(검증 누락): 현 `formatPeriod`는 일(day)을 버려 대외활동(12/29~12/30)이 "2025년 12월"로만 표기됨. 이는 **의도된 단순화로 유지**(연-월 표기). 일 단위 정밀도는 §10 남은 결정.

---

## 7. 프로필 (자격증 / 기술 / 경험)

### 7.1 비프로젝트 행 정책 = **KEEP + DB 표시** (검증 must_fix 확정)
- DB의 비프로젝트 5행(SQLD, ADsP, 연구실 인턴, 대외활동, 동아리) **삭제하지 않음**.
- About 내부 "경험·활동" 리스트가 `posts.filter(category !== '프로젝트')`로 받은 **DB 행**을 렌더.
- 자격증 2행은 별도 처리: **자격증/기술 스택은 profile.js 고정값**(정적, DB 왕복 불필요), **연구실/대외활동/동아리는 DB 행**.
  - 즉 자격증도 DB에 보존되지만 화면 표기는 profile.js 고정값을 우선 사용(이중 표기 방지를 위해 Experience는 `category in ('연구실','대외활동','동아리')`만 렌더, 자격증 category는 제외).

> 이 결정으로 profile 분과의 "DELETE" 안과 refactor-map의 "DB행 Experience" 안의 모순을 해소: **DB는 보존**, Experience는 비프로젝트·비자격증 행을 표시, 자격증·기술은 profile.js.

### 7.2 `src/data/profile.js` (수정)
`name/role/tagline/intro/links` 유지 + `certifications[]`, `skills[]` 추가. intro의 "캘린더" 톤을 프로젝트 중심으로 소폭 수정. (experiences는 DB에서 오므로 **고정값 미사용**, 단 DB 비었을 때 폴백용으로 둘 수 있음 — 기본은 DB 단일 출처.)
```js
export const profile = {
  name: '송연지', role: 'Frontend Developer',
  tagline: '꾸준히 쌓아 올린 프론트엔드 성장 기록',
  intro: '코드로 화면을 만드는 일을 좋아하는 프론트엔드 개발자입니다. 학습과 프로젝트를 기록하며 꾸준히 성장하고 있습니다.',
  links: [{ label: 'GitHub', href: 'https://github.com/yecnz', icon: 'fa-brands fa-github' }],
  certifications: [
    { name: 'SQLD', full: 'SQL 개발자', issuer: '한국데이터산업진흥원', date: '2024-12' },
    { name: 'ADsP', full: '데이터분석 준전문가', issuer: '한국데이터산업진흥원', date: '2025-03' },
  ],
  skills: [
    { name: 'JavaScript', icon: 'fa-brands fa-js' }, { name: 'TypeScript', icon: 'fa-solid fa-code' },
    { name: 'React', icon: 'fa-brands fa-react' }, { name: 'Vite', icon: 'fa-solid fa-bolt' },
    { name: 'HTML', icon: 'fa-brands fa-html5' }, { name: 'CSS', icon: 'fa-brands fa-css3-alt' },
    { name: 'Git', icon: 'fa-brands fa-git-alt' },
  ],
};
```

### 7.3 `src/components/About.jsx` (수정) + `src/components/Experience.jsx` (신규)
- About: 기존 헤더 아래 **자격증 배지**(`badge--cert`) + **기술 칩**(`chip--skill` + FA 아이콘) 블록. 빈 배열 가드 + `<section aria-labelledby>` + `<ul>/<li>`.
- Experience: props `{ items }`(=비프로젝트·비자격증 DB 행). `kind = item.category` → `categoryClass(kind)` 재사용(`연구실→badge--lab`, `대외활동→badge--activity`, `동아리→badge--club`). 각 항목 제목/기간(`formatPeriod`)/요약. **클릭 시 상세를 열지 여부는 §10 결정**(기본: 정적 리스트, 클릭 없음).
- App에서 `<About profile={profile}>` 내부 또는 형제로 `<Experience items={posts.filter(p => ['연구실','대외활동','동아리'].includes(p.category))} />` 배치.
- `src/lib/skills.js`(선택): `skillIcon(skill)` fallback(`fa-solid fa-code`).
- CSS: `.about__block`/`.about__block-title`/`.about__badges`/`.about__skills`/`.chip--skill`/`.about__exp`/`.exp-item*` 추가(토큰·기존 badge/chip 재사용, 신규 색 없음).

> 정합(검증 누락): profile 고정값 날짜 형식과 DB 형식 차이는 표기 단순화로 수용. Experience는 DB의 풀 DATE를 `formatPeriod`(연-월)로 렌더하므로 일관.

---

## 8. 삭제 / 수정 / 추가 파일 맵

### 삭제 (DELETE)
| 파일 | 사유 |
|---|---|
| `src/components/MonthGrid.jsx` | 12칸 월 그리드 → 카드 그리드로 대체 |
| `src/components/MonthCell.jsx` | "기록 없음" 빈 칸 개념 폐기 |
| `src/components/YearSwitcher.jsx` | 연도 탭 불필요 |
| `src/lib/calendar.js` | dates.js로 분할 후 삭제 (추출·import 변경 **선행** 필수) |

### 추가 (ADD)
| 파일 | 역할 |
|---|---|
| `src/lib/sections.js` | 7섹션 단일 모듈(SECTION_SCHEMA/SECTION_KEYS/emptySections/resolveSections) |
| `src/lib/dates.js` | parseYearMonth/formatPeriod 이전 |
| `src/lib/skills.js` | skillIcon fallback(선택) |
| `src/components/ProjectGrid.jsx` | 프로젝트 카드 그리드 |
| `src/components/Experience.jsx` | 비프로젝트(연구실/대외활동/동아리) DB행 리스트 |
| `src/components/dev/NewPostForm.jsx` | DEV 전용 작성 폼 |
| `supabase/migrations/0001_add_sections.sql` | 운영 마이그레이션(ALTER+백필) |

### 수정 (MODIFY)
| 파일 | 변경 |
|---|---|
| `src/App.jsx` | 캘린더 제거, `.select('*')`+클라이언트 분리, ProjectGrid, DEV 가드 폼, About/Experience 배치 |
| `src/components/PostCard.jsx` | 카테고리 배지 제거, status 배지 + summary + 칩 |
| `src/components/PostModal.jsx` | **내용 교체**: 7섹션 렌더 + 포커스 트랩 + FA 닫기 + 반응형 시트, `dates.js` import |
| `src/components/About.jsx` | 자격증/기술 블록 추가, Experience 연계 |
| `src/data/profile.js` | certifications[]/skills[] 추가, intro 톤 수정 |
| `src/styles/index.css` | timeline/year/month/modal 블록 제거 → projects/project-grid/post-card/detail/about-block/experience 추가 |
| `vite.config.js` | loadEnv + localWriteApi 플러그인(apply:'serve', Origin/토큰 방어) |
| `supabase/schema.sql` | sections 추가, content NOT NULL 제거, INSERT를 sections 기반으로, "신규 셋업 전용" 경고 |
| `.env.local` | SUPABASE_SERVICE_ROLE_KEY, VITE_DEV_WRITE_TOKEN 추가 |
| `.env.example` | 자리표시자 + 경고 주석 |
| `.gitignore` | service_role 커밋 금지 주석 1줄 |
| `CLAUDE.md` / `DESIGN.md` / `README.md` | 달력→카드 그리드, dev 쓰기, 디렉터리, dist grep 검증 반영 |

### 변경 없음
`src/lib/categories.js`(배지 매핑 재사용), `src/supabaseClient.js`(anon 읽기 유지), `index.html`(FA/Pretendard 유지).

---

## 9. 단계별 구현 순서 + 검증 기준

각 단계 종료 시 `npm run lint && npm run build` green 유지(점진 안전 전환).

| 단계 | 작업 | 검증 기준 |
|---|---|---|
| **S0 유틸 추출** | `dates.js` 생성(parseYearMonth/formatPeriod). PostModal import를 dates.js로. calendar.js는 아직 유지 | build/lint green, 동작 동일 |
| **S1 데이터 양식 + 마이그레이션** | `sections.js` 추가. profile.js certifications/skills. `schema.sql` 갱신 + `migrations/0001` 작성. **운영 DB에 0001 실행** | 0001 실행 후 `SELECT sections FROM posts WHERE category='프로젝트'` 7키 확인. Tongkk end_date NULL 확인 |
| **S2 카드 그리드 교체** | `ProjectGrid.jsx` 추가. `App.jsx` `.select('*')`+필터+그리드. `PostCard` 배지 제거. **MonthGrid/MonthCell/YearSwitcher + calendar.js 삭제**. CSS timeline/year/month 제거 + project-grid 추가 | dev에서 프로젝트 카드만 그리드, 콘솔 에러 0, 반응형 3/2/1열 |
| **S3 상세 + sections** | `PostModal.jsx` 내용 교체(7섹션/포커스 트랩/FA 닫기/시트). 빈 본문 안내 + content 폴백 | 카드 클릭→상세, ESC/배경/Tab 순환/포커스 복원, 7섹션 표시, 모바일 하단 시트 |
| **S4 프로필/경험** | `Experience.jsx` 추가, About 자격증/기술 블록 | 자격증(profile)·기술(profile)·연구실/대외활동/동아리(DB) 노출, 그리드엔 미노출 |
| **S5 dev 폼 + 미들웨어** | `vite.config.js` 플러그인, `dev/NewPostForm.jsx`. `.env.local`/`.env.example`. Origin/토큰 방어 | dev 폼 제출→INSERT 성공→목록 반영. `npm run build && grep -rE "service_role\|/api/posts" dist/` **빈 결과**. `npm run preview`에서 폼 미노출. 외부 origin fetch 403 |
| **S6 문서 동기화** | CLAUDE/DESIGN/README 갱신 | 디렉터리 문서 = 실제 트리, dist grep 검증 명령 문서화 |
| **S7 후속(별도 릴리스)** | `ALTER TABLE posts DROP COLUMN content` + 폴백 코드 제거 | content 참조 0 확인 후 실행 |

**의존성**: S0→S1→S2(삭제는 S2). S3는 S1·S2 후. S4는 S1 후. S5는 S1(sections) 후. S6 마지막. S7은 전환 안정화 후.

---

## 10. 리스크 & 남은 결정 (사용자 확인 필요)

### 10.1 본 문서가 확정한 must_fix (재확인용)
- 7섹션 키 `skills` 단일 / 구조 객체 / `sections.js` 단일 모듈 ✓
- 비프로젝트 KEEP + DB표시(Experience), 자격증·기술 profile.js ✓
- App fetch `.select('*')`+클라이언트 분리 ✓
- content 3단계(ALTER→전환→DROP), 합성 폴백 ✓
- schema.sql / migrations 물리 분리, 백필 운영은 id 기준 ✓
- dev 미들웨어 Origin/Host/X-Dev-Token 방어 ✓
- formatPeriod → dates.js 1곳, calendar.js 삭제 전 추출 선행 ✓
- 상세 = PostModal.jsx 내용 교체(파일명 유지) ✓
- Tongkk status/end_date 모순: 진행중이면 end_date=NULL(DB+폼 둘 다) ✓

### 10.2 남은 결정 (사용자 확인 권장)
1. **모바일 섹션 순서**: About(프로필+자격증+기술+경험)이 길어 모바일에서 프로젝트 그리드가 아래로 밀림. 안: (a) About→프로젝트→경험 순서로 재배치, (b) 경험 블록 접기/더보기, (c) 현행 유지(항목 적어 OK). **추천: 현행 유지, 항목 증가 시 (b)**.
2. **일(day) 단위 기간 표기**: 현 `formatPeriod`는 연-월만. 대외활동(12/29~12/30) 단발성이 "2025년 12월"로 표기됨. 정밀도 필요 시 day 포함 포매터로 교체. **추천: 연-월 유지**.
3. **폼 category 범위**: 본 계획은 폼을 **프로젝트 전용**(category 고정)으로 단순화. 비프로젝트 활동도 폼으로 쓸지? **추천: 프로젝트 전용**(비프로젝트는 드물고 SQL/대시보드로 충분).
4. **Experience 항목 클릭 상세**: 비프로젝트 행을 PostModal로 열지? DB 행이라 sections 없으면 content 폴백 가능. **추천: 정적 리스트(클릭 없음)**.
5. **dev Supabase 분리**: 로컬 폼이 운영 DB에 직접 쓰는 위험. dev 전용 Supabase 프로젝트를 둘지. **추천: 최소한 문서 경고, 가능하면 dev 프로젝트 분리**.
6. **자격증 이중 출처**: 자격증은 DB(보존)와 profile.js(표시) 양쪽에 존재. 향후 자격증 추가 시 profile.js만 수정. **추천: profile.js를 자격증 SSOT로, DB 자격증 행은 표시에 미사용(보존만)**.
7. **skills 목록/순서**: profile.js의 기술 목록·순서는 추정값 — 본인 실제 스택으로 검수 필요.
8. **content DROP 시점**: S7(후속 릴리스)로 분리 권장. 이번 릴리스에 포함하지 않음 — 롤백 안전.

### 10.3 잔존 리스크
- `import.meta.env.DEV` 가드 + lazy로 폼 제거하나, **dist grep 검증(S5)을 누락하면** 폼/엔드포인트가 번들에 남을 위험 → 검증을 CI/문서 필수 단계로 박제.
- FA brand 아이콘 클래스(`fa-css3-alt`/`fa-js`/`fa-git-alt`) 오타 시 빈 네모 → dev 육안 확인.
- 백필 WHERE를 운영에서 repo_url로 실행하면 대소문자/trailing slash에 취약 → **id 기준 실행**(0001 주석에 경고 포함).
- 프로젝트 1~2개면 3열 그리드가 휑함(현재 3개라 OK) → 감소 시 max 카드폭+justify 보정 검토.

---

**참조 파일(절대 경로)**: `/Users/yeonji/Desktop/workspace/likelion/my-blog/` 하위 — `src/App.jsx`, `src/components/{PostCard,PostModal,About}.jsx`, `src/components/{ProjectGrid,Experience}.jsx`(신규), `src/components/dev/NewPostForm.jsx`(신규), `src/lib/{sections,dates,skills}.js`(신규), `src/lib/calendar.js`(삭제), `src/data/profile.js`, `src/styles/index.css`, `vite.config.js`, `supabase/schema.sql`, `supabase/migrations/0001_add_sections.sql`(신규), `.env.local`, `.env.example`, `CLAUDE.md`, `DESIGN.md`, `README.md`.