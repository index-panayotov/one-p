import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  AVAILABLE_MODELS,
  saveSettings,
  isValidApiKeyFormat,
  type Settings,
} from './settings.js';
import { displayHeader, displaySuccess, displayError, displayWarning } from '../ui/index.js';

export async function runInitialSetup(): Promise<Settings | null> {
  displayHeader('Welcome to one-p!');

  console.log(chalk.cyan('Before we begin, let\'s configure your settings.'));
  console.log(chalk.gray('Settings will be stored in ~/.one-p/settings.yaml'));
  console.log();

  try {
    // Step 1: Get API Key
    console.log(chalk.bold('Step 1: API Key'));
    console.log(chalk.gray('You need an Anthropic API key to use one-p.'));
    console.log(chalk.gray('Get one at: https://console.anthropic.com/'));
    console.log();

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Anthropic API key:',
        mask: '*',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API key is required';
          }
          if (!isValidApiKeyFormat(input.trim())) {
            return 'Invalid API key format. It should start with "sk-ant-"';
          }
          return true;
        },
      },
    ]);

    console.log();

    // Step 2: Select Model
    console.log(chalk.bold('Step 2: Select Model'));
    console.log(chalk.gray('Choose the Claude model you want to use.'));
    console.log();

    const { model } = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: 'Select a model:',
        choices: AVAILABLE_MODELS.map((m) => ({
          name: `${m.name} - ${chalk.gray(m.description)}`,
          value: m.id,
        })),
        default: 'claude-sonnet-4-20250514',
      },
    ]);

    // Save settings
    const settings: Settings = {
      apiKey: apiKey.trim(),
      model,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSettings(settings);

    console.log();
    displaySuccess('Settings saved successfully!');
    console.log(chalk.gray(`Configuration stored in ~/.one-p/settings.yaml`));
    console.log();

    return settings;
  } catch (error) {
    if ((error as { name?: string }).name === 'ExitPromptError') {
      console.log();
      displayWarning('Setup cancelled.');
      return null;
    }
    displayError(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

export async function promptForApiKey(): Promise<string | null> {
  try {
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Anthropic API key:',
        mask: '*',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API key is required';
          }
          if (!isValidApiKeyFormat(input.trim())) {
            return 'Invalid API key format. It should start with "sk-ant-"';
          }
          return true;
        },
      },
    ]);

    return apiKey.trim();
  } catch {
    return null;
  }
}

export async function promptForModel(): Promise<string | null> {
  try {
    const { model } = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: 'Select a model:',
        choices: AVAILABLE_MODELS.map((m) => ({
          name: `${m.name} - ${chalk.gray(m.description)}`,
          value: m.id,
        })),
      },
    ]);

    return model;
  } catch {
    return null;
  }
}
