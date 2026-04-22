import type { IconProps } from "./types";

export function SparkIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2.5v5" />
      <path d="M12 16.5v5" />
      <path d="m4.9 4.9 3.5 3.5" />
      <path d="m15.6 15.6 3.5 3.5" />
      <path d="M2.5 12h5" />
      <path d="M16.5 12h5" />
      <path d="m4.9 19.1 3.5-3.5" />
      <path d="m15.6 8.4 3.5-3.5" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}
