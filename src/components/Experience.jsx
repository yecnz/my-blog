import { formatPeriod } from '../lib/dates.js';
import { categoryClass } from '../lib/categories.js';

// 비프로젝트 활동(연구실/대외활동/동아리)을 컴팩트 리스트로. DB(posts) 행을 받는다.
// 정적 리스트(클릭 없음) — 상세는 프로젝트만 연다.
export default function Experience({ items }) {
  if (!items?.length) return null;

  return (
    <section className="experience" aria-labelledby="experience-title">
      <div className="experience__head">
        <h2 id="experience-title" className="experience__title">경험 · 활동</h2>
      </div>
      <ul className="experience__list">
        {items.map((item) => (
          <li key={item.id} className="exp-item">
            <span className={`badge ${categoryClass(item.category)}`}>{item.category}</span>
            <div className="exp-item__body">
              <p className="exp-item__title">{item.title}</p>
              <p className="exp-item__summary">{item.summary}</p>
            </div>
            <span className="exp-item__period">{formatPeriod(item)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
