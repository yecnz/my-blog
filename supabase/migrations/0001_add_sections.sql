-- =============================================================
-- 0001: sections JSONB 추가 + content NOT NULL 해제 + 프로젝트 7섹션 백필
-- 운영 DB 전용. 비파괴(ALTER). DROP TABLE 없음.
-- 이미 posts 테이블/데이터가 존재하는 경우에만 사용.
-- (테이블이 아직 없다면 supabase/schema.sql 을 대신 실행하세요.)
-- Supabase SQL Editor에서 순서대로 실행.
-- =============================================================

-- (0) category 허용값 CHECK 제약 (이미 있으면 건너뜀)
DO $$ BEGIN
  ALTER TABLE posts ADD CONSTRAINT posts_category_chk
    CHECK (category IN ('프로젝트','자격증','연구실','대외활동','동아리'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- (1) sections 컬럼 추가
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '{}'::jsonb;

-- (2) content NOT NULL 해제 (즉시 DROP 안 함 = 롤백 안전)
ALTER TABLE posts
  ALTER COLUMN content DROP NOT NULL;

-- (3) 프로젝트 3건 7섹션 백필
--   ⚠ 운영 적용 시 권장: 먼저 아래로 id 확인 후 WHERE 를 id 기준으로 바꿔 실행
--      SELECT id, title, repo_url FROM posts WHERE category = '프로젝트';
UPDATE posts SET sections = jsonb_build_object(
  'intro',    'MySave — 다시 읽지 않는 북마크 문제를 해결하는 리마인드 기반 북마크 관리 서비스.',
  'overview', '저장만 하고 다시 보지 않는 북마크가 쌓이는 문제를 해결하기 위해, 저장·메모·태그·리마인드·웹 대시보드를 제공하는 팀 프로젝트로 기획했습니다.'
) WHERE repo_url = 'https://github.com/MySave1/MySave-Final-Project';

UPDATE posts SET sections = jsonb_build_object(
  'intro',    'Tongkk — 요약·퀴즈·통계로 학습 흐름을 관리하는 AI 학습 서비스.',
  'overview', '학습 자료를 효율적으로 소화하고 진행 상황을 추적하기 위해, AI 요약·퀴즈 생성·학습 통계를 한 곳에서 제공하는 서비스를 만들었습니다.'
) WHERE repo_url = 'https://github.com/yecnz/tongkk';

UPDATE posts SET sections = jsonb_build_object(
  'intro',    'SurfRide — JavaScript 기반 서핑 테마 웹 미니게임.',
  'overview', '브라우저에서 즐기는 가벼운 미니게임을 목표로, 서핑을 주제로 한 인터랙티브 웹 게임을 제작했습니다.'
) WHERE repo_url = 'https://github.com/hnneul/SurfRide';

-- (4) [데이터 정합] '진행중'이면 end_date 를 NULL 로 (formatPeriod 가 '~ 진행중' 표기)
UPDATE posts SET end_date = NULL WHERE status = '진행중';

-- (5) [후속 릴리스 — 프론트 전환·검증 완료 후 별도 실행] content 완전 제거
-- ALTER TABLE posts DROP COLUMN content;
