import { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdownToHtml } from "./markdown";
import { preprocessSessionMessages } from "./preprocess";
import type { RenderItem, SessionDetailMessage } from "./types";

const PAGE_SIZE = 10;

function renderToolInput(input: unknown): string {
  if (!input) {
    return "";
  }

  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function RenderTranscriptItem({ item }: { item: RenderItem }) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const markdownHtml = useMemo(() => {
    if (item.type === "assistant_text" || item.type === "user_prompt") {
      if (item.type === "assistant_text" && item.augmentHtml) {
        return item.augmentHtml;
      }
      return renderMarkdownToHtml(item.text);
    }
    return "";
  }, [item]);

  if (item.type === "session_setup") {
    return (
      <details className="chat-meta-card chat-meta-card--setup">
        <summary>Session setup</summary>
        <pre>{item.text}</pre>
      </details>
    );
  }

  if (item.type === "thinking") {
    return (
      <div className="chat-meta-card chat-meta-card--thinking">
        <button
          type="button"
          className="chat-meta-card__toggle"
          onClick={() => setThinkingOpen((current) => !current)}
        >
          <span>Thinking</span>
          <span>{thinkingOpen ? "Hide" : "Show"}</span>
        </button>
        {thinkingOpen ? <pre>{item.text}</pre> : null}
      </div>
    );
  }

  if (item.type === "tool_call") {
    return (
      <div className="chat-meta-card chat-meta-card--tool">
        <button
          type="button"
          className="chat-meta-card__toggle"
          onClick={() => setToolOpen((current) => !current)}
        >
          <span className="chat-meta-card__toggle-main">
            <strong>{item.toolName}</strong>
            <span className={`tool-status tool-status--${item.status}`}>
              {item.status}
            </span>
          </span>
          <span>{toolOpen ? "Hide" : "Show"}</span>
        </button>
        {toolOpen ? (
          <>
            {item.toolInput ? <pre>{renderToolInput(item.toolInput)}</pre> : null}
            {item.toolResultText ? (
              <div className="chat-meta-card__result">
                <pre>{item.toolResultText}</pre>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  if (item.type === "system") {
    return <div className="chat-system-line">{item.text}</div>;
  }

  const bubbleClass =
    item.type === "user_prompt" ? "chat-bubble chat-bubble--user" : "chat-bubble chat-bubble--assistant";

  return markdownHtml ? (
    <div
      className={`${bubbleClass} markdown-content`}
      dangerouslySetInnerHTML={{ __html: markdownHtml }}
    />
  ) : (
    <div className={bubbleClass}>{item.text}</div>
  );
}

export function ChatTranscript({
  messages,
  markdownAugments,
  pendingHtml,
}: {
  messages: SessionDetailMessage[];
  markdownAugments?: Record<string, string>;
  pendingHtml?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () => preprocessSessionMessages(messages, { markdown: markdownAugments }),
    [markdownAugments, messages],
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const previousLengthRef = useRef(0);
  const previousVisibleCountRef = useRef(PAGE_SIZE);
  const shouldAutoScrollRef = useRef(true);
  const preserveScrollRef = useRef<{
    anchorId: string;
    anchorTop: number;
  } | null>(null);
  const restoreFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setLoadingOlder(false);
    preserveScrollRef.current = null;
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const lengthChanged = previousLengthRef.current !== items.length;
    const visibleCountChanged = previousVisibleCountRef.current !== visibleCount;
    previousLengthRef.current = items.length;
    previousVisibleCountRef.current = visibleCount;

    if (!lengthChanged && !visibleCountChanged) {
      return;
    }

    if (preserveScrollRef.current) {
      const { anchorId, anchorTop } = preserveScrollRef.current;
      if (restoreFrameRef.current !== null) {
        cancelAnimationFrame(restoreFrameRef.current);
      }

      restoreFrameRef.current = requestAnimationFrame(() => {
        restoreFrameRef.current = requestAnimationFrame(() => {
          const currentContainer = containerRef.current;
          if (!currentContainer) {
            return;
          }

          const anchorElement = currentContainer.querySelector<HTMLElement>(
            `[data-chat-item-id="${CSS.escape(anchorId)}"]`,
          );
          if (anchorElement) {
            const nextTop = anchorElement.offsetTop - anchorTop;
            currentContainer.scrollTop = Math.max(32, nextTop);
          }
          preserveScrollRef.current = null;
          setLoadingOlder(false);
          restoreFrameRef.current = null;
        });
      });
      return;
    }

    if (loadingOlder) {
      setLoadingOlder(false);
      return;
    }

    if (shouldAutoScrollRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [items.length, visibleCount, loadingOlder, pendingHtml]);

  const visibleItems = useMemo(() => {
    return items.slice(-visibleCount);
  }, [items, visibleCount]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;

    if (loadingOlder) {
      return;
    }

    if (container.scrollTop > 24) {
      return;
    }

    if (visibleCount >= items.length) {
      return;
    }

    const firstVisibleItem = visibleItems[0];
    const firstVisibleElement = firstVisibleItem
      ? container.querySelector<HTMLElement>(
          `[data-chat-item-id="${CSS.escape(firstVisibleItem.id)}"]`,
        )
      : null;

    preserveScrollRef.current = {
      anchorId: firstVisibleItem?.id ?? "",
      anchorTop: firstVisibleElement?.offsetTop ?? 0,
    };
    setLoadingOlder(true);
    setVisibleCount((current) => Math.min(current + PAGE_SIZE, items.length));
  }

  useEffect(() => {
    return () => {
      if (restoreFrameRef.current !== null) {
        cancelAnimationFrame(restoreFrameRef.current);
      }
    };
  }, []);

  if (items.length === 0) {
    return (
      <div className="empty-state chat-thread__empty">
        <strong>这个会话还没有可展示的消息</strong>
        <p>先在下方输入框继续对话，后面这里会显示聊天记录。</p>
      </div>
    );
  }

  return (
    <div className="chat-transcript" ref={containerRef} onScroll={handleScroll}>
      {loadingOlder ? (
        <div className="chat-transcript__loading">
          <span className="chat-transcript__spinner" />
          <span>加载更早消息中...</span>
        </div>
      ) : null}
      {visibleItems.map((item) => (
        <div key={item.id} data-chat-item-id={item.id}>
          <RenderTranscriptItem item={item} />
        </div>
      ))}
      {pendingHtml ? (
        <div
          className="chat-bubble chat-bubble--assistant markdown-content chat-bubble--pending"
          dangerouslySetInnerHTML={{ __html: pendingHtml }}
        />
      ) : null}
    </div>
  );
}
