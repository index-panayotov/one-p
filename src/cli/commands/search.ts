import { Command } from 'commander';
import chalk from 'chalk';
import { loadAppConfig } from '../../config/index.js';
import { StorageManager } from '../../storage/index.js';
import { displayHeader, displayWarning, displayInfo, displayStoryList } from '../../ui/index.js';

export function searchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search across all stories')
    .action(async (query: string) => {
      const appConfig = loadAppConfig();
      if (!appConfig.projectPath) {
        displayWarning('No one-p project found. Run "one-p init" first.');
        process.exit(1);
      }

      displayHeader(`Search: "${query}"`);

      const storage = new StorageManager(appConfig.projectPath);
      const stories = await storage.searchStories(query);

      if (stories.length === 0) {
        displayInfo(`No stories found matching "${query}".`);
      } else {
        console.log(chalk.gray(`Found ${stories.length} matching stories:`));
        displayStoryList(stories);
      }

      console.log();
    });
}
