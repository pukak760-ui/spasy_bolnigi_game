// ---- tiny inline SVG icon set ----
interface P {
  className?: string;
}

export const IconHeart = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.2 4.5 6 4.1c2.2-.2 4.2 1 5 2.6h2c.8-1.6 2.8-2.8 5-2.6 3.8.4 5.6 4.5 4 7.6C19.5 16.3 12 21 12 21z" />
  </svg>
);

export const IconFuel = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M5 3h9a1 1 0 0 1 1 1v16H4V4a1 1 0 0 1 1-1zm1 3v5h7V6H6zm12.3 3.2 1.2-1.2a1 1 0 0 1 1.4 0l.6.6c.4.4.4 1 0 1.4L19 12.5V18a2 2 0 1 1-4 0v-3h-1v-2h2a1 1 0 0 1 1 1v3a.5.5 0 0 0 1 0v-4.2l.3-1.6z" />
  </svg>
);

export const IconPause = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const IconPlay = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M7 4.5v15c0 .8.9 1.3 1.6.9l12-7.5c.6-.4.6-1.4 0-1.8l-12-7.5C7.9 3.2 7 3.7 7 4.5z" />
  </svg>
);

export const IconSoundOn = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M4 9v6h4l6 5V4L8 9H4zm13.5 3a3.5 3.5 0 0 0-2-3.2v6.4a3.5 3.5 0 0 0 2-3.2zm-2-7.6v2.1a6 6 0 0 1 0 11v2.1a8 8 0 0 0 0-15.2z" />
  </svg>
);

export const IconSoundOff = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M4 9v6h4l6 5V4L8 9H4zm16.2 3 2.3-2.3-1.4-1.4-2.3 2.3-2.3-2.3-1.4 1.4 2.3 2.3-2.3 2.3 1.4 1.4 2.3-2.3 2.3 2.3 1.4-1.4-2.3-2.3z" />
  </svg>
);

export const IconEngine = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M7 5v2H4v2H2v6h2v2h3v2h8l2-2h2v-2h1v-4h-2v-2h-3l-2-2H7zm3 4h3l2 2h3v6h-3l-2 2h-5l-2-2v-6l4-2z" />
    <path d="M13 8.5 9.5 13H12l-1 3.5 3.5-4.5H12l1-3.5z" />
  </svg>
);

export const IconBrake = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
    <path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const IconMedkit = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M9 3h6v3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4V3zm2 5v3H8v3h3v3h2v-3h3v-3h-3V8h-2z" />
  </svg>
);

export const IconTank = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2s6 7.2 6 12a6 6 0 0 1-12 0c0-4.8 6-12 6-12zm-1.5 13.5a2.5 2.5 0 0 0 2.5 2.5v1.5a4 4 0 0 1-4-4h1.5z" />
  </svg>
);

export const IconSiren = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 3a6 6 0 0 1 6 6v6H6V9a6 6 0 0 1 6-6zM4 17h16v3H4v-3zM12 0v2M4.9 2.9l1.4 1.4M19.1 2.9l-1.4 1.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 3a6 6 0 0 1 6 6v6H6V9a6 6 0 0 1 6-6z" />
  </svg>
);

export const IconCross = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
  </svg>
);

export const IconClock = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z" />
  </svg>
);

export const IconStar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="m12 2 2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.3 5.8 21l1.6-7L2 9.3l7.1-.7L12 2z" />
  </svg>
);

export const IconArrowLeft = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11 4 3 12l8 8 2-2-4.6-4.6H21v-2.8H8.4L13 6l-2-2z" />
  </svg>
);

export const IconRefresh = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 4a8 8 0 0 1 7.4 5H22l-3.5 4.5L15 9h3.3A6 6 0 1 0 18 12h2a8 8 0 1 1-8-8z" />
  </svg>
);

export const IconHome = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="m12 3 9 8h-2v9h-5v-6h-4v6H5v-9H3l9-8z" />
  </svg>
);

export const IconRuble = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M7 3h6a5 5 0 0 1 0 10h-3v2h4v2h-4v4H8v-4H6v-2h2v-2H6v-2h2V3zm2 2v6h4a3 3 0 0 0 0-6H9z" />
  </svg>
);

export const IconWheel = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c4 0 7.3 2.9 7.9 6.7-2.3-1-5-1.5-7.9-1.5s-5.6.5-7.9 1.5C4.7 6.9 8 4 12 4zm-7.9 8.9C6 12.3 8.9 12 12 12s6 .3 7.9.9A8 8 0 0 1 12 20a8 8 0 0 1-7.9-7.1zM12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
  </svg>
);

export const IconMedal = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="m6 2 3.5 7.2a6.5 6.5 0 0 0-2.4 1.6L2.8 4.5 6 2zm12 0 3.2 2.5-4.3 6.3a6.5 6.5 0 0 0-2.4-1.6L18 2zM12 8a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3.2-1 2-2.2.3 1.6 1.6-.4 2.2 2-1 2 1-.4-2.2 1.6-1.6-2.2-.3-1-2z" />
  </svg>
);

export const IconCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m4.5 12.8 4.8 4.7L19.5 6.7" />
  </svg>
);

export const IconLock = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-3-3zm0 9a1.8 1.8 0 0 0-.9 3.4V18a.9.9 0 0 0 1.8 0v-1.6A1.8 1.8 0 0 0 12 13z" />
  </svg>
);

export const IconTrophy = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M6 2h12v2h3v3a5 5 0 0 1-4.6 4.98A6 6 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1a6 6 0 0 1-3.4-3.92A5 5 0 0 1 3 7V4h3V2zm-1 4v1a3 3 0 0 0 2 2.83V6H5zm14 0h-2v3.83A3 3 0 0 0 19 7V6z" />
  </svg>
);

export const IconUser = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 11c4.4 0 8 2.2 8 5v2H4v-2c0-2.8 3.6-5 8-5z" />
  </svg>
);
