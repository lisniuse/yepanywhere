import type { IconProps } from "./types";

export function CodexIcon(props: IconProps) {
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
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
      <path d="M4.5 12h15" />
    </svg>
  );
}
