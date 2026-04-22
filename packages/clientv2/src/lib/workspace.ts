import { providerTabs } from "../config/providerTabs";
import type { ProviderGroup } from "../types/workspace";

export function formatRelativeTime(input: string | null): string {
  if (!input) {
    return "暂无活动";
  }

  const timestamp = new Date(input).getTime();
  if (Number.isNaN(timestamp)) {
    return "时间未知";
  }

  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export function providerGroupFromName(provider: string): ProviderGroup | null {
  for (const tab of providerTabs) {
    if (tab.aliases.includes(provider)) {
      return tab.id;
    }
  }

  return null;
}

export const pickerWindow = window as Window & {
  showDirectoryPicker?: () => Promise<{ name?: string }>;
};
