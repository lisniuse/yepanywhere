import type { IconProps } from "./types";

export function ClaudeIcon(props: IconProps) {
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
      <path d="M15.5 5.5a7 7 0 1 0 0 13" />
      <path d="M15.5 7.8a4.7 4.7 0 1 0 0 8.4" />
    </svg>
  );
}
