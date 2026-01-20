import { Command } from 'commander';
import chalk from 'chalk';
import { loadAppConfig, getAnthropicApiKey } from '../../config/index.js';
import { StorageManager } from '../../storage/index.js';
import { ConversationManager } from '../../ai/index.js';
import {
  displayHeader,
  displayError,
  displayWarning,
  displayInfo,
  displayStory,
  displayStoryList,
} from '../../ui/index.js';

export function storyCommand(program: Command): void {
  const story = program.command('story').description('Manage user stories');

  // story new
  story
    .command('new')
    .description('Create a new user story with AI guidance')
    .action(async () => {
      const apiKey = getAnthropicApiKey();
      if (!apiKey) {
        displayError('ANTHROPIC_API_KEY environment variable is not set.');
        process.exit(1);
      }

      const appConfig = loadAppConfig();
      if (!appConfig.projectPath) {
        displayWarning('No one-p project found. Run "one-p init" first.');
        process.exit(1);
      }

      displayHeader('Create New Story');

      const conversationManager = new ConversationManager(appConfig.projectPath);

      console.log(
        chalk.cyan("I'll help you write a user story. Let's start by understanding what you need.")
      );
      console.log();

      // Initiate the story creation process
      await conversationManager.chat(
        'I want to create a new user story. Please help me by asking questions about what I need.'
      );

      // Continue with interactive prompts handled by the conversation manager
      const readline = await import('readline');
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

          if (trimmedInput.toLowerCase() === 'done' || trimmedInput.toLowerCase() === 'exit') {
            console.log(chalk.cyan('\nStory creation session ended.'));
            rl.close();
            return;
          }

          try {
            await conversationManager.chat(trimmedInput);
          } catch (error) {
            displayError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          prompt();
        });
      };

      prompt();
    });

  // story list
  story
    .command('list')
    .description('List all stories')
    .option('-f, --feature <feature>', 'Filter by feature')
    .option('-s, --status <status>', 'Filter by status (draft, ready, in-progress, done)')
    .action(async (options: { feature?: string; status?: string }) => {
      const appConfig = loadAppConfig();
      if (!appConfig.projectPath) {
        displayWarning('No one-p project found. Run "one-p init" first.');
        process.exit(1);
      }

      displayHeader('Stories');

      const storage = new StorageManager(appConfig.projectPath);
      let stories = await storage.listStories(options.feature);

      if (options.status) {
        stories = stories.filter((s) => s.status === options.status);
      }

      if (stories.length === 0) {
        displayInfo('No stories found.');
        console.log(chalk.gray('Create one with: one-p story new'));
      } else {
        displayStoryList(stories);
      }

      console.log();
    });

  // story show <id>
  story
    .command('show <id>')
    .description('Show details of a specific story')
    .option('-f, --feature <feature>', 'Feature containing the story (default: backlog)')
    .action(async (id: string, options: { feature?: string }) => {
      const appConfig = loadAppConfig();
      if (!appConfig.projectPath) {
        displayWarning('No one-p project found. Run "one-p init" first.');
        process.exit(1);
      }

      const storage = new StorageManager(appConfig.projectPath);
      const featureId = options.feature || 'backlog';
      const story = await storage.getStory(featureId, id);

      if (!story) {
        displayError(`Story "${id}" not found in feature "${featureId}".`);
        process.exit(1);
      }

      displayHeader(`Story: ${story.title}`);
      displayStory(story, true);
      console.log();
    });

  // story review <id>
  story
    .command('review <id>')
    .description('AI review of story quality (INVEST criteria)')
    .option('-f, --feature <feature>', 'Feature containing the story (default: backlog)')
    .action(async (id: string, options: { feature?: string }) => {
      const apiKey = getAnthropicApiKey();
      if (!apiKey) {
        displayError('ANTHROPIC_API_KEY environment variable is not set.');
        process.exit(1);
      }

      const appConfig = loadAppConfig();
      if (!appConfig.projectPath) {
        displayWarning('No one-p project found. Run "one-p init" first.');
        process.exit(1);
      }

      displayHeader(`Reviewing Story: ${id}`);

      const conversationManager = new ConversationManager(appConfig.projectPath);
      const featureId = options.feature || 'backlog';

      await conversationManager.chat(
        `Please analyze the story with ID "${id}" in feature "${featureId}" against the INVEST criteria and provide improvement suggestions.`
      );

      console.log();
    });
}
