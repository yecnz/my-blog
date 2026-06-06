// 공개 사이트의 읽기 경로. 읽기는 PostgREST(GET) 한 번이면 충분하므로
// @supabase/supabase-js 를 클라이언트 번들에 싣지 않고 fetch 로 직접 호출한다.
// (쓰기는 dev 서버 미들웨어가 service_role 로만 수행 — vite.config.js)

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 환경변수가 없으면 모듈 로드 시점에 throw 하지 않고(흰 화면 방지) 런타임에 안내.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// posts 전체를 활동 시작일 내림차순으로. (기존 .select('*').order('activity_date', desc) 와 동일)
export async function fetchPosts() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)가 설정되지 않았습니다.'
    );
  }

  const url = `${SUPABASE_URL}/rest/v1/posts?select=*&order=activity_date.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    let message = `요청 실패 (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* 본문이 JSON이 아니면 기본 메시지 사용 */
    }
    throw new Error(message);
  }

  return res.json();
}
