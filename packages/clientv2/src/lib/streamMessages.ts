import type { SessionDetailMessage } from "../components/chat/types";

export function extractTextDelta(message: Record<string, unknown>): string | null {
  if (message.type !== "stream_event") {
    return null;
  }

  const event = message.event as Record<string, unknown> | undefined;
  if (!event) {
    return null;
  }

  if (event.type === "content_block_delta") {
    const delta = event.delta as Record<string, unknown> | undefined;
    if (delta?.type === "text_delta" && typeof delta.text === "string") {
      return delta.text;
    }
  }

  return null;
}

export function extractMessageIdFromStart(
  message: Record<string, unknown>,
): string | null {
  if (message.type !== "stream_event") {
    return null;
  }

  const event = message.event as Record<string, unknown> | undefined;
  if (!event || event.type !== "message_start") {
    return null;
  }

  const eventMessage = event.message as Record<string, unknown> | undefined;
  return typeof eventMessage?.id === "string" ? eventMessage.id : null;
}

export function isStreamingComplete(message: Record<string, unknown>): boolean {
  if (message.type !== "stream_event") {
    return message.type === "result";
  }

  const event = message.event as Record<string, unknown> | undefined;
  return event?.type === "message_stop";
}

function getMessageId(message: SessionDetailMessage): string | null {
  return message.uuid ?? message.id ?? null;
}

export function upsertMessage(
  messages: SessionDetailMessage[],
  nextMessage: SessionDetailMessage,
): SessionDetailMessage[] {
  const nextId = getMessageId(nextMessage);
  if (!nextId) {
    return [...messages, nextMessage];
  }

  const index = messages.findIndex((message) => getMessageId(message) === nextId);
  if (index === -1) {
    return [...messages, nextMessage];
  }

  const updated = [...messages];
  updated[index] = nextMessage;
  return updated;
}

export function appendStreamingText(
  messages: SessionDetailMessage[],
  messageId: string,
  textDelta: string,
): SessionDetailMessage[] {
  const index = messages.findIndex((message) => getMessageId(message) === messageId);

  if (index === -1) {
    return [
      ...messages,
      {
        uuid: messageId,
        type: "assistant",
        message: {
          role: "assistant",
          content: textDelta,
        },
      },
    ];
  }

  const target = messages[index];
  const existingContent =
    typeof target?.message?.content === "string"
      ? target.message.content
      : typeof target?.content === "string"
        ? target.content
        : "";

  const updated = [...messages];
  updated[index] = {
    ...target,
    type: "assistant",
    message: {
      ...(target?.message ?? {}),
      role: "assistant",
      content: `${existingContent}${textDelta}`,
    },
  };
  return updated;
}
