import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import matter from 'gray-matter';

// Available Claude models
export const AVAILABLE_MODELS = [
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    description: 'Most capable model, best for complex analysis',
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Balanced performance and speed',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Fast and efficient for most tasks',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fastest, good for simple tasks',
  },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];

// Settings schema
export const SettingsSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().default('claude-sonnet-4-20250514'),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Settings = z.infer<typeof SettingsSchema>;

// Get the one-p home directory
export function getOnePHomeDir(): string {
  return path.join(os.homedir(), '.one-p');
}

// Get the settings file path
export function getSettingsPath(): string {
  return path.join(getOnePHomeDir(), 'settings.yaml');
}

// Ensure the home directory exists
export function ensureOnePHomeDir(): void {
  const homeDir = getOnePHomeDir();
  if (!fs.existsSync(homeDir)) {
    fs.mkdirSync(homeDir, { recursive: true });
  }
}

// Check if settings exist
export function settingsExist(): boolean {
  return fs.existsSync(getSettingsPath());
}

// Load settings from file
export function loadSettings(): Settings | null {
  const settingsPath = getSettingsPath();

  if (!fs.existsSync(settingsPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(settingsPath, 'utf-8');
    const { data } = matter(content);
    return SettingsSchema.parse(data);
  } catch {
    return null;
  }
}

// Save settings to file
export function saveSettings(settings: Settings): void {
  ensureOnePHomeDir();
  const settingsPath = getSettingsPath();

  const updatedSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  const content = matter.stringify('', updatedSettings);
  fs.writeFileSync(settingsPath, content, 'utf-8');

  // Set restrictive permissions on the file (contains API key)
  try {
    fs.chmodSync(settingsPath, 0o600);
  } catch {
    // Ignore chmod errors on Windows
  }
}

// Update specific settings
export function updateSettings(updates: Partial<Settings>): Settings | null {
  const current = loadSettings();
  if (!current) {
    return null;
  }

  const updated: Settings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveSettings(updated);
  return updated;
}

// Delete settings
export function deleteSettings(): boolean {
  const settingsPath = getSettingsPath();

  if (fs.existsSync(settingsPath)) {
    fs.unlinkSync(settingsPath);
    return true;
  }

  return false;
}

// Get API key from settings or environment
export function getApiKey(): string | null {
  // Environment variable takes precedence
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Fall back to settings
  const settings = loadSettings();
  return settings?.apiKey || null;
}

// Get model from settings
export function getModel(): string {
  const settings = loadSettings();
  return settings?.model || 'claude-sonnet-4-20250514';
}

// Validate API key format (basic check)
export function isValidApiKeyFormat(key: string): boolean {
  // Anthropic API keys start with 'sk-ant-'
  return key.startsWith('sk-ant-') && key.length > 20;
}

// Get model info by ID
export function getModelInfo(modelId: string): (typeof AVAILABLE_MODELS)[number] | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId);
}
