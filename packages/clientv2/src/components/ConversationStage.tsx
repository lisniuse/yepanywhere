import { useEffect, useMemo, useState } from "react";
import { providerTabs } from "../config/providerTabs";
import { fetchJson } from "../lib/api";
import type { ProjectItem, ProviderGroup, SessionItem } from "../types/workspace";
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
  sessionsLoading: boolean;
  sessionsError: string | null;
  formatRelativeTime: (input: string | null) => string;
}

function ProviderConversationPanel({
  projectId,
  session,
  emptyTitle,
  emptyDescription,
  formatRelativeTime,
}: {
  projectId: string;
  session: SessionItem | null;
  emptyTitle: string;
  emptyDescription: string;
  formatRelativeTime: (input: string | null) => string;
}) {
  const [messages, setMessages] = useState<SessionDetailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = session?.id ?? null;

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchJson<SessionDetailResponse>(
          `/api/projects/${projectId}/sessions/${sessionId}`,
        );

        if (!cancelled) {
          setMessages(data.messages);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error ? fetchError.message : "加载消息失败",
          );
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [projectId, sessionId]);

  return (
    <article className="provider-workspace">
      <div className="provider-workspace__body">
        {!session ? (
          <div className="chat-shell chat-shell--empty">
            <div className="chat-shell__body">
              <div className="chat-shell__starter">
                <strong>{emptyTitle}</strong>
                <p>{emptyDescription}</p>
              </div>
            </div>
            <div className="chat-composer">
              <div
                className="chat-composer__input"
                role="textbox"
                aria-label="输入框"
              >
                <span className="chat-composer__placeholder">
                  发送第一条消息
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-shell">
            <div className="chat-shell__body">
              <div className="chat-thread-card">
                <div className="chat-thread-card__header">
                  <div>
                    <h4>{session.customTitle || session.title || "Untitled session"}</h4>
                  </div>
                  <span className="session-badge">{session.provider}</span>
                </div>
              </div>

              <div className="chat-thread">
                {loading ? (
                  <div className="empty-state chat-thread__empty">
                    <strong>正在加载消息...</strong>
                  </div>
                ) : null}

                {!loading && error ? (
                  <div className="empty-state chat-thread__empty">
                    <strong>消息加载失败</strong>
                    <p>{error}</p>
                  </div>
                ) : null}

                {!loading && !error ? <ChatTranscript messages={messages} /> : null}
              </div>
            </div>

            <div className="chat-composer">
              <div
                className="chat-composer__input"
                role="textbox"
                aria-label="输入框"
              >
                <span className="chat-composer__placeholder">
                  继续当前对话
                </span>
              </div>
            </div>
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
  sessionsLoading,
  sessionsError,
  formatRelativeTime,
}: ConversationStageProps) {
  const [visibleProviders, setVisibleProviders] = useState<ProviderGroup[]>([
    "claude",
    "codex",
    "opencode",
  ]);

  const orderedVisibleTabs = useMemo(() => {
    return providerTabs.filter((tab) => visibleProviders.includes(tab.id));
  }, [visibleProviders]);

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
              <div className="conversation-stage__project-path" title={selectedProject?.path ?? ""}>
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
              session={selectedSessions[tab.id]}
              emptyTitle={tab.emptyTitle}
              emptyDescription={tab.emptyDescription}
              formatRelativeTime={formatRelativeTime}
            />
          ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
