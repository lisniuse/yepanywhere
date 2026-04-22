export interface SessionDetailMessage {
  id?: string;
  uuid?: string;
  type?: string;
  role?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
  content?: unknown;
  error?: string;
}

export interface TextContentBlock {
  type: "text";
  text: string;
}

export interface ThinkingContentBlock {
  type: "thinking";
  thinking: string;
}

export interface ToolUseContentBlock {
  type: "tool_use";
  id?: string;
  name?: string;
  input?: unknown;
}

export interface ToolResultContentBlock {
  type: "tool_result";
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

export type MessageContentBlock =
  | TextContentBlock
  | ThinkingContentBlock
  | ToolUseContentBlock
  | ToolResultContentBlock
  | Record<string, unknown>;

export type RenderItem =
  | {
      type: "user_prompt";
      id: string;
      text: string;
    }
  | {
      type: "assistant_text";
      id: string;
      text: string;
    }
  | {
      type: "thinking";
      id: string;
      text: string;
    }
  | {
      type: "tool_call";
      id: string;
      toolName: string;
      toolInput?: unknown;
      toolResultText?: string;
      status: "pending" | "complete" | "error";
    }
  | {
      type: "session_setup";
      id: string;
      text: string;
    }
  | {
      type: "system";
      id: string;
      text: string;
    };
