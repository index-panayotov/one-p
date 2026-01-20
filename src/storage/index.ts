import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import {
  StorySchema,
  FeatureSchema,
  type Story,
  type Feature,
  type AcceptanceCriterion,
} from '../models/index.js';

// Convert story to markdown content
export function storyToMarkdown(story: Story): string {
  const frontmatter = {
    id: story.id,
    title: story.title,
    type: story.type,
    status: story.status,
    priority: story.priority,
    feature: story.feature,
    persona: story.persona,
    estimate: story.estimate,
    tags: story.tags,
    dependencies: story.dependencies,
    relatedStories: story.relatedStories,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  };

  // Remove undefined values
  Object.keys(frontmatter).forEach((key) => {
    if ((frontmatter as Record<string, unknown>)[key] === undefined) {
      delete (frontmatter as Record<string, unknown>)[key];
    }
  });

  let content = '';

  // User Story section
  if (story.asA || story.iWant || story.soThat) {
    content += '## User Story\n\n';
    if (story.asA) content += `**As a** ${story.asA}\n`;
    if (story.iWant) content += `**I want** ${story.iWant}\n`;
    if (story.soThat) content += `**So that** ${story.soThat}\n`;
    content += '\n';
  }

  // Acceptance Criteria
  if (story.acceptanceCriteria.length > 0) {
    content += '## Acceptance Criteria\n\n';
    for (const ac of story.acceptanceCriteria) {
      const checkbox = ac.completed ? '[x]' : '[ ]';
      content += `- ${checkbox} ${ac.text}\n`;
    }
    content += '\n';
  }

  // Open Questions
  if (story.openQuestions.length > 0) {
    content += '## Open Questions\n\n';
    for (let i = 0; i < story.openQuestions.length; i++) {
      content += `${i + 1}. ${story.openQuestions[i]}\n`;
    }
    content += '\n';
  }

  // Edge Cases
  if (story.edgeCases.length > 0) {
    content += '## Edge Cases\n\n';
    for (const ec of story.edgeCases) {
      content += `- ${ec}\n`;
    }
    content += '\n';
  }

  return matter.stringify(content, frontmatter);
}

// Parse markdown to story
export function markdownToStory(content: string): Story {
  const { data, content: bodyContent } = matter(content);

  // Parse acceptance criteria from content
  const acceptanceCriteria: AcceptanceCriterion[] = [];
  const acMatch = bodyContent.match(/## Acceptance Criteria\n\n([\s\S]*?)(?=\n## |$)/);
  if (acMatch) {
    const lines = acMatch[1].split('\n').filter((l) => l.trim().startsWith('- '));
    for (const line of lines) {
      const completed = line.includes('[x]');
      const text = line.replace(/^- \[[ x]\] /, '').trim();
      if (text) {
        acceptanceCriteria.push({ text, completed });
      }
    }
  }

  // Parse open questions
  const openQuestions: string[] = [];
  const oqMatch = bodyContent.match(/## Open Questions\n\n([\s\S]*?)(?=\n## |$)/);
  if (oqMatch) {
    const lines = oqMatch[1].split('\n').filter((l) => /^\d+\. /.test(l.trim()));
    for (const line of lines) {
      const text = line.replace(/^\d+\. /, '').trim();
      if (text) openQuestions.push(text);
    }
  }

  // Parse edge cases
  const edgeCases: string[] = [];
  const ecMatch = bodyContent.match(/## Edge Cases\n\n([\s\S]*?)(?=\n## |$)/);
  if (ecMatch) {
    const lines = ecMatch[1].split('\n').filter((l) => l.trim().startsWith('- '));
    for (const line of lines) {
      const text = line.replace(/^- /, '').trim();
      if (text) edgeCases.push(text);
    }
  }

  // Parse user story components
  let asA: string | undefined;
  let iWant: string | undefined;
  let soThat: string | undefined;

  const asAMatch = bodyContent.match(/\*\*As a\*\* (.+)/);
  if (asAMatch) asA = asAMatch[1].trim();

  const iWantMatch = bodyContent.match(/\*\*I want\*\* (.+)/);
  if (iWantMatch) iWant = iWantMatch[1].trim();

  const soThatMatch = bodyContent.match(/\*\*So that\*\* (.+)/);
  if (soThatMatch) soThat = soThatMatch[1].trim();

  return StorySchema.parse({
    ...data,
    asA,
    iWant,
    soThat,
    acceptanceCriteria,
    openQuestions,
    edgeCases,
  });
}

// Feature to markdown
export function featureToMarkdown(feature: Feature): string {
  const frontmatter = {
    id: feature.id,
    title: feature.title,
    status: feature.status,
    priority: feature.priority,
    tags: feature.tags,
    stories: feature.stories,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
  };

  let content = '';

  if (feature.description) {
    content += '## Description\n\n';
    content += `${feature.description}\n\n`;
  }

  if (feature.successCriteria.length > 0) {
    content += '## Success Criteria\n\n';
    for (const sc of feature.successCriteria) {
      content += `- ${sc}\n`;
    }
    content += '\n';
  }

  return matter.stringify(content, frontmatter);
}

// Parse markdown to feature
export function markdownToFeature(content: string): Feature {
  const { data, content: bodyContent } = matter(content);

  // Parse description
  let description: string | undefined;
  const descMatch = bodyContent.match(/## Description\n\n([\s\S]*?)(?=\n## |$)/);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // Parse success criteria
  const successCriteria: string[] = [];
  const scMatch = bodyContent.match(/## Success Criteria\n\n([\s\S]*?)(?=\n## |$)/);
  if (scMatch) {
    const lines = scMatch[1].split('\n').filter((l) => l.trim().startsWith('- '));
    for (const line of lines) {
      const text = line.replace(/^- /, '').trim();
      if (text) successCriteria.push(text);
    }
  }

  return FeatureSchema.parse({
    ...data,
    description,
    successCriteria,
  });
}

// Storage operations
export class StorageManager {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  private getFeaturesDir(): string {
    return path.join(this.projectPath, 'features');
  }

  private getFeatureDir(featureId: string): string {
    return path.join(this.getFeaturesDir(), featureId);
  }

  private getStoriesDir(featureId: string): string {
    return path.join(this.getFeatureDir(featureId), 'stories');
  }

  private getStoryPath(featureId: string, storyId: string): string {
    return path.join(this.getStoriesDir(featureId), `${storyId}.md`);
  }

  private getFeaturePath(featureId: string): string {
    return path.join(this.getFeatureDir(featureId), 'feature.md');
  }

  // Story operations
  async createStory(story: Story): Promise<void> {
    const featureId = story.feature || 'backlog';
    const storiesDir = this.getStoriesDir(featureId);

    if (!fs.existsSync(storiesDir)) {
      fs.mkdirSync(storiesDir, { recursive: true });
    }

    const storyPath = this.getStoryPath(featureId, story.id);
    const content = storyToMarkdown(story);
    fs.writeFileSync(storyPath, content, 'utf-8');
  }

  async updateStory(story: Story): Promise<void> {
    story.updatedAt = new Date().toISOString();
    await this.createStory(story);
  }

  async getStory(featureId: string, storyId: string): Promise<Story | null> {
    const storyPath = this.getStoryPath(featureId, storyId);

    if (!fs.existsSync(storyPath)) {
      return null;
    }

    const content = fs.readFileSync(storyPath, 'utf-8');
    return markdownToStory(content);
  }

  async listStories(featureId?: string): Promise<Story[]> {
    const stories: Story[] = [];
    const featuresDir = this.getFeaturesDir();

    if (!fs.existsSync(featuresDir)) {
      return stories;
    }

    const featureDirs = featureId
      ? [featureId]
      : fs.readdirSync(featuresDir).filter((f) => {
          const stat = fs.statSync(path.join(featuresDir, f));
          return stat.isDirectory();
        });

    for (const fDir of featureDirs) {
      const storiesDir = this.getStoriesDir(fDir);
      if (!fs.existsSync(storiesDir)) continue;

      const storyFiles = fs.readdirSync(storiesDir).filter((f) => f.endsWith('.md'));

      for (const storyFile of storyFiles) {
        const content = fs.readFileSync(path.join(storiesDir, storyFile), 'utf-8');
        try {
          const story = markdownToStory(content);
          stories.push(story);
        } catch {
          // Skip invalid files
        }
      }
    }

    return stories;
  }

  async deleteStory(featureId: string, storyId: string): Promise<boolean> {
    const storyPath = this.getStoryPath(featureId, storyId);

    if (!fs.existsSync(storyPath)) {
      return false;
    }

    fs.unlinkSync(storyPath);
    return true;
  }

  // Feature operations
  async createFeature(feature: Feature): Promise<void> {
    const featureDir = this.getFeatureDir(feature.id);

    if (!fs.existsSync(featureDir)) {
      fs.mkdirSync(featureDir, { recursive: true });
    }

    const featurePath = this.getFeaturePath(feature.id);
    const content = featureToMarkdown(feature);
    fs.writeFileSync(featurePath, content, 'utf-8');
  }

  async updateFeature(feature: Feature): Promise<void> {
    feature.updatedAt = new Date().toISOString();
    await this.createFeature(feature);
  }

  async getFeature(featureId: string): Promise<Feature | null> {
    const featurePath = this.getFeaturePath(featureId);

    if (!fs.existsSync(featurePath)) {
      return null;
    }

    const content = fs.readFileSync(featurePath, 'utf-8');
    return markdownToFeature(content);
  }

  async listFeatures(): Promise<Feature[]> {
    const features: Feature[] = [];
    const featuresDir = this.getFeaturesDir();

    if (!fs.existsSync(featuresDir)) {
      return features;
    }

    const featureDirs = fs.readdirSync(featuresDir).filter((f) => {
      const stat = fs.statSync(path.join(featuresDir, f));
      return stat.isDirectory();
    });

    for (const fDir of featureDirs) {
      const featurePath = this.getFeaturePath(fDir);
      if (!fs.existsSync(featurePath)) continue;

      const content = fs.readFileSync(featurePath, 'utf-8');
      try {
        const feature = markdownToFeature(content);
        features.push(feature);
      } catch {
        // Skip invalid files
      }
    }

    return features;
  }

  // Search
  async searchStories(query: string): Promise<Story[]> {
    const allStories = await this.listStories();
    const lowerQuery = query.toLowerCase();

    return allStories.filter((story) => {
      const searchText = [
        story.title,
        story.asA,
        story.iWant,
        story.soThat,
        ...story.acceptanceCriteria.map((ac) => ac.text),
        ...story.openQuestions,
        ...story.edgeCases,
        ...story.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(lowerQuery);
    });
  }
}
