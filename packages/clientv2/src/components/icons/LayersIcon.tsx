import type { IconProps } from "./types";

export function LayersIcon(props: IconProps) {
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
      <path d="m12 4 7 4-7 4-7-4 7-4Z" />
      <path d="m5 12 7 4 7-4" />
      <path d="m5 16 7 4 7-4" />
    </svg>
  );
}
