import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPosts } from './supabaseClient';
import { profile } from './data/profile.js';
import About from './components/About.jsx';
import Experience from './components/Experience.jsx';
import ProjectGrid from './components/ProjectGrid.jsx';
import PostModal from './components/PostModal.jsx';

// 작성 폼은 개발(npm run dev)에서만 로드 → 프로덕션 빌드에서 청크 제외
const NewPostForm = import.meta.env.DEV
  ? lazy(() => import('./components/dev/NewPostForm.jsx'))
  : null;

// 경험·활동에 표시할 비프로젝트 분류(자격증은 프로필 고정값으로 별도 표기)
const EXPERIENCE_CATEGORIES = ['연구실', '대외활동', '동아리'];

function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const refetchPosts = useCallback(async () => {
    try {
      const data = await fetchPosts();
      setPosts(data || []);
      setError(null);
    } catch (err) {
      console.error('데이터 로딩 에러:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      await refetchPosts();
    }
    load();
  }, [refetchPosts]);

  const projects = useMemo(() => posts.filter((p) => p.category === '프로젝트'), [posts]);
  const experiences = useMemo(
    () => posts.filter((p) => EXPERIENCE_CATEGORIES.includes(p.category)),
    [posts]
  );
  const currentYear = new Date().getFullYear();

  // 안정적인 핸들러: PostModal 효과가 부모 리렌더마다 재실행되지 않도록(포커스 보존)
  const handleClose = useCallback(() => setSelectedPost(null), []);

  if (loading) {
    return (
      <div className="state-screen">
        <p>프로젝트를 불러오는 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-screen">
        <p className="state-screen__error">데이터를 불러오지 못했습니다.</p>
        <p className="state-screen__hint">
          잠시 후 새로고침하거나 Supabase 연결 설정을 확인해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <About profile={profile} />

        <Experience items={experiences} />

        <section className="projects" aria-label="프로젝트">
          <div className="projects__head">
            <h2 className="projects__title">프로젝트</h2>
            <span className="projects__count">{projects.length}개</span>
          </div>
          <ProjectGrid projects={projects} onSelectPost={setSelectedPost} />
        </section>

        {import.meta.env.DEV && NewPostForm && (
          <Suspense fallback={null}>
            <NewPostForm onCreated={refetchPosts} />
          </Suspense>
        )}

        <footer className="site-footer">
          <p>© {currentYear} {profile.name} · Data from Supabase</p>
        </footer>
      </div>

      {selectedPost && (
        <PostModal post={selectedPost} onClose={handleClose} />
      )}
    </div>
  );
}

export default App;
