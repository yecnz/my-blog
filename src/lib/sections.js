// 7섹션 양식의 단일 진실(SSOT). 폼·상세·미들웨어가 모두 이 모듈만 참조한다.
// sections 자료구조는 객체 { key: value } 로 통일.
export const SECTION_SCHEMA = [
  { key: 'intro',    no: '01', title: '프로젝트 소개', hint: '서비스명 / 특징 + 한 줄 소개' },
  { key: 'overview', no: '02', title: '프로젝트 개요', hint: '배경 · 목적' },
  { key: 'work',     no: '03', title: '진행한 일',     hint: '배경-문제-핵심-해결' },
  { key: 'process',  no: '04', title: '과정',          hint: '직접 액션 + 인사이트' },
  { key: 'result',   no: '05', title: '결과물',        hint: '최종 내용 + 포인트' },
  { key: 'growth',   no: '06', title: '성장한 점',     hint: '성과 또는 배운점' },
  { key: 'skills',   no: '07', title: '나의 역량',     hint: '느낀점 + 배운점 + 다짐' },
];

// 미들웨어 화이트리스트와 동일한 키 목록
export const SECTION_KEYS = SECTION_SCHEMA.map((s) => s.key);

// 빈 폼 초기값 { intro:'', ..., skills:'' }
export function emptySections() {
  return Object.fromEntries(SECTION_SCHEMA.map((s) => [s.key, '']));
}

// sections(객체) → 본문이 있는 섹션만 [{key,no,title,hint,body}] (렌더 순서 = SCHEMA 순서)
export function resolveSections(sections) {
  if (!sections || typeof sections !== 'object') return [];
  return SECTION_SCHEMA
    .map((s) => ({ ...s, body: (sections[s.key] ?? '').toString().trim() }))
    .filter((s) => s.body.length > 0);
}
