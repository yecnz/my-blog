// 분류(category) → 배지 CSS 클래스 매핑. 카드/모달이 공유한다. (중복 방지)
export const CATEGORY_CLASS = {
  '프로젝트': 'badge--project', // 갈색 채움
  '자격증': 'badge--cert',     // 연노랑 채움
  '연구실': 'badge--lab',      // 다크브라운 채움
  '대외활동': 'badge--activity', // 갈색 아웃라인
  '동아리': 'badge--club',     // 연노랑 + 갈색 보더
};

export const DEFAULT_CATEGORY_CLASS = 'badge--project';

export function categoryClass(category) {
  return CATEGORY_CLASS[category] || DEFAULT_CATEGORY_CLASS;
}
