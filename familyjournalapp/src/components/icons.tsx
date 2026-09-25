import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const FeedIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3.5" width="14" height="5" rx="1.2" />
    <rect x="3" y="11.5" width="14" height="5" rx="1.2" />
  </Icon>
);

export const TreeIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7.5" y="2.5" width="5" height="4" rx="1" />
    <rect x="2.5" y="13.5" width="5" height="4" rx="1" />
    <rect x="12.5" y="13.5" width="5" height="4" rx="1" />
    <path d="M10 6.5v3.5M5 13.5V10h10v3.5" />
  </Icon>
);

export const PeopleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7.5" cy="7" r="2.75" />
    <path d="M2.5 16.5c.5-2.8 2.5-4.25 5-4.25s4.5 1.45 5 4.25" />
    <path d="M13 4.6a2.6 2.6 0 0 1 0 4.9M14.5 12.4c1.6.5 2.7 1.8 3 4.1" />
  </Icon>
);

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 8.5a5 5 0 0 1 10 0c0 3.5 1.5 5 1.5 5h-13S5 12 5 8.5Z" />
    <path d="M8.25 16.25a1.9 1.9 0 0 0 3.5 0" />
  </Icon>
);

export const PhotoIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.75" y="4" width="14.5" height="12" rx="1.5" />
    <circle cx="7" cy="8.25" r="1.25" />
    <path d="m3 14 4-3.5 3 2.5 3-3 4 3.5" />
  </Icon>
);

export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="7" r="2.75" />
    <path d="M3 16.5c.5-2.8 2.5-4.25 5-4.25 1.3 0 2.4.4 3.3 1.1" />
    <path d="M15 12v5M12.5 14.5h5" />
  </Icon>
);

export const MilestoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 17.5V3" />
    <path d="M5 3.5h9.5l-2 3 2 3H5" />
  </Icon>
);

export const CommentIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 9.5c0-3.3 2.9-5.75 6.5-5.75s6.5 2.45 6.5 5.75-2.9 5.75-6.5 5.75c-.9 0-1.8-.15-2.6-.45L4 16l.9-2.9A5.4 5.4 0 0 1 3.5 9.5Z" />
  </Icon>
);

export const ThumbIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 8.5v8H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h2.5Z" />
    <path d="M6.5 8.5 9.5 3c1.2 0 2 .9 2 2v2.5h3.8a1.5 1.5 0 0 1 1.5 1.8l-1.1 5.5a1.5 1.5 0 0 1-1.5 1.2H6.5" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="5.25" />
    <path d="m13 13 4 4" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 4v12M4 10h12" />
  </Icon>
);

export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10h12" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 5 10 10M15 5 5 15" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5.5 8 4.5 4.5L14.5 8" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m8 5.5 4.5 4.5L8 14.5" />
  </Icon>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 10H4.5M9 5.5 4.5 10 9 14.5" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9" />
    <path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9" />
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="4.5" cy="10" r=".9" fill="currentColor" />
    <circle cx="10" cy="10" r=".9" fill="currentColor" />
    <circle cx="15.5" cy="10" r=".9" fill="currentColor" />
  </Icon>
);

export const FitIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4" />
  </Icon>
);

export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.75" y="4.5" width="14.5" height="11" rx="1.5" />
    <path d="m3.5 5.5 6.5 5 6.5-5" />
  </Icon>
);

// Life event glyphs ---------------------------------------------------------

export const SproutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 17V9.5" />
    <path d="M10 10c0-3-2-5-5.5-5 0 3 2 5 5.5 5Z" />
    <path d="M10 12.5c0-2.5 1.75-4.5 5.5-4.5 0 2.5-1.75 4.5-5.5 4.5Z" />
  </Icon>
);

export const RingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7.5" cy="11.5" r="4" />
    <circle cx="12.5" cy="11.5" r="4" />
    <path d="m6.5 5 1-1.5h2l1 1.5" />
  </Icon>
);

export const CapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m2.5 7.5 7.5-3.5 7.5 3.5-7.5 3.5-7.5-3.5Z" />
    <path d="M5.5 9v3.5c1.2 1.1 2.7 1.75 4.5 1.75s3.3-.65 4.5-1.75V9M17.5 7.5v4.5" />
  </Icon>
);

export const BriefcaseIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.75" y="6" width="14.5" height="10" rx="1.5" />
    <path d="M7.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6M2.75 10.5h14.5" />
  </Icon>
);

export const CandleIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7.5" y="9" width="5" height="8.5" rx=".75" />
    <path d="M10 6.5c-1-.9-1.2-2-.2-3.5 1.4 1.4 1.4 2.8.2 3.5Z" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4.5" width="14" height="12.5" rx="1.5" />
    <path d="M3 8.5h14M7 3v3M13 3v3" />
  </Icon>
);

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 8.5 10 3.5l6.5 5V16a1 1 0 0 1-1 1h-3.25v-4.5h-4.5V17H4.5a1 1 0 0 1-1-1V8.5Z" />
  </Icon>
);

export const HeartIcon = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M10 16.25s-6.25-3.6-6.25-8.1A3.4 3.4 0 0 1 10 6.3a3.4 3.4 0 0 1 6.25 1.85c0 4.5-6.25 8.1-6.25 8.1Z" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 17.25s5.25-4.6 5.25-9A5.25 5.25 0 0 0 4.75 8.25c0 4.4 5.25 9 5.25 9Z" />
    <circle cx="10" cy="8.25" r="1.9" />
  </Icon>
);

export const CakeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 17h13M4.5 17v-5.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5V17" />
    <path d="M4.5 13.25c1.1 0 1.1.9 2.2.9s1.1-.9 2.2-.9 1.1.9 2.2.9 1.1-.9 2.2-.9 1.1.9 2.2.9" />
    <path d="M10 10V7.5M10 5.25c-.6-.5-.7-1.2 0-2 .7.8.6 1.5 0 2Z" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5.5 7.5 10l4.5 4.5" />
  </Icon>
);

export const SmilePlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16.9 9.2A7 7 0 1 1 10.8 3" />
    <path d="M7 11.75c.7.95 1.75 1.5 3 1.5s2.3-.55 3-1.5" />
    <path d="M7.5 8h.01M12.5 8h.01" strokeWidth={2.25} />
    <path d="M15.5 1.75v4.5M13.25 4h4.5" />
  </Icon>
);
