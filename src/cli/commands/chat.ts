import { Command } from 'commander';
import * as readline from 'readline';
import chalk from 'chalk';
import { loadAppConfig, getAnthropicApiKey } from '../../config/index.js';
import { ConversationManager } from '../../ai/index.js';
import { displayHeader, displayError, displayWarning, displayInfo } from '../../ui/index.js';

export function chatCommand(program: Command): void {
  program
    .command('chat')
    .description('Start an interactive AI chat session for story writing')
    .action(async () => {
      // Check for API key
      const apiKey = getAnthropicApiKey();
      if (!apiKey) {
        displayError('ANTHROPIC_API_KEY environment variable is not set.');
        console.log();
        console.log('Set it with:');
        console.log(chalk.cyan('  export ANTHROPIC_API_KEY=your-api-key'));
        console.log();
        process.exit(1);
      }

      // Load project config
      const appConfig = loadAppConfig();

      if (!appConfig.projectPath) {
        displayWarning('No one-p project found in current directory or parents.');
        displayInfo('Run "one-p init" to create a new project, or navigate to an existing one.');
        process.exit(1);
      }

      displayHeader('One-P Interactive Chat');
      console.log(chalk.gray(`Project: ${appConfig.projectConfig?.name || 'Unknown'}`));
      console.log(chalk.gray(`Path: ${appConfig.projectPath}`));
      console.log();
      console.log(chalk.cyan('I\'m your AI assistant for writing user stories and managing requirements.'));
      console.log(chalk.cyan('Type your message and press Enter. Type "exit" or "quit" to leave.'));
      console.log();

      // Initialize conversation manager
      const conversationManager = new ConversationManager(appConfig.projectPath);

      // Add project context
      if (appConfig.projectConfig) {
        conversationManager.addContext(
          `Current project: ${appConfig.projectConfig.name}. ${appConfig.projectConfig.description || ''}`
        );
      }

      // Start interactive loop
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const prompt = (): void => {
        rl.question(chalk.green('\nYou: '), async (input) => {
          const trimmedInput = input.trim();

          if (!trimmedInput) {
            prompt();
            return;
          }

          if (trimmedInput.toLowerCase() === 'exit' || trimmedInput.toLowerCase() === 'quit') {
            console.log();
            console.log(chalk.cyan('Goodbye! Your stories are saved in the project folder.'));
            rl.close();
            process.exit(0);
          }

          if (trimmedInput.toLowerCase() === 'clear') {
            conversationManager.clearHistory();
            console.log(chalk.gray('Conversation history cleared.'));
            prompt();
            return;
          }

          if (trimmedInput.toLowerCase() === 'help') {
            displayChatHelp();
            prompt();
            return;
          }

          try {
            await conversationManager.chat(trimmedInput);
          } catch (error) {
            displayError(
              `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }

          prompt();
        });
      };

      prompt();
    });
}

function displayChatHelp(): void {
  console.log();
  console.log(chalk.bold('Chat Commands:'));
  console.log(chalk.gray('  exit, quit  - End the chat session'));
  console.log(chalk.gray('  clear       - Clear conversation history'));
  console.log(chalk.gray('  help        - Show this help message'));
  console.log();
  console.log(chalk.bold('Things you can ask me:'));
  console.log(chalk.gray('  - "Help me write a user story for [feature]"'));
  console.log(chalk.gray('  - "Create a new feature called [name]"'));
  console.log(chalk.gray('  - "List all stories"'));
  console.log(chalk.gray('  - "Review the story [id] for quality"'));
  console.log(chalk.gray('  - "Search for stories about [topic]"'));
  console.log();
}
