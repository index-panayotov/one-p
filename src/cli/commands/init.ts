import { Command } from 'commander';
import * as path from 'path';
import { initializeProject } from '../../config/index.js';
import { displaySuccess, displayError, displayHeader } from '../../ui/index.js';

export function initCommand(program: Command): void {
  program
    .command('init [name]')
    .description('Initialize a new one-p project')
    .option('-p, --path <path>', 'Path for the project (default: current directory)')
    .action(async (name: string | undefined, options: { path?: string }) => {
      try {
        const projectName = name || 'my-project';
        const projectPath = options.path
          ? path.resolve(options.path)
          : path.join(process.cwd(), projectName);

        displayHeader(`Initializing Project: ${projectName}`);

        const config = initializeProject(projectPath, projectName);

        displaySuccess(`Project "${config.name}" initialized at ${projectPath}`);
        console.log();
        console.log('Next steps:');
        console.log(`  cd ${projectName}`);
        console.log('  one-p chat');
        console.log();
      } catch (error) {
        displayError(
          `Failed to initialize project: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        process.exit(1);
      }
    });
}
