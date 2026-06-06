// 메인 그리드의 프로젝트 카드. 클릭하면 상세가 열린다. (메인은 전부 프로젝트라 카테고리 배지 없음)

const MAX_TAGS = 3;

export default function PostCard({ post, onSelect }) {
  const tags = post.tech_stack || [];
  const shownTags = tags.slice(0, MAX_TAGS);
  const restCount = tags.length - shownTags.length;

  return (
    <button
      type="button"
      className="post-card"
      onClick={() => onSelect(post)}
      aria-label={`${post.title} 상세 보기`}
    >
      <div className="post-card__top">
        <span
          className={`badge ${post.status === '진행중' ? 'badge--ongoing' : 'badge--done'}`}
        >
          {post.status}
        </span>
      </div>

      <h3 className="post-card__title">{post.title}</h3>
      <p className="post-card__summary">{post.summary}</p>

      {shownTags.length > 0 && (
        <div className="post-card__tags">
          {shownTags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="chip">{tag}</span>
          ))}
          {restCount > 0 && <span className="chip chip--more">+{restCount}</span>}
        </div>
      )}
    </button>
  );
}
