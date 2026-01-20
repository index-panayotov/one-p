import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand, chatCommand, storyCommand, featureCommand, searchCommand, configCommand } from './commands/index.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('one-p')
    .description('AI-Powered CLI for Business Analysts & Product Owners')
    .version('1.0.0');

  // Display banner on help
  program.addHelpText('beforeAll', () => {
    return `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                           ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.white('one-p')} - AI-Powered Story Writing Assistant             ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('For Business Analysts & Product Owners')}                  ${chalk.cyan('║')}
${chalk.cyan('║')}                                                           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;
  });

  // Register commands
  initCommand(program);
  configCommand(program);
  chatCommand(program);
  storyCommand(program);
  featureCommand(program);
  searchCommand(program);

  return program;
}
