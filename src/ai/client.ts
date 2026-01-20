import Anthropic from '@anthropic-ai/sdk';
import { getApiKey, getModel } from '../config/settings.js';

let client: Anthropic | null = null;
let currentApiKey: string | null = null;

export function getAnthropicClient(): Anthropic {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      'No API key configured.\n' +
        'Run "one-p config" to set up your API key, or set ANTHROPIC_API_KEY environment variable.'
    );
  }

  // Recreate client if API key changed
  if (!client || currentApiKey !== apiKey) {
    client = new Anthropic({ apiKey });
    currentApiKey = apiKey;
  }

  return client;
}

export function getCurrentModel(): string {
  return getModel();
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
  const anthropic = getAnthropicClient();
  const model = getCurrentModel();

  const response = await anthropic.messages.create({
    model,
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
  const finalResponse = await anthropic.messages.create({
    model,
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
  const anthropic = getAnthropicClient();
  const model = getCurrentModel();

  return anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages as Anthropic.Messages.MessageParam[],
    tools,
  });
}
