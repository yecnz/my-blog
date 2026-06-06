// 상단 소개: 이름/역할/소개/링크 + 자격증 + 기술 스택
export default function About({ profile }) {
  const certs = profile.certifications || [];
  const skills = profile.skills || [];

  return (
    <header className="about">
      <p className="about__role">{profile.role}</p>
      <h1 className="about__name">{profile.name}</h1>
      <p className="about__tagline">{profile.tagline}</p>
      <p className="about__intro">{profile.intro}</p>

      {profile.links.length > 0 && (
        <nav className="about__links" aria-label="외부 링크">
          {profile.links.map((link) => (
            <a
              key={link.href}
              className="btn btn--brand"
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              <i className={link.icon} aria-hidden="true" />
              <span>{link.label}</span>
            </a>
          ))}
        </nav>
      )}

      {certs.length > 0 && (
        <section className="about__block" aria-labelledby="about-certs-title">
          <h2 id="about-certs-title" className="about__block-title">자격증</h2>
          <ul className="about__badges">
            {certs.map((c) => (
              <li
                key={c.name}
                className="badge badge--cert"
                title={`${c.full} · ${c.issuer} · ${c.date}`}
              >
                <i className="fa-solid fa-certificate" aria-hidden="true" style={{ marginRight: 6 }} />
                {c.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {skills.length > 0 && (
        <section className="about__block" aria-labelledby="about-skills-title">
          <h2 id="about-skills-title" className="about__block-title">기술 스택</h2>
          <ul className="about__skills">
            {skills.map((s) => (
              <li key={s.name} className="chip chip--skill">
                <i className={s.icon} aria-hidden="true" />
                {s.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </header>
  );
}
