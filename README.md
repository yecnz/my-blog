# 송연지 | 프로젝트 포트폴리오 블로그

> 프로젝트를 카드로 한눈에 보여주는 프론트엔드 포트폴리오.
> Supabase(PostgreSQL)에서 데이터를 읽어 **프로젝트 카드 그리드**로 보여주고,
> 카드를 클릭하면 **7섹션 상세**(소개·개요·진행한 일·과정·결과물·성장·역량)가 반응형으로 열립니다.

상단에는 자격증·기술 스택·경험(인턴·대외활동·동아리)을, 아래에는 프로젝트를 카드로 정리했습니다.
새 글은 **로컬 개발 환경에서만** 보이는 작성 폼으로 추가하며, 배포된 사이트는 **읽기 전용**입니다.

---

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [화면 구성](#화면-구성)
- [디렉터리 구조](#디렉터리-구조)
- [시작하기 (로컬 실행)](#시작하기-로컬-실행)
- [Supabase 설정](#supabase-설정)
- [글 작성 (로컬 전용)](#글-작성-로컬-전용)
- [배포 (Vercel)](#배포-vercel)
- [Risk Management](#risk-management)
- [문서](#문서)

---

## 주요 기능

- **프로젝트 카드 그리드** — 프로젝트를 반응형 카드(데스크톱 3열 → 모바일 1열)로 한눈에.
- **7섹션 상세** — 카드 클릭 시 01 소개 ~ 07 역량의 구조화된 본문을 모달(모바일은 하단 시트)로 표시.
- **프로필** — GitHub · 자격증 · 기술 스택을 상단 About에 표시.
- **경험 · 활동** — 프로젝트가 아닌 인턴·대외활동·동아리를 컴팩트 리스트로.
- **로컬 전용 작성 폼** — `npm run dev`에서만 보이는 7섹션 폼으로 새 프로젝트를 Supabase에 저장. 배포본에는 포함되지 않음.
- **접근성** — 키보드 조작, `aria-label`, 상세 포커스 트랩 + ESC 닫기.

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| 프론트엔드 | React 19, Vite |
| 데이터베이스 | Supabase (PostgreSQL) |
| 본문 저장 | JSONB(`sections`, 7섹션) |
| 스타일 | CSS (CSS 변수 기반 디자인 토큰) |
| 아이콘 / 폰트 | Font Awesome 6, Pretendard (CDN) |
| 배포 | Vercel (프론트) + Supabase (DB) |

---

## 화면 구성

1. **About** — 역할 / 이름 / 소개 / GitHub / 자격증 / 기술 스택
2. **경험 · 활동** — 연구실 인턴 · 대외활동 · 동아리 (정적 리스트)
3. **프로젝트** — 카드 그리드 (클릭 → 상세)
4. **상세(모달/시트)** — 7섹션 + 기술 + 링크
5. **작성 폼** — 개발 환경에서만 노출

---

## 디렉터리 구조

```
my-blog/
├─ index.html              # Font Awesome / Pretendard CDN
├─ DESIGN.md / CLAUDE.md / REDESIGN_PLAN.md
├─ vite.config.js          # 포트 5191 + dev 전용 쓰기 미들웨어(/api/posts)
├─ supabase/
│  ├─ schema.sql           # 신규 셋업(DROP+CREATE+sections)
│  └─ migrations/0001_add_sections.sql  # 운영용 비파괴 마이그레이션
└─ src/
   ├─ App.jsx              # fetch → 프로젝트/경험 분리 → 그리드 + 상세
   ├─ supabaseClient.js
   ├─ data/profile.js      # 이름/링크/자격증/기술스택(고정값)
   ├─ lib/                 # dates.js, sections.js, categories.js
   ├─ components/          # About, Experience, ProjectGrid, PostCard, PostModal
   │  └─ dev/NewPostForm.jsx   # DEV 전용 작성 폼
   └─ styles/index.css
```

---

## 시작하기 (로컬 실행)

### 1. 사전 준비
- Node.js 18 이상
- Supabase 프로젝트 1개 (무료 플랜으로 충분)

### 2. 설치
```bash
git clone https://github.com/yecnz/my-blog.git
cd my-blog
npm install
```

### 3. 환경 변수
`.env.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.
```bash
cp .env.example .env.local
```
```env
# 공개 읽기용(클라이언트 노출 OK) — 필수
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# 로컬 작성 폼 전용(개발에서만 사용)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>   # ⚠ VITE_ 금지, 커밋/배포 금지
VITE_DEV_WRITE_TOKEN=dev-local-only                 # cross-origin 위조 POST 차단용
```
> `VITE_SUPABASE_*`는 대시보드 > Project Settings > API 에서, `service_role` 키도 같은 화면에서 확인합니다.
> `.env.local`은 `.gitignore`로 커밋되지 않습니다.

### 4. 데이터베이스 준비
[Supabase 설정](#supabase-설정)을 따라 테이블을 만듭니다.

### 5. 실행
```bash
npm run dev      # http://localhost:5191 (작성 폼 포함)
npm run build    # 프로덕션 빌드(dist/)
npm run preview  # 빌드 결과 미리보기(읽기 전용)
npm run lint     # ESLint
```

---

## Supabase 설정

처음 세팅(테이블이 아직 없을 때):
1. Supabase 대시보드 > **SQL Editor**
2. [`supabase/schema.sql`](./supabase/schema.sql) 붙여넣고 실행 → 테이블 생성 + RLS(공개 읽기) + 샘플 데이터
3. **Table Editor**에서 `posts`와 데이터 확인

> 이미 데이터가 있는 운영 DB라면 `schema.sql`(맨 위 `DROP TABLE` 포함) 대신
> [`supabase/migrations/0001_add_sections.sql`](./supabase/migrations/0001_add_sections.sql)(비파괴 ALTER)을 사용하세요.

### `posts` 테이블 스키마 (= API 명세)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | int8 (PK) | 고유 번호 |
| `title` | text | 제목 |
| `summary` | text | 카드 한 줄 요약 |
| `sections` | jsonb | 7섹션 본문(객체 `{intro,overview,work,process,result,growth,skills}`) |
| `content` | text | (레거시) 상세 폴백. 신규는 `sections` 사용 |
| `activity_date` | date | 활동 시작일(정렬/기간) |
| `end_date` | date | 종료일(진행중이면 NULL) |
| `category` | text | 프로젝트 / 자격증 / 연구실 / 대외활동 / 동아리 |
| `tech_stack` | text[] | 기술/키워드 태그 |
| `demo_url` / `repo_url` | text | 데모 / GitHub 링크 |
| `status` | text | 완료 / 진행중 |

- **메인 그리드**는 `category = '프로젝트'`만 표시.
- 자격증·기술 스택은 DB가 아니라 [`src/data/profile.js`](./src/data/profile.js) 고정값으로 표시합니다.

---

## 글 작성 (로컬 전용)

새 프로젝트는 **개발 서버에서만** 보이는 작성 폼으로 추가합니다.

1. `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`를 채웁니다.
2. `npm run dev` → 페이지 하단 **"새 프로젝트 작성 (개발 전용)"** 폼에서 7섹션을 입력하고 저장.
3. 저장은 dev 서버의 `/api/posts` 미들웨어가 `service_role`로 처리합니다(프론트는 키를 만지지 않음).

동작 방식 / 안전장치:
- 폼은 `import.meta.env.DEV` 가드로 **개발에서만** 렌더 → 프로덕션 빌드에서 제거됨.
- `service_role` 키는 `vite.config.js`(Node)에서만 참조 → 클라이언트 번들에 포함되지 않음.
- 미들웨어는 **localhost Host/Origin 화이트리스트 + `X-Dev-Token` 헤더**로 외부 위조 요청(CSRF)을 차단.
- SQL로 직접 추가하고 싶다면 [Supabase 설정](#supabase-설정)의 INSERT 패턴을 사용해도 됩니다.

> ⚠ 로컬 폼은 `VITE_SUPABASE_URL`이 가리키는 **그 DB에 직접** 씁니다.
> 운영 DB를 가리키면 테스트 글이 운영에 올라가니, 가능하면 개발용 Supabase 프로젝트를 분리하세요.

---

## 배포 (Vercel)

1. GitHub 저장소를 Vercel에 import (Framework: `Vite` 자동 감지).
2. **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` **만** 등록.
   - ❌ `SUPABASE_SERVICE_ROLE_KEY`는 **절대 등록하지 않습니다**(배포본은 쓰기 불필요).
3. Deploy → 빌드(`npm run build`) 후 자동 배포. 배포본은 읽기 전용입니다.

> 배포 URL: `(배포 후 이곳에 추가)`

---

## Risk Management

| 위험 | 대응 |
|------|------|
| **공개 키로 무단 쓰기** | RLS는 공개 **SELECT만** 허용(쓰기 정책 없음). 쓰기는 dev 서버 `service_role`로만. 배포본엔 쓰기 경로 0. |
| **service_role 키 번들 유출** | `VITE_` 접두사 금지(Node 컨텍스트에서만 참조). 빌드 후 `grep -rE "service_role\|/api/posts" dist/` 결과가 **비어 있어야** 통과. |
| **dev 폼 CSRF** | dev 미들웨어가 Host/Origin 화이트리스트(localhost:5191) + `X-Dev-Token` 헤더 검증으로 외부 위조 POST 차단. |
| **운영 DB 오염** | 로컬 폼이 `VITE_SUPABASE_URL` DB에 직접 기록 → 개발용 프로젝트 분리 권장(문서 경고). |
| **운영 데이터 소실** | `schema.sql`(DROP 포함)과 운영용 `migrations/0001`(ALTER) 물리 분리. |
| **비밀값 노출** | 키는 `.env.local`(gitignore)에만. Vercel엔 anon 키만 등록. |
| **데이터 로딩 실패** | 로딩/에러 화면 분리, 사용자 안내. |
| **스키마-프론트 불일치** | 7섹션 키는 `lib/sections.js`와 `vite.config.js`의 `SECTION_KEYS`를 동시 관리(CLAUDE.md §9 체크리스트). |

---

## 문서

- [DESIGN.md](./DESIGN.md) — 컬러·레이아웃·컴포넌트 디자인 시스템
- [CLAUDE.md](./CLAUDE.md) — 스택·규칙·데이터 흐름·검증
- [REDESIGN_PLAN.md](./REDESIGN_PLAN.md) — 달력형 → 카드형 전환 계획
- [supabase/schema.sql](./supabase/schema.sql) · [migrations/0001](./supabase/migrations/0001_add_sections.sql)

---

## 작성자

**송연지** · Frontend Developer
GitHub: [@yecnz](https://github.com/yecnz)
