import type { IconProps } from "./types";

export function CodeBracketsIcon(props: IconProps) {
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
      <path d="m8 7-4 5 4 5" />
      <path d="m16 7 4 5-4 5" />
      <path d="m13.5 5-3 14" />
    </svg>
  );
}
