import type { IconProps } from "./types";

export function LogoBadgeIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 8 4 4 4-4" />
      <path d="M12 12v5" />
    </svg>
  );
}
