import Anthropic from '@anthropic-ai/sdk';
import { sendMessage, type ConversationMessage } from './client.js';
import { toolDefinitions, ToolExecutor, type ToolName } from './tools/index.js';
import { BA_SYSTEM_PROMPT } from './prompts/index.js';
import { displayAIResponse, startSpinner, stopSpinner } from '../ui/index.js';
import chalk from 'chalk';

export class ConversationManager {
  private messages: ConversationMessage[] = [];
  private toolExecutor: ToolExecutor;
  private systemPrompt: string;

  constructor(projectPath: string, customSystemPrompt?: string) {
    this.toolExecutor = new ToolExecutor(projectPath);
    this.systemPrompt = customSystemPrompt || BA_SYSTEM_PROMPT;
  }

  async chat(userMessage: string): Promise<void> {
    // Add user message to history
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    // Process the conversation (may involve multiple tool calls)
    await this.processConversation();
  }

  private async processConversation(): Promise<void> {
    let continueLoop = true;

    while (continueLoop) {
      const spinner = startSpinner('Thinking...');

      try {
        // Send message to Claude
        const response = await sendMessage(
          this.systemPrompt,
          this.messages,
          toolDefinitions
        );

        stopSpinner(true);

        // Process the response
        continueLoop = await this.handleResponse(response);
      } catch (error) {
        stopSpinner(false, 'Error communicating with AI');
        console.error(
          chalk.red(
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        );
        continueLoop = false;
      }
    }
  }

  private async handleResponse(
    response: Anthropic.Messages.Message
  ): Promise<boolean> {
    const contentBlocks = response.content;
    const toolUseBlocks: Anthropic.Messages.ToolUseBlock[] = [];
    let hasText = false;

    // Process all content blocks
    for (const block of contentBlocks) {
      if (block.type === 'text') {
        hasText = true;
        console.log();
        displayAIResponse(block.text);
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    // If there are tool calls, execute them
    if (toolUseBlocks.length > 0) {
      // Add assistant message to history
      this.messages.push({
        role: 'assistant',
        content: contentBlocks,
      });

      // Execute each tool and collect results
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const toolName = toolUse.name as ToolName;
        const toolInput = toolUse.input as Record<string, unknown>;

        console.log();
        console.log(chalk.dim(`⚙ Using tool: ${toolName}`));

        const result = await this.toolExecutor.execute(toolName, toolInput);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Add tool results to messages
      this.messages.push({
        role: 'user',
        content: toolResults as unknown as Anthropic.Messages.ContentBlock[],
      });

      // Continue the loop to process the tool results
      return true;
    }

    // If no tool calls and we have text, we're done
    if (hasText && response.stop_reason === 'end_turn') {
      // Add final assistant message
      this.messages.push({
        role: 'assistant',
        content: contentBlocks,
      });
      return false;
    }

    // Check if we should continue
    return response.stop_reason === 'tool_use';
  }

  // Get conversation history for context
  getHistory(): ConversationMessage[] {
    return [...this.messages];
  }

  // Clear conversation history
  clearHistory(): void {
    this.messages = [];
  }

  // Add context to the conversation (e.g., project info)
  addContext(context: string): void {
    this.messages.push({
      role: 'user',
      content: `[Context] ${context}`,
    });
    this.messages.push({
      role: 'assistant',
      content: 'I understand the context. How can I help you?',
    });
  }
}
