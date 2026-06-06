import { useState } from 'react';
import { SECTION_SCHEMA, emptySections } from '../../lib/sections.js';
import './devform.css';

// DEV 전용 프로젝트 작성 폼. /api/posts(개발 서버 미들웨어)로 POST → service_role 저장.
// 이 컴포넌트는 import.meta.env.DEV 가드로 개발에서만 로드된다(프로덕션 번들 제외).
const INITIAL_META = {
  title: '',
  summary: '',
  status: '완료',
  activity_date: '',
  end_date: '',
  tech: '',
  demo_url: '',
  repo_url: '',
};

export default function NewPostForm({ onCreated }) {
  const [meta, setMeta] = useState(INITIAL_META);
  const [sections, setSections] = useState(emptySections());
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null); // { ok: boolean, text: string }

  const ongoing = meta.status === '진행중';
  const completed = meta.status === '완료';

  function setMetaField(key, value) {
    setMeta((m) => ({ ...m, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    const payload = {
      title: meta.title,
      summary: meta.summary,
      status: meta.status,
      activity_date: meta.activity_date,
      end_date: ongoing ? null : meta.end_date || null,
      tech_stack: [...new Set(meta.tech.split(',').map((t) => t.trim()).filter(Boolean))],
      demo_url: meta.demo_url,
      repo_url: meta.repo_url,
      sections,
    };

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Token': import.meta.env.VITE_DEV_WRITE_TOKEN || '',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.details ? ` (${data.details.join(' / ')})` : '';
        setMsg({ ok: false, text: `${data.error || '저장 실패'}${detail}` });
      } else {
        setMsg({ ok: true, text: '저장되었습니다.' });
        setMeta(INITIAL_META);
        setSections(emptySections());
        onCreated?.(data.post);
      }
    } catch (err) {
      setMsg({ ok: false, text: `요청 실패: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="devform" onSubmit={handleSubmit}>
      <div className="devform__head">
        <p className="devform__title">새 프로젝트 작성 (개발 전용)</p>
        <p className="devform__hint">
          이 폼은 로컬 개발 서버에서만 보이며, 배포본에는 포함되지 않습니다. (category는 &ldquo;프로젝트&rdquo; 고정)
        </p>
      </div>

      <div className="devform__grid">
        <label className="field field--full">
          <span className="field__label">제목 *</span>
          <input value={meta.title} onChange={(e) => setMetaField('title', e.target.value)} required />
        </label>

        <label className="field field--full">
          <span className="field__label">한 줄 요약 * (카드에 노출)</span>
          <input value={meta.summary} onChange={(e) => setMetaField('summary', e.target.value)} required />
        </label>

        <label className="field">
          <span className="field__label">상태</span>
          <select value={meta.status} onChange={(e) => setMetaField('status', e.target.value)}>
            <option value="완료">완료</option>
            <option value="진행중">진행중</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">시작일 *</span>
          <input type="date" value={meta.activity_date} onChange={(e) => setMetaField('activity_date', e.target.value)} required />
        </label>

        <label className="field">
          <span className="field__label">종료일{completed ? ' *' : ''}</span>
          <input
            type="date"
            value={ongoing ? '' : meta.end_date}
            onChange={(e) => setMetaField('end_date', e.target.value)}
            disabled={ongoing}
            required={completed}
          />
          {ongoing && <span className="field__hint">진행중이면 종료일은 비웁니다.</span>}
          {completed && (
            <span className="field__hint">완료 프로젝트는 종료 월까지 입력하세요. (단발성이면 시작과 동일하게)</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">기술/태그 (쉼표로 구분)</span>
          <input value={meta.tech} onChange={(e) => setMetaField('tech', e.target.value)} placeholder="React, TypeScript, Vite" />
        </label>

        <label className="field">
          <span className="field__label">데모 URL</span>
          <input value={meta.demo_url} onChange={(e) => setMetaField('demo_url', e.target.value)} placeholder="https://" />
        </label>

        <label className="field">
          <span className="field__label">GitHub URL</span>
          <input value={meta.repo_url} onChange={(e) => setMetaField('repo_url', e.target.value)} placeholder="https://github.com/..." />
        </label>

        {SECTION_SCHEMA.map((s) => (
          <label key={s.key} className="field field--full">
            <span className="field__label">
              {s.no} {s.title}{s.key === 'intro' ? ' *' : ''}
            </span>
            <span className="field__hint">{s.hint}</span>
            <textarea
              value={sections[s.key]}
              onChange={(e) => setSections((prev) => ({ ...prev, [s.key]: e.target.value }))}
              required={s.key === 'intro'}
            />
          </label>
        ))}
      </div>

      <div className="devform__actions">
        <button type="submit" className="btn btn--brand" disabled={submitting}>
          <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
          <span>{submitting ? '저장 중…' : '저장'}</span>
        </button>
        {msg && (
          <span
            className={`devform__msg ${msg.ok ? 'devform__msg--ok' : 'devform__msg--err'}`}
            role="status"
            aria-live="polite"
          >
            <i className={`fa-solid ${msg.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`} aria-hidden="true" />{' '}
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
