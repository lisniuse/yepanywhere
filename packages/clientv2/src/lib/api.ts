import type { ApiErrorResponse } from "../types/workspace";

export type ClientV2ProviderName =
  | "claude"
  | "claude-ollama"
  | "codex"
  | "codex-oss"
  | "opencode";

export async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Yep-Anywhere": "true",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const body = (await response.json()) as ApiErrorResponse;
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Ignore malformed error bodies and keep the default message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function createSessionWithMessage(
  projectId: string,
  message: string,
  provider: ClientV2ProviderName,
) {
  return fetchJson<{
    sessionId: string;
    processId: string;
  }>(`/api/projects/${projectId}/sessions`, {
    method: "POST",
    body: JSON.stringify({
      message,
      provider,
    }),
  });
}

export function queueSessionMessage(sessionId: string, message: string) {
  return fetchJson<{
    queued: boolean;
    restarted?: boolean;
    processId?: string;
  }>(`/api/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      message,
    }),
  });
}

export function resumeSessionMessage(
  projectId: string,
  sessionId: string,
  message: string,
  provider?: ClientV2ProviderName,
) {
  return fetchJson<{
    processId: string;
  }>(`/api/projects/${projectId}/sessions/${sessionId}/resume`, {
    method: "POST",
    body: JSON.stringify({
      message,
      provider,
    }),
  });
}
