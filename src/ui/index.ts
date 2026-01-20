import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import inquirer from 'inquirer';
import type { Story, Feature, StoryStatus, Priority } from '../models/index.js';

// Colors for different statuses
const statusColors: Record<StoryStatus, (text: string) => string> = {
  draft: chalk.gray,
  ready: chalk.blue,
  'in-progress': chalk.yellow,
  done: chalk.green,
};

const priorityColors: Record<Priority, (text: string) => string> = {
  low: chalk.gray,
  medium: chalk.white,
  high: chalk.yellow,
  critical: chalk.red,
};

// Spinner management
let currentSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
  if (currentSpinner) {
    currentSpinner.stop();
  }
  currentSpinner = ora(text).start();
  return currentSpinner;
}

export function stopSpinner(success: boolean = true, text?: string): void {
  if (currentSpinner) {
    if (success) {
      currentSpinner.succeed(text);
    } else {
      currentSpinner.fail(text);
    }
    currentSpinner = null;
  }
}

export function updateSpinner(text: string): void {
  if (currentSpinner) {
    currentSpinner.text = text;
  }
}

// Display utilities
export function displayHeader(text: string): void {
  console.log();
  console.log(chalk.bold.cyan('═'.repeat(50)));
  console.log(chalk.bold.cyan(`  ${text}`));
  console.log(chalk.bold.cyan('═'.repeat(50)));
  console.log();
}

export function displaySubheader(text: string): void {
  console.log();
  console.log(chalk.bold.white(`▸ ${text}`));
  console.log(chalk.gray('─'.repeat(40)));
}

export function displaySuccess(text: string): void {
  console.log(chalk.green(`✓ ${text}`));
}

export function displayError(text: string): void {
  console.log(chalk.red(`✗ ${text}`));
}

export function displayWarning(text: string): void {
  console.log(chalk.yellow(`⚠ ${text}`));
}

export function displayInfo(text: string): void {
  console.log(chalk.blue(`ℹ ${text}`));
}

// Story display
export function displayStory(story: Story, detailed: boolean = false): void {
  const status = statusColors[story.status](story.status.toUpperCase());
  const priority = priorityColors[story.priority](`[${story.priority}]`);

  console.log();
  console.log(`${chalk.bold(story.title)} ${priority} ${status}`);
  console.log(chalk.gray(`ID: ${story.id} | Feature: ${story.feature || 'backlog'}`));

  if (detailed) {
    if (story.asA && story.iWant && story.soThat) {
      console.log();
      console.log(chalk.white(`  As a ${chalk.cyan(story.asA)}`));
      console.log(chalk.white(`  I want ${chalk.cyan(story.iWant)}`));
      console.log(chalk.white(`  So that ${chalk.cyan(story.soThat)}`));
    }

    if (story.acceptanceCriteria.length > 0) {
      console.log();
      console.log(chalk.bold('  Acceptance Criteria:'));
      for (const ac of story.acceptanceCriteria) {
        const checkbox = ac.completed ? chalk.green('✓') : chalk.gray('○');
        console.log(`    ${checkbox} ${ac.text}`);
      }
    }

    if (story.openQuestions.length > 0) {
      console.log();
      console.log(chalk.bold('  Open Questions:'));
      for (const q of story.openQuestions) {
        console.log(chalk.yellow(`    ? ${q}`));
      }
    }

    if (story.edgeCases.length > 0) {
      console.log();
      console.log(chalk.bold('  Edge Cases:'));
      for (const ec of story.edgeCases) {
        console.log(chalk.gray(`    • ${ec}`));
      }
    }
  }
}

// Feature display
export function displayFeature(feature: Feature, storyCount?: number): void {
  const status = statusColors[feature.status](feature.status.toUpperCase());
  const priority = priorityColors[feature.priority](`[${feature.priority}]`);

  console.log();
  console.log(`${chalk.bold(feature.title)} ${priority} ${status}`);
  console.log(chalk.gray(`ID: ${feature.id}`));

  if (feature.description) {
    console.log(chalk.white(`  ${feature.description}`));
  }

  if (storyCount !== undefined) {
    console.log(chalk.gray(`  Stories: ${storyCount}`));
  }

  if (feature.successCriteria.length > 0) {
    console.log(chalk.bold('  Success Criteria:'));
    for (const sc of feature.successCriteria) {
      console.log(chalk.gray(`    • ${sc}`));
    }
  }
}

// Story list display
export function displayStoryList(stories: Story[]): void {
  if (stories.length === 0) {
    console.log(chalk.gray('  No stories found.'));
    return;
  }

  // Group by status
  const grouped = stories.reduce(
    (acc, story) => {
      acc[story.status] = acc[story.status] || [];
      acc[story.status].push(story);
      return acc;
    },
    {} as Record<StoryStatus, Story[]>
  );

  const statusOrder: StoryStatus[] = ['in-progress', 'ready', 'draft', 'done'];

  for (const status of statusOrder) {
    const statusStories = grouped[status];
    if (!statusStories || statusStories.length === 0) continue;

    console.log();
    console.log(statusColors[status](`  ${status.toUpperCase()} (${statusStories.length})`));

    for (const story of statusStories) {
      const priority = priorityColors[story.priority](`[${story.priority.charAt(0).toUpperCase()}]`);
      console.log(`    ${priority} ${story.id}: ${story.title}`);
    }
  }
}

// Progress bar
export function displayProgress(label: string, current: number, total: number): void {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  console.log(`  ${label}: ${bar} ${percentage}% (${current}/${total})`);
}

// Interactive prompts
export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

export async function askQuestion(message: string): Promise<string> {
  const { answer } = await inquirer.prompt([
    {
      type: 'input',
      name: 'answer',
      message,
    },
  ]);
  return answer;
}

export async function askConfirm(message: string, defaultValue: boolean = true): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);
  return confirmed;
}

export async function askSelect(
  message: string,
  options: QuestionOption[]
): Promise<string> {
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message,
      choices: options.map((opt) => ({
        name: opt.description ? `${opt.label} - ${chalk.gray(opt.description)}` : opt.label,
        value: opt.value,
      })),
    },
  ]);
  return selected;
}

export async function askMultiSelect(
  message: string,
  options: QuestionOption[]
): Promise<string[]> {
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message,
      choices: options.map((opt) => ({
        name: opt.description ? `${opt.label} - ${chalk.gray(opt.description)}` : opt.label,
        value: opt.value,
      })),
    },
  ]);
  return selected;
}

// AI streaming display
export function displayAIThinking(): void {
  console.log();
  console.log(chalk.cyan('🤖 AI is thinking...'));
}

export function displayAIResponse(text: string): void {
  // Format AI response with nice styling
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('##')) {
      console.log(chalk.bold.cyan(line));
    } else if (line.startsWith('- ')) {
      console.log(chalk.white(`  ${line}`));
    } else if (line.startsWith('**')) {
      console.log(chalk.bold(line));
    } else {
      console.log(chalk.white(line));
    }
  }
}

// Draft presentation
export function displayDraft(title: string, content: Record<string, unknown>): void {
  console.log();
  console.log(chalk.bold.magenta('┌' + '─'.repeat(48) + '┐'));
  console.log(chalk.bold.magenta(`│ 📝 DRAFT: ${title.padEnd(36)} │`));
  console.log(chalk.bold.magenta('└' + '─'.repeat(48) + '┘'));
  console.log();

  for (const [key, value] of Object.entries(content)) {
    if (value === undefined || value === null) continue;

    const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
    console.log(chalk.bold(`  ${formattedKey}:`));

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'object' && item !== null && 'text' in item) {
          console.log(chalk.white(`    • ${(item as { text: string }).text}`));
        } else {
          console.log(chalk.white(`    • ${item}`));
        }
      }
    } else {
      console.log(chalk.white(`    ${value}`));
    }
  }

  console.log();
}
