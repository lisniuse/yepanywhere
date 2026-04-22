import type {
  MessageContentBlock,
  RenderItem,
  SessionDetailMessage,
  ToolResultContentBlock,
  ToolUseContentBlock,
} from "./types";

const SESSION_SETUP_PREFIXES = [
  "# AGENTS.md instructions",
  "<environment_context>",
];

function getMessageId(message: SessionDetailMessage, fallback: string): string {
  return message.uuid || message.id || fallback;
}

function getContent(message: SessionDetailMessage): unknown {
  return message.message?.content ?? message.content;
}

function getRole(message: SessionDetailMessage): string | undefined {
  return message.message?.role ?? message.role ?? message.type;
}

function normalizeTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (!block || typeof block !== "object") {
        return "";
      }
      const text = (block as { text?: unknown; thinking?: unknown }).text;
      if (typeof text === "string") {
        return text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractToolResultText(block: ToolResultContentBlock): string {
  const content = block.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      const text = (item as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function isSessionSetupText(text: string): boolean {
  const normalized = text.trimStart();
  return SESSION_SETUP_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function preprocessSessionMessages(
  messages: SessionDetailMessage[],
  augments?: { markdown?: Record<string, string> },
): RenderItem[] {
  const items: RenderItem[] = [];
  const pendingToolCalls = new Map<string, number>();

  messages.forEach((message, index) => {
    const fallbackId = `message-${index}`;
    const messageId = getMessageId(message, fallbackId);
    const role = getRole(message);
    const content = getContent(message);

    if (message.type === "error" || typeof message.error === "string") {
      items.push({
        type: "system",
        id: messageId,
        text: message.error || "Agent error",
      });
      return;
    }

    if (message.type === "system") {
      return;
    }

    if (role === "user") {
      const text = normalizeTextContent(content);
      if (text) {
        items.push({
          type: isSessionSetupText(text) ? "session_setup" : "user_prompt",
          id: messageId,
          text,
        });
      }

      if (Array.isArray(content)) {
        content.forEach((block) => {
          if (!block || typeof block !== "object") {
            return;
          }

          const typedBlock = block as ToolResultContentBlock;
          if (typedBlock.type !== "tool_result" || !typedBlock.tool_use_id) {
            return;
          }

          const toolCallIndex = pendingToolCalls.get(typedBlock.tool_use_id);
          if (toolCallIndex === undefined) {
            return;
          }

          const existing = items[toolCallIndex];
          if (!existing || existing.type !== "tool_call") {
            return;
          }

          items[toolCallIndex] = {
            ...existing,
            toolResultText: extractToolResultText(typedBlock),
            status: typedBlock.is_error ? "error" : "complete",
          };
          pendingToolCalls.delete(typedBlock.tool_use_id);
        });
      }

      return;
    }

    if (typeof content === "string") {
      if (content.trim()) {
        items.push({
          type: "assistant_text",
          id: messageId,
          text: content.trim(),
          augmentHtml: augments?.markdown?.[messageId],
        });
      }
      return;
    }

    if (!Array.isArray(content)) {
      return;
    }

    content.forEach((block, blockIndex) => {
      if (!block || typeof block !== "object") {
        return;
      }

      const itemId = `${messageId}-${blockIndex}`;
      const typedBlock = block as MessageContentBlock;

      if (typedBlock.type === "text" && typeof typedBlock.text === "string") {
        const text = typedBlock.text.trim();
        if (text) {
          items.push({
            type: "assistant_text",
            id: itemId,
            text,
            augmentHtml: augments?.markdown?.[messageId],
          });
        }
        return;
      }

      if (
        typedBlock.type === "thinking" &&
        typeof typedBlock.thinking === "string"
      ) {
        const text = typedBlock.thinking.trim();
        if (text) {
          items.push({
            type: "thinking",
            id: itemId,
            text,
          });
        }
        return;
      }

      if (typedBlock.type === "tool_use") {
        const toolBlock = typedBlock as ToolUseContentBlock;
        const toolUseId = toolBlock.id || itemId;
        const nextIndex = items.length;
        items.push({
          type: "tool_call",
          id: toolUseId,
          toolName: toolBlock.name || "Tool call",
          toolInput: toolBlock.input,
          status: "pending",
        });
        pendingToolCalls.set(toolUseId, nextIndex);
      }
    });
  });

  return items;
}
