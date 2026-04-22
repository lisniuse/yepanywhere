import type { ApiErrorResponse } from "../types/workspace";

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
