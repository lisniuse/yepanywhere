import type { ComponentType, SVGProps } from "react";

export type ProviderGroup = "claude" | "codex" | "opencode";
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface ProjectItem {
  id: string;
  name: string;
  path: string;
  sessionCount: number;
  activeOwnedCount: number;
  activeExternalCount: number;
  lastActivity: string | null;
}

export interface SessionItem {
  id: string;
  title: string | null;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
  provider: string;
  pendingInputType?: string;
  customTitle?: string;
  isStarred?: boolean;
}

export interface ProviderTab {
  id: ProviderGroup;
  label: string;
  Icon: IconComponent;
  aliases: string[];
  emptyTitle: string;
  emptyDescription: string;
}

export interface ApiErrorResponse {
  error?: string;
}
