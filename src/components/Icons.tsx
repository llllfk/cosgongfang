import * as React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const SparklesIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const PaletteIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.6 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5-4.5-8.8-10-8.8z" />
  </svg>
);

export const CrystalIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2L4 9l8 13 8-13-8-7z" />
    <path d="M12 2L7 9h10L12 2z" />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

export const ShirtIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
  </svg>
);

export const ScissorsIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const StarIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const GemIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
    <line x1="12" y1="22" x2="12" y2="8.5" />
    <polyline points="22 8.5 12 8.5 2 8.5" />
  </svg>
);

/** Q版上色卡通人物（粗描边平涂，仿贴纸感） */
const qChibi = (size = 28): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 64 64',
  fill: 'none',
  'aria-hidden': true,
});

const ink = '#1A1228';

/** 大厅 — Q版草帽少年 */
export const NavHomeChibi: React.FC<IconProps> = ({ size = 28, className, ...p }) => (
  <svg {...qChibi(size)} className={className} {...p}>
    <ellipse cx="32" cy="59" rx="15" ry="3" fill="#000" opacity="0.2" />
    <path
      d="M19 40c1-3 5-5 13-5s12 2 13 5v10c0 3-6 5-13 5s-13-2-13-5V40z"
      fill="#E63946"
      stroke={ink}
      strokeWidth="2.2"
    />
    <path d="M25 42v10M39 42v10" stroke={ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
    <circle cx="32" cy="26" r="15" fill="#FFD6B0" stroke={ink} strokeWidth="2.2" />
    <path
      d="M17 24c0-9 6-14 15-14 4 0 7 1 10 3l2-5 2 5c2 1 3 3 3 6"
      fill="#2B2118"
      stroke={ink}
      strokeWidth="2"
    />
    <path d="M22 12l-2-5M28 9l0-5M36 9l1-5M42 12l3-5" stroke="#2B2118" strokeWidth="2.6" strokeLinecap="round" />
    <ellipse cx="32" cy="14" rx="19" ry="5.5" fill="#F4C430" stroke={ink} strokeWidth="2.2" />
    <path d="M18 14c1-7 6-11 14-11s13 4 14 11" fill="#F4C430" stroke={ink} strokeWidth="2.2" />
    <path d="M16 14.5h32" stroke="#E85D04" strokeWidth="3" strokeLinecap="round" />
    <path d="M24 29l3 1.5M24.5 31l2.5 1" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="26" cy="26" r="2.4" fill={ink} />
    <circle cx="38" cy="26" r="2.4" fill={ink} />
    <circle cx="26.7" cy="25.3" r="0.75" fill="#fff" />
    <circle cx="38.7" cy="25.3" r="0.75" fill="#fff" />
    <path d="M27 33c2 3 5 4 5 4s3-1 5-4" stroke={ink} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <circle cx="21" cy="30" r="2.3" fill="#FF8FAB" />
    <circle cx="43" cy="30" r="2.3" fill="#FF8FAB" />
  </svg>
);

/** 报告 — Q版驯鹿医生 */
export const NavAnalyzeChibi: React.FC<IconProps> = ({ size = 28, className, ...p }) => (
  <svg {...qChibi(size)} className={className} {...p}>
    <ellipse cx="32" cy="59" rx="15" ry="3" fill="#000" opacity="0.2" />
    <ellipse cx="32" cy="46" rx="13" ry="11" fill="#C4A484" stroke={ink} strokeWidth="2.2" />
    <ellipse cx="32" cy="48" rx="7" ry="5" fill="#F5E6D3" stroke={ink} strokeWidth="1.6" />
    <circle cx="32" cy="26" r="14" fill="#C4A484" stroke={ink} strokeWidth="2.2" />
    <ellipse cx="32" cy="30" rx="8" ry="7" fill="#F5E6D3" stroke={ink} strokeWidth="1.6" />
    <path d="M22 16c-3-6-1-10 1-11" stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M20 12h4M21 8h3" stroke="#8B5E3C" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M42 16c3-6 1-10-1-11" stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M40 12h4M41 8h3" stroke="#8B5E3C" strokeWidth="2.2" strokeLinecap="round" />
    <ellipse cx="32" cy="14" rx="12" ry="5" fill="#4CC9F0" stroke={ink} strokeWidth="2" />
    <path d="M22 14c1-6 5-9 10-9s9 3 10 9" fill="#4CC9F0" stroke={ink} strokeWidth="2" />
    <path d="M28 10h8M32 6v8" stroke="#FF85A1" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="27" cy="27" r="2" fill={ink} />
    <circle cx="37" cy="27" r="2" fill={ink} />
    <circle cx="32" cy="32" r="2.4" fill="#E85D04" stroke={ink} strokeWidth="1.4" />
    <path d="M29.5 36c1 1.2 2 1.6 2.5 1.6s1.5-.4 2.5-1.6" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="50" cy="40" r="5.5" fill="#A8E6CF" stroke={ink} strokeWidth="2" />
    <circle cx="50" cy="40" r="3" fill="#E8FFF5" stroke={ink} strokeWidth="1.4" />
    <path d="M45 40c-4 1-7 4-8 8" stroke={ink} strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

/** 设计稿 — Q版橙发航海士 */
export const NavDesignChibi: React.FC<IconProps> = ({ size = 28, className, ...p }) => (
  <svg {...qChibi(size)} className={className} {...p}>
    <ellipse cx="32" cy="59" rx="15" ry="3" fill="#000" opacity="0.2" />
    <path
      d="M20 40c1-3 5-5 12-5s11 2 12 5v10c0 3-5.5 5-12 5s-12-2-12-5V40z"
      fill="#4895EF"
      stroke={ink}
      strokeWidth="2.2"
    />
    <circle cx="32" cy="25" r="14.5" fill="#FFD6B0" stroke={ink} strokeWidth="2.2" />
    <path
      d="M17 24c1-11 8-16 15-16 8 0 14 5 15 16-2-1-3 6-3 10 0 0-2-4-5-5 0 4-1 8-3 10 0-4-1-7-4-8-1 5-3 9-5 11 1-5 0-9-2-11-2 3-4 6-5 8 1-5 0-10-3-14z"
      fill="#FF9F1C"
      stroke={ink}
      strokeWidth="2"
    />
    <circle cx="26.5" cy="25" r="2.2" fill={ink} />
    <circle cx="37.5" cy="25" r="2.2" fill={ink} />
    <circle cx="27.2" cy="24.3" r="0.7" fill="#fff" />
    <circle cx="38.2" cy="24.3" r="0.7" fill="#fff" />
    <path d="M29 31c1.2 1.8 2.6 2.4 3 2.4s1.8-.6 3-2.4" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    <circle cx="22" cy="29" r="2" fill="#FF8FAB" />
    <circle cx="42" cy="29" r="2" fill="#FF8FAB" />
    <rect x="44" y="38" width="14" height="16" rx="2" fill="#FFF8E7" stroke={ink} strokeWidth="1.8" />
    <path d="M48 43h6M48 47h5M48 51h6" stroke={ink} strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
    <path d="M42 36l6-8 2 1.5-5 9z" fill="#F4A261" stroke={ink} strokeWidth="1.5" />
  </svg>
);

/** 绘梦 — Q版长鼻小画家 */
export const NavDrawChibi: React.FC<IconProps> = ({ size = 28, className, ...p }) => (
  <svg {...qChibi(size)} className={className} {...p}>
    <ellipse cx="32" cy="59" rx="15" ry="3" fill="#000" opacity="0.2" />
    <path
      d="M20 41c1-3 5-5 12-5s11 2 12 5v9c0 3-5.5 5-12 5s-12-2-12-5v-9z"
      fill="#2D6A4F"
      stroke={ink}
      strokeWidth="2.2"
    />
    <circle cx="32" cy="26" r="13.5" fill="#FFD6B0" stroke={ink} strokeWidth="2.2" />
    <path
      d="M18 24c1-10 7-15 14-15s13 5 14 15c-2-4-6-6-14-6s-12 2-14 6z"
      fill="#3D2B1F"
      stroke={ink}
      strokeWidth="2"
    />
    <rect x="20" y="10" width="10" height="7" rx="2" fill="#4CC9F0" stroke={ink} strokeWidth="1.8" />
    <rect x="34" y="10" width="10" height="7" rx="2" fill="#4CC9F0" stroke={ink} strokeWidth="1.8" />
    <path d="M30 13.5h4" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="32" cy="30" rx="3.2" ry="7" fill="#FFD6B0" stroke={ink} strokeWidth="1.8" />
    <circle cx="25" cy="25" r="2" fill={ink} />
    <circle cx="39" cy="25" r="2" fill={ink} />
    <circle cx="25.6" cy="24.4" r="0.65" fill="#fff" />
    <circle cx="39.6" cy="24.4" r="0.65" fill="#fff" />
    <path d="M28 36c1.5 1.5 3 2 4 2s2.5-.5 4-2" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M48 32l9-14 2.4 1.6-7.5 15-3.9-2.6z" fill="#E9C46A" stroke={ink} strokeWidth="1.7" />
    <path d="M57 18l2.8-4" stroke="#E63946" strokeWidth="3.2" strokeLinecap="round" />
    <circle cx="60.2" cy="12.5" r="2.6" fill="#E63946" stroke={ink} strokeWidth="1.4" />
  </svg>
);

/** 角色 — Q版绿发剑士 */
export const NavProfileChibi: React.FC<IconProps> = ({ size = 28, className, ...p }) => (
  <svg {...qChibi(size)} className={className} {...p}>
    <ellipse cx="32" cy="59" rx="15" ry="3" fill="#000" opacity="0.2" />
    <path
      d="M20 40c1-3 5-5 12-5s11 2 12 5v10c0 3-5.5 5-12 5s-12-2-12-5V40z"
      fill="#2B2118"
      stroke={ink}
      strokeWidth="2.2"
    />
    <path d="M26 43h12" stroke="#52B788" strokeWidth="2" strokeLinecap="round" />
    <circle cx="32" cy="25" r="14.5" fill="#FFD6B0" stroke={ink} strokeWidth="2.2" />
    <path
      d="M17 24c1-11 8-16.5 15-16.5S47 13 47 24c-3-5-7-8-15-8s-12 3-15 8z"
      fill="#52B788"
      stroke={ink}
      strokeWidth="2"
    />
    <path
      d="M20 13l-4-8M26 9l-2-7M32 7v-6M38 9l2-7M44 13l4-8"
      stroke="#52B788"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path d="M48 34l8 14M52 32l2 16M56 34l-2 14" stroke="#B8B8B8" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M48 34l8 14M52 32l2 16M56 34l-2 14" stroke={ink} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    <circle cx="26" cy="25" r="2.3" fill={ink} />
    <path d="M35 22l6 6M41 22l-6 6" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    <circle cx="26.7" cy="24.3" r="0.7" fill="#fff" />
    <path d="M28 32c1.5 1.8 3 2.4 4 2.4s2.5-.6 4-2.4" stroke={ink} strokeWidth="2" strokeLinecap="round" />
  </svg>
);
