import { ClaudeIcon, CodexIcon, OpenCodeIcon } from "../components/icons";
import type { ProviderTab } from "../types/workspace";

export const providerTabs: ProviderTab[] = [
  {
    id: "claude",
    label: "Claude Code",
    Icon: ClaudeIcon,
    aliases: ["claude", "claude-ollama"],
    emptyTitle: "还没有 Claude Code 会话",
    emptyDescription: "选中项目后，这里会展示该项目下所有 Claude Code 会话。",
  },
  {
    id: "codex",
    label: "Codex",
    Icon: CodexIcon,
    aliases: ["codex", "codex-oss"],
    emptyTitle: "还没有 Codex 会话",
    emptyDescription: "这里会按项目聚合 Codex 与 Codex OSS 的会话。",
  },
  {
    id: "opencode",
    label: "OpenCode",
    Icon: OpenCodeIcon,
    aliases: ["opencode"],
    emptyTitle: "还没有 OpenCode 会话",
    emptyDescription: "当这个项目有 OpenCode 记录后，会在这里直接出现。",
  },
];
