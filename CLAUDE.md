# CLAUDE.md — 프로젝트 규칙

이 파일은 Claude(및 모든 기여자)가 이 저장소에서 작업할 때 따르는 규칙입니다.
디자인 결정은 [`DESIGN.md`](./DESIGN.md), 큰 재설계 맥락은 [`REDESIGN_PLAN.md`](./REDESIGN_PLAN.md)를 참고합니다.

---

## 1. 프로젝트 한 줄 정의

송연지(프론트엔드)의 **프로젝트 카드형 포트폴리오 블로그**.
Supabase(PostgreSQL)에서 데이터를 읽어 **프로젝트 카드 그리드**로 보여주고,
카드를 클릭하면 **7섹션 상세**가 반응형으로 열린다. 새 글은 **로컬 개발 환경에서만** 작성한다.

## 2. 기술 스택

- **React 19** + **Vite** (JavaScript, JSX) — TypeScript 미사용.
- **Supabase JS** (`@supabase/supabase-js`) — 공개 읽기(anon) + 로컬 쓰기(service_role).
- **Font Awesome 6 Free** — 아이콘(CDN, `index.html`). **이모지/이모티콘 금지.**
- **Pretendard** — 한글 폰트(CDN).
- 배포: **Vercel**(프론트) + **Supabase**(DB). 라우터/상태 라이브러리 없음.

## 3. 핵심 원칙

1. **공개 사이트는 읽기 전용**: 배포본에는 쓰기 경로가 전혀 없다(구조적 0).
   글 작성은 `npm run dev`에서만 보이는 폼([`components/dev/NewPostForm.jsx`](./src/components/dev/NewPostForm.jsx)) → dev 서버 미들웨어(`/api/posts`) → **service_role**로 INSERT.
2. **보안**: `service_role` 키는 `SUPABASE_SERVICE_ROLE_KEY`(비-`VITE_`)로 `.env.local`에만 둔다.
   `VITE_` 접두사 금지(번들 노출), 커밋/Vercel 환경변수 등록 금지. RLS는 공개 SELECT만 둔다(쓰기 정책 없음).
3. **데이터 = API 명세**: `posts` 스키마가 계약. 변경 시 [`supabase/schema.sql`](./supabase/schema.sql)·[`migrations`](./supabase/migrations) + 이 문서를 함께 갱신.
4. **DESIGN.md 준수**: 색·간격·아이콘·레이아웃은 CSS 변수 토큰으로. 임의 색 금지.

## 4. 디렉터리 구조

```
my-blog/
├─ index.html              # Font Awesome / Pretendard CDN
├─ DESIGN.md / CLAUDE.md / README.md / REDESIGN_PLAN.md
├─ vite.config.js          # 포트 5191 + dev 전용 쓰기 미들웨어(/api/posts)
├─ supabase/
│  ├─ schema.sql           # 신규 셋업(DROP+CREATE+sections). 운영 실행 금지
│  └─ migrations/
│     └─ 0001_add_sections.sql  # 운영용 비파괴 마이그레이션(ALTER+백필)
└─ src/
   ├─ main.jsx
   ├─ App.jsx              # fetch → projects/experiences 분리 → 그리드 + 상세
   ├─ supabaseClient.js    # anon 읽기 클라이언트
   ├─ data/profile.js      # 이름/링크/자격증/기술스택 (고정값 SSOT)
   ├─ lib/
   │  ├─ dates.js          # parseYearMonth, formatPeriod
   │  ├─ sections.js       # 7섹션 SSOT(SECTION_SCHEMA/emptySections/resolveSections)
   │  └─ categories.js     # 분류 → 배지 클래스 매핑(경험·상세에서 사용)
   ├─ components/
   │  ├─ About.jsx         # 소개 + 자격증 + 기술스택
   │  ├─ Experience.jsx    # 비프로젝트(연구실/대외활동/동아리) 리스트
   │  ├─ ProjectGrid.jsx   # 프로젝트 카드 그리드
   │  ├─ PostCard.jsx      # 카드(요약형)
   │  ├─ PostModal.jsx     # 7섹션 상세(모달/모바일 시트)
   │  └─ dev/NewPostForm.jsx  # DEV 전용 작성 폼
   └─ styles/index.css     # 디자인 토큰 + 전역 스타일
```

## 5. 코딩 컨벤션

- 함수형 컴포넌트 + 훅. 파일당 1 컴포넌트, PascalCase.
- 색·간격은 **CSS 변수**. 인라인 스타일은 동적 값만.
- 한글 중심. 주석은 "왜"를 한국어로.
- 접근성: 인터랙티브 요소 키보드 지원, 아이콘 버튼 `aria-label`, 모달 포커스 트랩+ESC.
- 7섹션을 다루는 코드는 반드시 `lib/sections.js`의 키/스키마를 사용(키 하드코딩 금지).
  미들웨어(`vite.config.js`)의 `SECTION_KEYS`도 동일하게 유지.

## 6. 데이터 흐름

```
Supabase posts (.select('*') order activity_date desc)
  → App.jsx 에서 분리:
      projects    = category === '프로젝트'   → ProjectGrid → PostCard
      experiences = 연구실/대외활동/동아리      → Experience
  → PostCard 클릭 → PostModal: resolveSections(sections) 렌더(없으면 content 폴백)
  → 자격증/기술스택 = profile.js 고정값(About). 자격증 DB 행은 보존하되 화면 미표기.
```

- `posts.sections`(JSONB, 객체 `{intro..skills}`)에 프로젝트 7섹션 본문 저장.
- 기간: `activity_date`(시작) + `end_date`(종료, 진행중이면 NULL) → `formatPeriod`.
- 작성: dev 폼 → `POST /api/posts`(X-Dev-Token 헤더) → 미들웨어 검증 → service_role INSERT → 목록 재조회.

## 7. 검증 (작업 완료 기준)

```bash
npm run lint                 # 통과(0 에러)
npm run build                # 성공
# 보안: 배포 번들에 쓰기 경로/키가 없어야 함(빈 결과 = 통과)
grep -rE "service_role|SUPABASE_SERVICE_ROLE_KEY|/api/posts|X-Dev-Token" dist/
```
- `npm run dev`(5191)에서: 프로젝트 카드 그리드 + 경험 리스트 + 자격증/기술 + 작성 폼 표시.
- `npm run preview`(빌드본)에서: **작성 폼이 보이지 않아야** 함.
- 모바일 폭에서 그리드 1열 + 상세 하단 시트 확인.

## 8. 자주 쓰는 명령

```bash
npm install      # 의존성
npm run dev      # 개발 서버(5191, 작성 폼 포함)
npm run build    # 프로덕션 빌드(dist/)
npm run preview  # 빌드 결과 미리보기(읽기 전용)
npm run lint     # ESLint
```

## 9. 변경 시 동기화 체크리스트

- [ ] 스키마 변경 → `supabase/schema.sql`·`migrations/*`·미들웨어 검증·CLAUDE.md §4/§6 갱신
- [ ] 7섹션 키 변경 → `lib/sections.js` + `vite.config.js`의 `SECTION_KEYS` 동시 수정
- [ ] 색/레이아웃 변경 → `DESIGN.md`
- [ ] 새 컴포넌트/폴더 → 위 디렉터리 트리
- [ ] 쓰기/배포 절차 변경 → `README.md` + `dist` grep 검증 재확인
```
