// 날짜 파싱 + 기간 표기 유틸. (calendar.js에서 분리 — 달력 제거 후에도 상세 뷰에서 사용)

// "2024-12-13" 같은 DATE 문자열을 타임존 영향 없이 직접 파싱.
export function parseYearMonth(dateStr) {
  const [year, month] = String(dateStr).split('-').map(Number);
  return { year, month };
}

// 상세에 표시할 기간 문자열. 예) "2025년 7월 ~ 9월", "2026년 4월 ~ 진행중"
export function formatPeriod(post) {
  if (!post?.activity_date) return '';
  const s = parseYearMonth(post.activity_date);
  if (!Number.isFinite(s.year) || !Number.isFinite(s.month)) return '';
  const startStr = `${s.year}년 ${s.month}월`;
  if (post.end_date) {
    const e = parseYearMonth(post.end_date);
    if (e.year === s.year && e.month === s.month) return startStr;
    if (e.year === s.year) return `${startStr} ~ ${e.month}월`;
    return `${startStr} ~ ${e.year}년 ${e.month}월`;
  }
  if (post.status === '진행중') return `${startStr} ~ 진행중`;
  return startStr;
}
