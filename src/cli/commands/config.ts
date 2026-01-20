import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  loadSettings,
  saveSettings,
  deleteSettings,
  settingsExist,
  getOnePHomeDir,
  AVAILABLE_MODELS,
  getModelInfo,
  isValidApiKeyFormat,
  type Settings,
} from '../../config/settings.js';
import { runInitialSetup } from '../../config/setup.js';
import {
  displayHeader,
  displaySuccess,
  displayError,
  displayWarning,
  displayInfo,
} from '../../ui/index.js';

export function configCommand(program: Command): void {
  const config = program
    .command('config')
    .description('Manage one-p configuration');

  // config (no subcommand) - show current config or run setup
  config.action(async () => {
    if (!settingsExist()) {
      // First time - run setup
      await runInitialSetup();
    } else {
      // Show current config
      showCurrentConfig();
    }
  });

  // config show - display current settings
  config
    .command('show')
    .description('Display current configuration')
    .action(() => {
      showCurrentConfig();
    });

  // config set - interactive settings update
  config
    .command('set')
    .description('Update configuration settings')
    .action(async () => {
      await updateSettings();
    });

  // config set-key - set API key
  config
    .command('set-key')
    .description('Set or update API key')
    .action(async () => {
      await setApiKey();
    });

  // config set-model - set model
  config
    .command('set-model')
    .description('Set or update the Claude model')
    .action(async () => {
      await setModel();
    });

  // config reset - delete all settings
  config
    .command('reset')
    .description('Reset all settings (requires confirmation)')
    .action(async () => {
      await resetSettings();
    });

  // config path - show config file path
  config
    .command('path')
    .description('Show configuration directory path')
    .action(() => {
      console.log(getOnePHomeDir());
    });
}

function showCurrentConfig(): void {
  const settings = loadSettings();

  displayHeader('Current Configuration');

  if (!settings) {
    displayWarning('No configuration found.');
    console.log(chalk.gray('Run "one-p config" to set up.'));
    return;
  }

  console.log(chalk.bold('API Key:'));
  // Mask the API key for security
  const maskedKey = maskApiKey(settings.apiKey);
  console.log(`  ${maskedKey}`);
  console.log();

  console.log(chalk.bold('Model:'));
  const modelInfo = getModelInfo(settings.model);
  if (modelInfo) {
    console.log(`  ${modelInfo.name} (${settings.model})`);
    console.log(chalk.gray(`  ${modelInfo.description}`));
  } else {
    console.log(`  ${settings.model}`);
  }
  console.log();

  console.log(chalk.bold('Config Location:'));
  console.log(chalk.gray(`  ${getOnePHomeDir()}/settings.yaml`));
  console.log();

  console.log(chalk.gray(`Created: ${new Date(settings.createdAt).toLocaleString()}`));
  console.log(chalk.gray(`Updated: ${new Date(settings.updatedAt).toLocaleString()}`));
}

function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return '***';
  }
  return key.substring(0, 8) + '...' + key.substring(key.length - 4);
}

async function updateSettings(): Promise<void> {
  const settings = loadSettings();

  if (!settings) {
    displayWarning('No configuration found. Running initial setup...');
    await runInitialSetup();
    return;
  }

  displayHeader('Update Configuration');

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'What would you like to update?',
      choices: [
        { name: 'API Key', value: 'apiKey' },
        { name: 'Model', value: 'model' },
        { name: 'Both', value: 'both' },
        { name: 'Cancel', value: 'cancel' },
      ],
    },
  ]);

  if (choice === 'cancel') {
    console.log(chalk.gray('Cancelled.'));
    return;
  }

  if (choice === 'apiKey' || choice === 'both') {
    await setApiKey();
  }

  if (choice === 'model' || choice === 'both') {
    await setModel();
  }
}

async function setApiKey(): Promise<void> {
  const settings = loadSettings();

  if (!settings) {
    displayWarning('No configuration found. Running initial setup...');
    await runInitialSetup();
    return;
  }

  console.log();
  console.log(chalk.gray('Current API key: ' + maskApiKey(settings.apiKey)));
  console.log();

  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter new API key:',
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

  const updatedSettings: Settings = {
    ...settings,
    apiKey: apiKey.trim(),
    updatedAt: new Date().toISOString(),
  };

  saveSettings(updatedSettings);
  displaySuccess('API key updated successfully!');
}

async function setModel(): Promise<void> {
  const settings = loadSettings();

  if (!settings) {
    displayWarning('No configuration found. Running initial setup...');
    await runInitialSetup();
    return;
  }

  const currentModelInfo = getModelInfo(settings.model);
  console.log();
  console.log(chalk.gray(`Current model: ${currentModelInfo?.name || settings.model}`));
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
      default: settings.model,
    },
  ]);

  const updatedSettings: Settings = {
    ...settings,
    model,
    updatedAt: new Date().toISOString(),
  };

  saveSettings(updatedSettings);

  const newModelInfo = getModelInfo(model);
  displaySuccess(`Model updated to ${newModelInfo?.name || model}!`);
}

async function resetSettings(): Promise<void> {
  if (!settingsExist()) {
    displayInfo('No configuration to reset.');
    return;
  }

  displayWarning('This will delete all your one-p settings including your API key.');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to reset all settings?',
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray('Cancelled.'));
    return;
  }

  deleteSettings();
  displaySuccess('Settings have been reset.');
  console.log(chalk.gray('Run "one-p config" to set up again.'));
}
