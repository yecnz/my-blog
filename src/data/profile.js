// About 섹션에 표시되는 프로필 정보. (수정이 잦은 값이라 한 곳에 모음)
// 자격증·기술스택은 이 파일이 단일 진실(SSOT). 경험(인턴/대외활동/동아리)은 DB(posts)에서 가져온다.
export const profile = {
  name: '송연지',
  role: 'Frontend Developer',
  tagline: '꾸준히 쌓아 올린 프론트엔드 성장 기록',
  intro:
    '코드로 화면을 만드는 일을 좋아하는 프론트엔드 개발자입니다. ' +
    '학습과 프로젝트를 기록하며 꾸준히 성장하고 있습니다.',

  links: [
    { label: 'GitHub', href: 'https://github.com/yecnz', icon: 'fa-brands fa-github' },
  ],

  // 자격증 (Font Awesome 인증 아이콘 사용)
  certifications: [
    { name: 'SQLD', full: 'SQL 개발자', issuer: '한국데이터산업진흥원', date: '2024-12' },
    { name: 'ADsP', full: '데이터분석 준전문가', issuer: '한국데이터산업진흥원', date: '2025-03' },
  ],

  // 기술 스택 (icon: Font Awesome 클래스)
  skills: [
    { name: 'JavaScript', icon: 'fa-brands fa-js' },
    { name: 'TypeScript', icon: 'fa-solid fa-code' },
    { name: 'React', icon: 'fa-brands fa-react' },
    { name: 'Vite', icon: 'fa-solid fa-bolt' },
    { name: 'HTML', icon: 'fa-brands fa-html5' },
    { name: 'CSS', icon: 'fa-brands fa-css3-alt' },
    { name: 'Git', icon: 'fa-brands fa-git-alt' },
  ],
};
