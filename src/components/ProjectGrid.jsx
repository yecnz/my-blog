import PostCard from './PostCard.jsx';

// 프로젝트 카드 반응형 그리드. 비어 있으면 안내.
export default function ProjectGrid({ projects, onSelectPost }) {
  if (!projects?.length) {
    return (
      <div className="project-grid project-grid--empty" role="status">
        <i className="fa-regular fa-folder-open project-grid__empty-icon" aria-hidden="true" />
        <p className="project-grid__empty-text">아직 등록된 프로젝트가 없습니다.</p>
      </div>
    );
  }
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
