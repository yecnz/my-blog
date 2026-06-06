import { useEffect, useRef } from 'react';
import { formatPeriod } from '../lib/dates.js';
import { resolveSections } from '../lib/sections.js';
import { categoryClass } from '../lib/categories.js';

// 프로젝트 카드 클릭 시 열리는 상세. 7섹션을 렌더하고, 없으면 content로 폴백.
// 접근성: role=dialog, 포커스 트랩, ESC/배경 클릭 닫기, 스크롤 잠금. (DESIGN.md §9)
export default function PostModal({ post, onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        // 포커스 트랩: 다이얼로그 내부 순환
        const focusables = panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) {
          e.preventDefault();
          panelRef.current?.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  if (!post) return null;

  const period = formatPeriod(post);
  const badgeClass = categoryClass(post.category);
  const tags = post.tech_stack || [];
  const sections = resolveSections(post.sections);
  // 링크는 http(s)만 허용(javascript:/data: 등 차단)
  const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null);
  const demoUrl = safeUrl(post.demo_url);
  const repoUrl = safeUrl(post.repo_url);
  const hasSections = sections.length > 0;
  const legacy = (post.content || '').trim();
  const titleId = `detail-title-${post.id}`;

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail__head">
          <div className="detail__meta">
            <span className={`badge ${badgeClass}`}>{post.category}</span>
            <span className={`badge ${post.status === '진행중' ? 'badge--ongoing' : 'badge--done'}`}>
              {post.status}
            </span>
            <span className="detail__period">{period}</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="detail__close"
            onClick={onClose}
            aria-label="닫기"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="detail__body">
          <h2 id={titleId} className="detail__title">{post.title}</h2>
          {post.summary && <p className="detail__summary">{post.summary}</p>}

          {tags.length > 0 && (
            <div className="detail__tags">
              {tags.map((tag, i) => (
                <span key={`${tag}-${i}`} className="chip">{tag}</span>
              ))}
            </div>
          )}

          {(demoUrl || repoUrl) && (
            <div className="detail__links">
              {demoUrl && (
                <a className="btn btn--brand" href={demoUrl} target="_blank" rel="noreferrer noopener">
                  <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                  <span>데모 보기</span>
                </a>
              )}
              {repoUrl && (
                <a className="btn btn--outline" href={repoUrl} target="_blank" rel="noreferrer noopener">
                  <i className="fa-brands fa-github" aria-hidden="true" />
                  <span>GitHub</span>
                </a>
              )}
            </div>
          )}

          {hasSections ? (
            sections.map((s) => (
              <section key={s.key} className="detail-section">
                <h3 className="detail-section__title">
                  <span className="detail-section__no">{s.no}</span>
                  <span>{s.title}</span>
                </h3>
                <p className="detail-section__body">{s.body}</p>
              </section>
            ))
          ) : legacy ? (
            <p className="detail-section__body">{legacy}</p>
          ) : (
            <p className="detail__empty">본문이 준비 중입니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
