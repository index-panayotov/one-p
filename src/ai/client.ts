import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set.\n' +
          'Please set it with: export ANTHROPIC_API_KEY=your-api-key'
      );
    }

    client = new Anthropic({ apiKey });
  }

  return client;
}

export type MessageRole = 'user' | 'assistant';

export interface ConversationMessage {
  role: MessageRole;
  content: string | Anthropic.Messages.ContentBlock[];
}

export interface StreamCallbacks {
  onText?: (text: string) => void;
  onToolUse?: (toolName: string, toolInput: unknown) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export async function streamMessage(
  systemPrompt: string,
  messages: ConversationMessage[],
  tools: Anthropic.Messages.Tool[],
  callbacks: StreamCallbacks
): Promise<Anthropic.Messages.Message> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages as Anthropic.Messages.MessageParam[],
    tools,
    stream: true,
  });

  let fullMessage: Anthropic.Messages.Message | null = null;
  let currentText = '';

  for await (const event of response) {
    if (event.type === 'message_start') {
      fullMessage = event.message;
    } else if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        currentText += event.delta.text;
        callbacks.onText?.(event.delta.text);
      }
    } else if (event.type === 'content_block_stop') {
      // Content block finished
    } else if (event.type === 'message_delta') {
      if (fullMessage) {
        fullMessage.stop_reason = event.delta.stop_reason ?? null;
      }
    } else if (event.type === 'message_stop') {
      callbacks.onComplete?.();
    }
  }

  // Get the final message
  const finalResponse = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages as Anthropic.Messages.MessageParam[],
    tools,
  });

  return finalResponse;
}

export async function sendMessage(
  systemPrompt: string,
  messages: ConversationMessage[],
  tools: Anthropic.Messages.Tool[]
): Promise<Anthropic.Messages.Message> {
  const client = getAnthropicClient();

  return client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages as Anthropic.Messages.MessageParam[],
    tools,
  });
}
