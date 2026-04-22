import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createSessionWithMessage,
  fetchJson,
  queueSessionMessage,
  resumeSessionMessage,
  type ClientV2ProviderName,
} from "../lib/api";
import { providerTabs } from "../config/providerTabs";
import {
  appendStreamingText,
  extractMessageIdFromStart,
  extractTextDelta,
  isStreamingComplete,
  upsertMessage,
} from "../lib/streamMessages";
import type {
  ProjectItem,
  ProviderGroup,
  ProviderStatus,
  SessionItem,
} from "../types/workspace";
import { ChatTranscript } from "./chat/ChatTranscript";
import type { SessionDetailMessage } from "./chat/types";

interface SessionDetailResponse {
  messages: SessionDetailMessage[];
}

interface ConversationStageProps {
  selectedProject: ProjectItem | null;
  selectedProjectId: string | null;
  groupedSessions: Record<ProviderGroup, SessionItem[]>;
  selectedSessions: Record<ProviderGroup, SessionItem | null>;
  providerAvailability: Record<ProviderGroup, ProviderStatus | null>;
  sessionsLoading: boolean;
  sessionsError: string | null;
  refreshProjects: (
    signal?: AbortSignal,
    options?: { silent?: boolean },
  ) => Promise<void>;
  refreshSessions: (
    projectId?: string | null,
    signal?: AbortSignal,
    options?: { silent?: boolean },
  ) => Promise<void>;
  formatRelativeTime: (input: string | null) => string;
}

function providerGroupToApiProvider(group: ProviderGroup): ClientV2ProviderName {
  switch (group) {
    case "claude":
      return "claude";
    case "codex":
      return "codex";
    case "opencode":
      return "opencode";
  }
}

function ProviderComposer({
  placeholder,
  disabled,
  submitting,
  error,
  onSubmit,
}: {
  placeholder: string;
  disabled: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (message: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  async function handleSubmit() {
    const nextValue = value.trim();
    if (!nextValue || disabled || submitting) {
      return;
    }

    await onSubmit(nextValue);
    setValue("");
  }

  return (
    <div className="chat-composer">
      <div className="chat-composer__surface">
        <textarea
          className="chat-composer__textarea"
          value={value}
          placeholder={placeholder}
          disabled={disabled || submitting}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <div className="chat-composer__footer">
          <span className="chat-composer__hint">Ctrl/Command + Enter 发送</span>
          <button
            type="button"
            className="chat-composer__send"
            disabled={disabled || submitting || value.trim().length === 0}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {submitting ? "发送中..." : "发送"}
          </button>
        </div>
        {error ? <div className="chat-composer__error">{error}</div> : null}
      </div>
    </div>
  );
}

function ProviderConversationPanel({
  projectId,
  provider,
  sessions,
  session,
  providerStatus,
  emptyTitle,
  emptyDescription,
  formatRelativeTime,
  refreshProjects,
  refreshSessions,
  onSelectSession,
}: {
  projectId: string;
  provider: ProviderGroup;
  sessions: SessionItem[];
  session: SessionItem | null;
  providerStatus: ProviderStatus | null;
  emptyTitle: string;
  emptyDescription: string;
  formatRelativeTime: (input: string | null) => string;
  refreshProjects: (
    signal?: AbortSignal,
    options?: { silent?: boolean },
  ) => Promise<void>;
  refreshSessions: (
    projectId?: string | null,
    signal?: AbortSignal,
    options?: { silent?: boolean },
  ) => Promise<void>;
  onSelectSession: (sessionId: string) => void;
}) {
  const [messages, setMessages] = useState<SessionDetailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [markdownAugments, setMarkdownAugments] = useState<Record<string, string>>(
    {},
  );
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [processState, setProcessState] = useState<
    "idle" | "in-turn" | "waiting-input" | "hold"
  >("idle");
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [menuDirection, setMenuDirection] = useState<"down" | "up">("down");
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [localSessionTitle, setLocalSessionTitle] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentStreamingMessageIdRef = useRef<string | null>(null);
  const sessionId = localSessionId ?? session?.id ?? null;

  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    if (!query) {
      return sessions;
    }

    return sessions.filter((providerSession) => {
      const title = providerSession.customTitle || providerSession.title || "";
      return title.toLowerCase().includes(query);
    });
  }, [sessionSearch, sessions]);

  async function loadMessages(targetSessionId: string) {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<SessionDetailResponse>(
        `/api/projects/${projectId}/sessions/${targetSessionId}`,
      );
      setMessages(data.messages);
      setMarkdownAugments({});
      setPendingHtml(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "加载消息失败");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (localSessionId && session?.id === localSessionId) {
      setLocalSessionId(null);
      setLocalSessionTitle(null);
    }
  }, [localSessionId, session?.id]);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      setMarkdownAugments({});
      setPendingHtml(null);
      setStreamConnected(false);
      setProcessState("idle");
      return;
    }

    void loadMessages(sessionId);
  }, [projectId, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
    const subscriptionId = crypto.randomUUID();

    function handleStreamEvent(eventType: string, payload: unknown) {
      if (eventType === "message") {
        const message = payload as SessionDetailMessage & Record<string, unknown>;

        const startedId = extractMessageIdFromStart(message);
        if (startedId) {
          currentStreamingMessageIdRef.current = startedId;
          return;
        }

        const textDelta = extractTextDelta(message);
        if (textDelta && currentStreamingMessageIdRef.current) {
          setMessages((current) =>
            appendStreamingText(
              current,
              currentStreamingMessageIdRef.current as string,
              textDelta,
            ),
          );
          return;
        }

        if (isStreamingComplete(message)) {
          currentStreamingMessageIdRef.current = null;
          return;
        }

        if (
          message.type === "assistant" ||
          message.type === "user" ||
          message.type === "system" ||
          message.type === "error"
        ) {
          setMessages((current) => upsertMessage(current, message));
        }
      } else if (eventType === "connected") {
        const connected = payload as {
          state?: "idle" | "in-turn" | "waiting-input" | "hold";
          sessionId?: string;
        };
        setStreamConnected(true);
        setProcessState(connected.state ?? "idle");
        if (connected.sessionId) {
          setLocalSessionId((current) => current ?? connected.sessionId ?? null);
        }
      } else if (eventType === "status") {
        const statusPayload = payload as {
          state?: "idle" | "in-turn" | "waiting-input" | "hold";
        };
        setProcessState(statusPayload.state ?? "idle");
      } else if (eventType === "markdown-augment") {
        const augment = payload as { messageId?: string; html?: string };
        if (augment.messageId && typeof augment.html === "string") {
          setMarkdownAugments((current) => ({
            ...current,
            [augment.messageId as string]: augment.html as string,
          }));
        }
      } else if (eventType === "pending") {
        const pending = payload as { html?: string };
        setPendingHtml(typeof pending.html === "string" ? pending.html : null);
      } else if (eventType === "error") {
        setProcessState("idle");
      } else if (eventType === "complete") {
        currentStreamingMessageIdRef.current = null;
        setPendingHtml(null);
        setProcessState("idle");
        void refreshProjects(undefined, { silent: true });
        void refreshSessions(projectId, undefined, { silent: true });
      } else if (eventType === "session-id-changed") {
        const changed = payload as { newSessionId?: string };
        if (changed.newSessionId) {
          setLocalSessionId(changed.newSessionId);
        }
      }
    }

    ws.addEventListener("open", () => {
      setStreamConnected(true);
      ws.send(
        JSON.stringify({
          type: "subscribe",
          subscriptionId,
          channel: "session",
          sessionId,
        }),
      );
    });

    ws.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          subscriptionId?: string;
          eventType?: string;
          data?: unknown;
          id?: string;
          status?: number;
        };

        if (payload.type === "event" && payload.subscriptionId === subscriptionId) {
          handleStreamEvent(payload.eventType ?? "", payload.data);
        }

        if (
          payload.type === "response" &&
          payload.id === subscriptionId &&
          typeof payload.status === "number" &&
          payload.status >= 400
        ) {
          setStreamConnected(false);
        }
      } catch {
        // Ignore malformed stream payloads.
      }
    });

    ws.addEventListener("close", () => {
      setStreamConnected(false);
    });

    ws.addEventListener("error", () => {
      setStreamConnected(false);
    });

    return () => {
      currentStreamingMessageIdRef.current = null;
      setStreamConnected(false);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "unsubscribe",
            subscriptionId,
          }),
        );
      }
      ws.close();
    };
  }, [projectId, refreshProjects, refreshSessions, sessionId]);

  useLayoutEffect(() => {
    if (!showSessionMenu) {
      return;
    }

    const dropdown = dropdownRef.current;
    if (!dropdown) {
      return;
    }

    const rect = dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedMenuHeight = 360;

    if (spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow) {
      setMenuDirection("up");
    } else {
      setMenuDirection("down");
    }
  }, [filteredSessions.length, showSessionMenu]);

  useEffect(() => {
    if (!showSessionMenu) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      const dropdown = dropdownRef.current;
      if (!dropdown?.contains(event.target as Node)) {
        setShowSessionMenu(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowSessionMenu(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showSessionMenu]);

  async function handleSend(message: string) {
    setSubmitting(true);
    setComposerError(null);

    try {
      if (!sessionId) {
        const result = await createSessionWithMessage(
          projectId,
          message,
          providerGroupToApiProvider(provider),
        );
        setLocalSessionId(result.sessionId);
        setLocalSessionTitle(message);
        onSelectSession(result.sessionId);
        await refreshProjects(undefined, { silent: true });
        await refreshSessions(projectId, undefined, { silent: true });
      } else {
        try {
          await queueSessionMessage(sessionId, message);
        } catch (queueError) {
          const errorMessage =
            queueError instanceof Error ? queueError.message : "";
          const shouldResume =
            errorMessage.includes("404") ||
            errorMessage.includes("No active process") ||
            errorMessage.includes("No active process for session");

          if (!shouldResume) {
            throw queueError;
          }

          await resumeSessionMessage(
            projectId,
            sessionId,
            message,
            providerGroupToApiProvider(provider),
          );
        }

        await refreshProjects(undefined, { silent: true });
        await refreshSessions(projectId, undefined, { silent: true });
      }
    } catch (sendError) {
      setComposerError(
        sendError instanceof Error ? sendError.message : "发送消息失败",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="provider-workspace">
      <div className="provider-workspace__body">
        {providerStatus && !providerStatus.installed ? (
          <div className="chat-shell chat-shell--empty">
            <div className="chat-shell__body">
              <div className="chat-shell__starter">
                <strong>{providerStatus.displayName} 未安装</strong>
                <p>
                  当前设备上还没有可用的 {providerStatus.displayName} 客户端或运行环境，
                  所以这个供应商面板暂时不能发起对话。
                </p>
              </div>
            </div>
          </div>
        ) : !session && !localSessionId ? (
          <div className="chat-shell chat-shell--empty">
            <div className="chat-shell__body">
              <div className="chat-shell__starter">
                <strong>{emptyTitle}</strong>
                <p>{emptyDescription}</p>
              </div>
            </div>
            <ProviderComposer
              placeholder="发送第一条消息"
              disabled={false}
              submitting={submitting}
              error={composerError}
              onSubmit={handleSend}
            />
          </div>
        ) : (
          <div className="chat-shell">
            <div className="chat-shell__body">
              <div className="chat-thread-card">
                <div className="chat-thread-card__header">
                  <div className="chat-thread-card__title-wrap">
                    <span className="section-kicker">
                      {session?.provider ?? providerGroupToApiProvider(provider)}
                    </span>
                    <h4>
                      {session?.customTitle ||
                        session?.title ||
                        localSessionTitle ||
                        "Untitled session"}
                    </h4>
                  </div>
                  <div className="chat-thread-card__status">
                    <span
                      className={
                        streamConnected
                          ? "chat-thread-card__status-dot chat-thread-card__status-dot--connected"
                          : "chat-thread-card__status-dot"
                      }
                    />
                    <span>{processState}</span>
                  </div>
                  {sessions.length > 1 && session ? (
                    <div className="chat-thread-card__dropdown" ref={dropdownRef}>
                      <button
                        type="button"
                        className="chat-thread-card__dropdown-toggle"
                        onClick={() => setShowSessionMenu((current) => !current)}
                        aria-expanded={showSessionMenu}
                        aria-label="切换会话"
                      >
                        <svg
                          className={`chat-thread-card__dropdown-icon ${showSessionMenu ? "is-open" : ""}`}
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="3 6 8 11 13 6" />
                        </svg>
                      </button>
                      {showSessionMenu ? (
                        <div
                          className={
                            menuDirection === "up"
                              ? "chat-thread-card__dropdown-menu chat-thread-card__dropdown-menu--up"
                              : "chat-thread-card__dropdown-menu"
                          }
                        >
                          <div className="chat-thread-card__dropdown-search">
                            <input
                              type="text"
                              value={sessionSearch}
                              placeholder="搜索会话"
                              onChange={(event) => setSessionSearch(event.target.value)}
                            />
                          </div>
                          {filteredSessions.map((providerSession) => (
                            <button
                              key={providerSession.id}
                              type="button"
                              className={
                                providerSession.id === sessionId
                                  ? "chat-thread-card__dropdown-item chat-thread-card__dropdown-item--active"
                                  : "chat-thread-card__dropdown-item"
                              }
                              onClick={() => {
                                onSelectSession(providerSession.id);
                                setShowSessionMenu(false);
                              }}
                            >
                              <span className="chat-thread-card__dropdown-marker" aria-hidden="true">
                                {providerSession.id === sessionId ? "●" : ""}
                              </span>
                              {providerSession.customTitle ||
                                providerSession.title ||
                                "Untitled session"}
                            </button>
                          ))}
                          {filteredSessions.length === 0 ? (
                            <div className="chat-thread-card__dropdown-empty">
                              没有匹配的会话
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="chat-thread">
                {loading ? (
                  <div className="empty-state chat-thread__empty chat-thread__loading">
                    <div className="chat-thread__loading-inline">
                      <span className="chat-thread__spinner" />
                      <strong>正在加载消息...</strong>
                    </div>
                  </div>
                ) : null}

                {!loading && error ? (
                  <div className="empty-state chat-thread__empty">
                    <strong>消息加载失败</strong>
                    <p>{error}</p>
                  </div>
                ) : null}

                {!loading && !error ? (
                  <ChatTranscript
                    messages={messages}
                    markdownAugments={markdownAugments}
                    pendingHtml={pendingHtml}
                  />
                ) : null}
              </div>
            </div>

            <ProviderComposer
              placeholder={
                session?.updatedAt
                  ? `继续当前对话 · ${formatRelativeTime(session.updatedAt)}`
                  : "继续当前对话"
              }
              disabled={false}
              submitting={submitting}
              error={composerError}
              onSubmit={handleSend}
            />
          </div>
        )}
      </div>
    </article>
  );
}

export function ConversationStage({
  selectedProject,
  selectedProjectId,
  groupedSessions,
  selectedSessions,
  providerAvailability,
  sessionsLoading,
  sessionsError,
  refreshProjects,
  refreshSessions,
  formatRelativeTime,
}: ConversationStageProps) {
  const [visibleProviders, setVisibleProviders] = useState<ProviderGroup[]>([
    "claude",
    "codex",
    "opencode",
  ]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<
    Record<ProviderGroup, string | null>
  >({
    claude: selectedSessions.claude?.id ?? null,
    codex: selectedSessions.codex?.id ?? null,
    opencode: selectedSessions.opencode?.id ?? null,
  });

  const orderedVisibleTabs = useMemo(
    () => providerTabs.filter((tab) => visibleProviders.includes(tab.id)),
    [visibleProviders],
  );

  useEffect(() => {
    setSelectedSessionIds((current) => {
      const next = { ...current };
      let changed = false;

      (Object.keys(groupedSessions) as ProviderGroup[]).forEach((provider) => {
        const providerSessions = groupedSessions[provider];
        const currentId = current[provider];

        if (
          currentId &&
          providerSessions.some((session) => session.id === currentId)
        ) {
          return;
        }

        const fallbackId =
          selectedSessions[provider]?.id ?? providerSessions[0]?.id ?? null;
        if (currentId !== fallbackId) {
          next[provider] = fallbackId;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [groupedSessions, selectedSessions]);

  function getSelectedSession(provider: ProviderGroup) {
    const selectedId = selectedSessionIds[provider];
    return (
      groupedSessions[provider].find((session) => session.id === selectedId) ??
      groupedSessions[provider][0] ??
      null
    );
  }

  function toggleProvider(provider: ProviderGroup) {
    setVisibleProviders((current) => {
      if (current.includes(provider)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== provider);
      }

      return [...current, provider];
    });
  }

  return (
    <main className="conversation-stage">
      {selectedProjectId === null ? (
        <div className="empty-state conversation-stage__empty">
          <strong>还没有项目</strong>
          <p>先从左侧添加一个本地项目，再在右侧三栏里同时查看不同供应商的对话面板。</p>
        </div>
      ) : null}

      {selectedProjectId !== null && sessionsLoading ? (
        <div className="empty-state conversation-stage__empty">
          <strong>正在读取对话...</strong>
          <p>正在从项目会话索引里聚合 Claude Code、Codex、OpenCode 的记录。</p>
        </div>
      ) : null}

      {selectedProjectId !== null && !sessionsLoading && sessionsError ? (
        <div className="empty-state conversation-stage__empty">
          <strong>对话加载失败</strong>
          <p>{sessionsError}</p>
        </div>
      ) : null}

      {selectedProjectId !== null && !sessionsLoading && !sessionsError ? (
        <>
          <header className="conversation-stage__topbar">
            <div className="conversation-stage__project-name">
              {selectedProject?.name ?? "Project"}
            </div>
            <div className="conversation-stage__topbar-right">
              <div
                className="conversation-stage__project-path"
                title={selectedProject?.path ?? ""}
              >
                {selectedProject?.path ?? ""}
              </div>
              <div className="conversation-stage__provider-nav" aria-label="供应商显示切换">
                {providerTabs.map((tab) => {
                  const isActive = visibleProviders.includes(tab.id);
                  const { Icon } = tab;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={
                        isActive
                          ? "conversation-stage__provider-toggle conversation-stage__provider-toggle--active"
                          : "conversation-stage__provider-toggle"
                      }
                      onClick={() => toggleProvider(tab.id)}
                      aria-pressed={isActive}
                      title={tab.label}
                    >
                      <Icon className="ui-icon ui-icon--provider-nav" />
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <section
            className={`provider-workspaces provider-workspaces--count-${Math.max(1, orderedVisibleTabs.length)}`}
          >
            {orderedVisibleTabs.map((tab) => (
              <ProviderConversationPanel
                key={tab.id}
                projectId={selectedProjectId}
                provider={tab.id}
                sessions={groupedSessions[tab.id]}
                session={getSelectedSession(tab.id)}
                providerStatus={providerAvailability[tab.id]}
                emptyTitle={tab.emptyTitle}
                emptyDescription={tab.emptyDescription}
                formatRelativeTime={formatRelativeTime}
                refreshProjects={refreshProjects}
                refreshSessions={refreshSessions}
                onSelectSession={(sessionId) =>
                  setSelectedSessionIds((current) => ({
                    ...current,
                    [tab.id]: sessionId,
                  }))
                }
              />
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
