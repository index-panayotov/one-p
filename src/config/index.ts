import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ProjectConfigSchema, type ProjectConfig } from '../models/index.js';

const CONFIG_FILE = 'one-p.yaml';
const PROJECTS_DIR = 'projects';

export interface AppConfig {
  projectPath: string | null;
  projectConfig: ProjectConfig | null;
}

export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    const configPath = path.join(currentDir, CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

export function getProjectsDir(rootDir: string): string {
  return path.join(rootDir, PROJECTS_DIR);
}

export function loadProjectConfig(projectPath: string): ProjectConfig | null {
  const configPath = path.join(projectPath, CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const { data } = matter(content);
    return ProjectConfigSchema.parse(data);
  } catch {
    return null;
  }
}

export function saveProjectConfig(projectPath: string, config: ProjectConfig): void {
  const configPath = path.join(projectPath, CONFIG_FILE);
  const content = matter.stringify('', config);
  fs.writeFileSync(configPath, content, 'utf-8');
}

export function initializeProject(projectPath: string, name: string): ProjectConfig {
  // Create directory structure
  const dirs = [
    projectPath,
    path.join(projectPath, 'features'),
    path.join(projectPath, 'personas'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Create project config
  const config: ProjectConfig = {
    name,
    description: `Project: ${name}`,
    personas: [],
    defaultPriority: 'medium',
    createdAt: new Date().toISOString(),
  };

  saveProjectConfig(projectPath, config);

  return config;
}

export function loadAppConfig(): AppConfig {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    return {
      projectPath: null,
      projectConfig: null,
    };
  }

  return {
    projectPath: projectRoot,
    projectConfig: loadProjectConfig(projectRoot),
  };
}

// Re-export settings module
export * from './settings.js';
export * from './setup.js';
