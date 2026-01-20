import { Command } from 'commander';
import chalk from 'chalk';
import { loadAppConfig, settingsExist, getApiKey } from '../../config/index.js';
import { runInitialSetup } from '../../config/setup.js';
import { StorageManager } from '../../storage/index.js';
import { ConversationManager } from '../../ai/index.js';
import {
  displayHeader,
  displayError,
  displayWarning,
  displayInfo,
  displayFeature,
  displayProgress,
} from '../../ui/index.js';

async function ensureApiKey(): Promise<boolean> {
  if (!settingsExist()) {
    console.log(chalk.cyan('First time setup required.'));
    console.log();
    const settings = await runInitialSetup();
    if (!settings) {
      displayError('Setup cancelled.');
      return false;
    }
    console.log();
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    displayError('No API key configured.');
    console.log('Run "one-p config" to set up your API key.');
    return false;
  }

  return true;
}

export function featureCommand(program: Command): void {
  const feature = program.command('feature').description('Manage features/epics');

  // feature new
  feature
    .command('new')
    .description('Create a new feature/epic with AI guidance')
    .action(async () => {
      if (!(await ensureApiKey())) {
        process.exit(1);
      }

      const appConfig = loadAppConfig();
      if (!appConfig.projectPath) {
        displayWarning('No one-p project found. Run "one-p init" first.');
        process.exit(1);
      }

      displayHeader('Create New Feature');

      const conversationManager = new ConversationManager(appConfig.projectPath);

      console.log(
        chalk.cyan("I'll help you define a new feature. Let's understand what you're building.")
      );
      console.log();

      await conversationManager.chat(
        'I want to create a new feature/epic. Please help me define it with proper structure and success criteria.'
      );

      // Continue with interactive prompts
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
            console.log(chalk.cyan('\nFeature creation session ended.'));
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

  // feature list
  feature
    .command('list')
    .description('List all features/epics')
    .action(async () => {
      const appConfig = loadAppConfig();
      if (!appConfig.projectPath) {
        displayWarning('No one-p project found. Run "one-p init" first.');
        process.exit(1);
      }

      displayHeader('Features');

      const storage = new StorageManager(appConfig.projectPath);
      const features = await storage.listFeatures();

      if (features.length === 0) {
        displayInfo('No features found.');
        console.log(chalk.gray('Create one with: one-p feature new'));
      } else {
        for (const feat of features) {
          const stories = await storage.listStories(feat.id);
          displayFeature(feat, stories.length);

          // Show progress if there are stories
          if (stories.length > 0) {
            const doneCount = stories.filter((s) => s.status === 'done').length;
            const inProgressCount = stories.filter((s) => s.status === 'in-progress').length;

            console.log();
            displayProgress('Completed', doneCount, stories.length);
            displayProgress('In Progress', inProgressCount, stories.length);
          }
        }
      }

      console.log();
    });

  // feature show <id>
  feature
    .command('show <id>')
    .description('Show details of a specific feature')
    .action(async (id: string) => {
      const appConfig = loadAppConfig();
      if (!appConfig.projectPath) {
        displayWarning('No one-p project found. Run "one-p init" first.');
        process.exit(1);
      }

      const storage = new StorageManager(appConfig.projectPath);
      const feat = await storage.getFeature(id);

      if (!feat) {
        displayError(`Feature "${id}" not found.`);
        process.exit(1);
      }

      displayHeader(`Feature: ${feat.title}`);
      displayFeature(feat);

      // Show stories in this feature
      const stories = await storage.listStories(id);
      if (stories.length > 0) {
        console.log();
        console.log(chalk.bold('Stories:'));
        for (const story of stories) {
          console.log(chalk.gray(`  - [${story.status}] ${story.id}: ${story.title}`));
        }
      }

      console.log();
    });
}
