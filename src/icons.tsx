import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const base = ({ size = 24, ...rest }: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...rest,
})

/** Stack of flashcards: used for the Review tab and deck badges. */
export const CardsIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="6.5" y="3" width="13" height="9.5" rx="1.5" fill="currentColor" fillOpacity=".15" />
    <rect x="3.5" y="7.5" width="13" height="13" rx="1.5" fill="var(--paper)" strokeWidth="2.4" />
    <path d="M7 12.5h6M7 16h4" />
  </svg>
)

export const BoxIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8Z" fill="currentColor" fillOpacity=".15" strokeWidth="2.4" />
    <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h17A1.5 1.5 0 0 1 22 4.5V8H2V4.5Z" strokeWidth="2.4" />
    <path d="M10 12h4" strokeWidth="2.4" />
  </svg>
)

export const GearIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" strokeWidth="2.4" />
    <path
      strokeWidth="2.2"
      d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
    />
  </svg>
)

export const PlayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" />
  </svg>
)

export const PencilIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
  </svg>
)

export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const BackIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const UndoIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
)

export const SyncIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 11a8 8 0 0 0-14.5-4.5M4 4v3h3" />
    <path d="M4 13a8 8 0 0 0 14.5 4.5M20 20v-3h-3" />
  </svg>
)

export const DueIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
)

export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5 10 17l9-10" />
  </svg>
)

export const SparkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v16M4 12h16" />
  </svg>
)
