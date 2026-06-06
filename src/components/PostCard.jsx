// 메인 그리드의 프로젝트 카드. 제목 버튼을 누르면 상세가 열린다.
// 접근성: 카드는 <article>, 제목은 실제 <h3>로 두어 스크린리더 제목 탐색을 보존하고,
// 클릭 대상은 제목 안의 <button>(::after 오버레이로 카드 전체가 클릭 영역). (메인은 전부 프로젝트라 카테고리 배지 없음)

const MAX_TAGS = 3;

export default function PostCard({ post, onSelect }) {
  const tags = post.tech_stack || [];
  const shownTags = tags.slice(0, MAX_TAGS);
  const restCount = tags.length - shownTags.length;

  return (
    <article className="post-card">
      <div className="post-card__top">
        <span
          className={`badge ${post.status === '진행중' ? 'badge--ongoing' : 'badge--done'}`}
        >
          {post.status}
        </span>
      </div>

      <h3 className="post-card__title">
        <button
          type="button"
          className="post-card__link"
          onClick={() => onSelect(post)}
        >
          {post.title}
        </button>
      </h3>
      <p className="post-card__summary">{post.summary}</p>

      {shownTags.length > 0 && (
        <div className="post-card__tags">
          {shownTags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="chip">{tag}</span>
          ))}
          {restCount > 0 && <span className="chip chip--more">+{restCount}</span>}
        </div>
      )}
    </article>
  );
}
