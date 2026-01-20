import type { ToolName } from './definitions.js';
import { StorageManager } from '../../storage/index.js';
import type { Story, Feature, InvestAnalysis } from '../../models/index.js';
import {
  askSelect,
  askMultiSelect,
  askQuestion,
  askConfirm,
  displayDraft,
  displayStoryList,
  displayFeature,
  type QuestionOption,
} from '../../ui/index.js';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresUserInput?: boolean;
  userInput?: unknown;
}

export class ToolExecutor {
  private storage: StorageManager;

  constructor(projectPath: string) {
    this.storage = new StorageManager(projectPath);
  }

  async execute(toolName: ToolName, input: Record<string, unknown>): Promise<ToolResult> {
    switch (toolName) {
      case 'create_story':
        return this.createStory(input);
      case 'update_story':
        return this.updateStory(input);
      case 'list_stories':
        return this.listStories(input);
      case 'create_feature':
        return this.createFeature(input);
      case 'list_features':
        return this.listFeatures();
      case 'search_stories':
        return this.searchStories(input);
      case 'ask_user_question':
        return this.askUserQuestion(input);
      case 'present_draft':
        return this.presentDraft(input);
      case 'analyze_story_quality':
        return this.analyzeStoryQuality(input);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }

  private async createStory(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const story: Story = {
        id: input.id as string,
        title: input.title as string,
        type: 'user-story',
        status: 'draft',
        priority: (input.priority as Story['priority']) || 'medium',
        feature: input.feature as string | undefined,
        asA: input.asA as string,
        iWant: input.iWant as string,
        soThat: input.soThat as string,
        acceptanceCriteria: ((input.acceptanceCriteria as string[]) || []).map((text) => ({
          text,
          completed: false,
        })),
        openQuestions: (input.openQuestions as string[]) || [],
        edgeCases: (input.edgeCases as string[]) || [],
        dependencies: [],
        relatedStories: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.storage.createStory(story);

      return {
        success: true,
        data: {
          message: `Story "${story.title}" created successfully`,
          storyId: story.id,
          feature: story.feature || 'backlog',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create story: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async updateStory(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const storyId = input.id as string;
      const featureId = (input.feature as string) || 'backlog';
      const updates = input.updates as Record<string, unknown>;

      const existingStory = await this.storage.getStory(featureId, storyId);
      if (!existingStory) {
        return { success: false, error: `Story "${storyId}" not found in feature "${featureId}"` };
      }

      const updatedStory: Story = {
        ...existingStory,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Handle acceptance criteria update
      if (updates.acceptanceCriteria) {
        updatedStory.acceptanceCriteria = (updates.acceptanceCriteria as string[]).map((text) => ({
          text,
          completed: false,
        }));
      }

      await this.storage.updateStory(updatedStory);

      return {
        success: true,
        data: { message: `Story "${storyId}" updated successfully` },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update story: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async listStories(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const featureId = input.feature as string | undefined;
      const statusFilter = input.status as string | undefined;

      let stories = await this.storage.listStories(featureId);

      if (statusFilter) {
        stories = stories.filter((s) => s.status === statusFilter);
      }

      displayStoryList(stories);

      return {
        success: true,
        data: {
          count: stories.length,
          stories: stories.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            priority: s.priority,
            feature: s.feature,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list stories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async createFeature(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const feature: Feature = {
        id: input.id as string,
        title: input.title as string,
        description: input.description as string | undefined,
        status: 'draft',
        priority: (input.priority as Feature['priority']) || 'medium',
        successCriteria: (input.successCriteria as string[]) || [],
        stories: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.storage.createFeature(feature);

      return {
        success: true,
        data: {
          message: `Feature "${feature.title}" created successfully`,
          featureId: feature.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create feature: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async listFeatures(): Promise<ToolResult> {
    try {
      const features = await this.storage.listFeatures();

      for (const feature of features) {
        const stories = await this.storage.listStories(feature.id);
        displayFeature(feature, stories.length);
      }

      return {
        success: true,
        data: {
          count: features.length,
          features: features.map((f) => ({
            id: f.id,
            title: f.title,
            status: f.status,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list features: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async searchStories(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const query = input.query as string;
      const stories = await this.storage.searchStories(query);

      displayStoryList(stories);

      return {
        success: true,
        data: {
          query,
          count: stories.length,
          stories: stories.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            feature: s.feature,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search stories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async askUserQuestion(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const question = input.question as string;
      const options = input.options as Array<{ label: string; value: string; description?: string }>;
      const allowCustom = (input.allowCustom as boolean) ?? true;
      const multiSelect = (input.multiSelect as boolean) ?? false;

      const questionOptions: QuestionOption[] = options.map((opt) => ({
        label: opt.label,
        value: opt.value,
        description: opt.description,
      }));

      if (allowCustom) {
        questionOptions.push({
          label: 'Other (custom answer)',
          value: '__custom__',
          description: 'Enter your own answer',
        });
      }

      let answer: string | string[];

      if (multiSelect) {
        answer = await askMultiSelect(question, questionOptions);
      } else {
        answer = await askSelect(question, questionOptions);
      }

      // Handle custom answer
      if (answer === '__custom__' || (Array.isArray(answer) && answer.includes('__custom__'))) {
        const customAnswer = await askQuestion('Please enter your answer:');
        if (Array.isArray(answer)) {
          answer = answer.filter((a) => a !== '__custom__');
          answer.push(customAnswer);
        } else {
          answer = customAnswer;
        }
      }

      return {
        success: true,
        requiresUserInput: true,
        userInput: answer,
        data: { question, answer },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get user input: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async presentDraft(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const draft = {
        title: input.title as string,
        'As a': input.asA as string,
        'I want': input.iWant as string,
        'So that': input.soThat as string,
        'Acceptance Criteria': input.acceptanceCriteria as string[],
        Priority: input.priority as string,
        'Edge Cases': input.edgeCases as string[] | undefined,
        'Open Questions': input.openQuestions as string[] | undefined,
      };

      displayDraft('Story Draft', draft);

      const approved = await askConfirm('Do you approve this story draft?', true);

      if (approved) {
        return {
          success: true,
          data: { approved: true, message: 'Draft approved by user' },
        };
      } else {
        const feedback = await askQuestion('What would you like to change?');
        return {
          success: true,
          data: { approved: false, feedback },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to present draft: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async analyzeStoryQuality(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const storyId = input.storyId as string;
      const featureId = input.featureId as string;

      const story = await this.storage.getStory(featureId, storyId);
      if (!story) {
        return { success: false, error: `Story "${storyId}" not found` };
      }

      // Simple INVEST analysis (the AI will provide more detailed analysis)
      const analysis: InvestAnalysis = {
        independent: {
          score: story.dependencies.length === 0 ? 10 : 5,
          feedback:
            story.dependencies.length === 0
              ? 'Story has no dependencies'
              : `Story has ${story.dependencies.length} dependencies`,
        },
        negotiable: {
          score: story.openQuestions.length > 0 ? 8 : 6,
          feedback:
            story.openQuestions.length > 0
              ? 'Open questions indicate room for negotiation'
              : 'Consider adding open questions for flexibility',
        },
        valuable: {
          score: story.soThat ? 8 : 4,
          feedback: story.soThat ? 'Value proposition is defined' : 'Missing "so that" clause',
        },
        estimable: {
          score: story.acceptanceCriteria.length >= 3 ? 8 : 5,
          feedback:
            story.acceptanceCriteria.length >= 3
              ? 'Sufficient acceptance criteria for estimation'
              : 'Add more acceptance criteria for better estimation',
        },
        small: {
          score: story.acceptanceCriteria.length <= 7 ? 8 : 4,
          feedback:
            story.acceptanceCriteria.length <= 7
              ? 'Story appears to be appropriately sized'
              : 'Consider splitting - too many acceptance criteria',
        },
        testable: {
          score: story.acceptanceCriteria.length > 0 ? 8 : 2,
          feedback:
            story.acceptanceCriteria.length > 0
              ? 'Acceptance criteria provide testability'
              : 'Add acceptance criteria for testability',
        },
        overallScore: 0,
        suggestions: [],
      };

      // Calculate overall score
      const scores = [
        analysis.independent.score,
        analysis.negotiable.score,
        analysis.valuable.score,
        analysis.estimable.score,
        analysis.small.score,
        analysis.testable.score,
      ];
      analysis.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // Generate suggestions
      if (analysis.independent.score < 7) {
        analysis.suggestions.push('Consider reducing dependencies on other stories');
      }
      if (analysis.valuable.score < 7) {
        analysis.suggestions.push('Clarify the business value with a stronger "so that" clause');
      }
      if (analysis.estimable.score < 7) {
        analysis.suggestions.push('Add more specific acceptance criteria');
      }
      if (analysis.small.score < 7) {
        analysis.suggestions.push('Consider breaking this story into smaller pieces');
      }
      if (analysis.testable.score < 7) {
        analysis.suggestions.push('Add measurable acceptance criteria');
      }

      return {
        success: true,
        data: {
          storyId,
          analysis,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze story: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
