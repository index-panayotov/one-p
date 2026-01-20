import type Anthropic from '@anthropic-ai/sdk';

export const toolDefinitions: Anthropic.Messages.Tool[] = [
  {
    name: 'create_story',
    description:
      'Create a new user story with the provided details. Use this after gathering requirements from the user through questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'URL-friendly ID for the story (e.g., "user-can-reset-password")',
        },
        title: {
          type: 'string',
          description: 'Brief descriptive title for the story',
        },
        feature: {
          type: 'string',
          description: 'Feature/epic ID this story belongs to (optional)',
        },
        asA: {
          type: 'string',
          description: 'The user role/persona (e.g., "registered user", "admin")',
        },
        iWant: {
          type: 'string',
          description: 'What the user wants to accomplish',
        },
        soThat: {
          type: 'string',
          description: 'The value/benefit the user gains',
        },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of acceptance criteria (testable conditions)',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Priority level',
        },
        edgeCases: {
          type: 'array',
          items: { type: 'string' },
          description: 'Edge cases to consider',
        },
        openQuestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Questions that need to be resolved',
        },
      },
      required: ['id', 'title', 'asA', 'iWant', 'soThat', 'acceptanceCriteria'],
    },
  },
  {
    name: 'update_story',
    description: 'Update an existing story with new information',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The story ID to update',
        },
        feature: {
          type: 'string',
          description: 'Feature ID where the story is located',
        },
        updates: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            title: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'ready', 'in-progress', 'done'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            asA: { type: 'string' },
            iWant: { type: 'string' },
            soThat: { type: 'string' },
            acceptanceCriteria: { type: 'array', items: { type: 'string' } },
            edgeCases: { type: 'array', items: { type: 'string' } },
            openQuestions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['id', 'feature', 'updates'],
    },
  },
  {
    name: 'list_stories',
    description: 'List stories, optionally filtered by feature or status',
    input_schema: {
      type: 'object' as const,
      properties: {
        feature: {
          type: 'string',
          description: 'Filter by feature ID',
        },
        status: {
          type: 'string',
          enum: ['draft', 'ready', 'in-progress', 'done'],
          description: 'Filter by status',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_feature',
    description: 'Create a new feature/epic to group related stories',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'URL-friendly ID for the feature (e.g., "authentication")',
        },
        title: {
          type: 'string',
          description: 'Descriptive title for the feature',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the feature',
        },
        successCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Success criteria for the feature',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Priority level',
        },
      },
      required: ['id', 'title'],
    },
  },
  {
    name: 'list_features',
    description: 'List all features/epics in the project',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_stories',
    description: 'Search across all stories using a text query',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find matching stories',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'ask_user_question',
    description:
      'Ask the user a question with multiple-choice options. Use this to gather requirements, clarify needs, or guide the story writing process. Always prefer using this over asking open-ended questions when you can provide helpful options.',
    input_schema: {
      type: 'object' as const,
      properties: {
        question: {
          type: 'string',
          description: 'The question to ask the user',
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Short option label' },
              value: { type: 'string', description: 'Value if selected' },
              description: { type: 'string', description: 'Longer description of the option' },
            },
            required: ['label', 'value'],
          },
          description: 'Multiple choice options for the user to select from',
        },
        allowCustom: {
          type: 'boolean',
          description: 'Whether to allow the user to provide a custom answer',
          default: true,
        },
        multiSelect: {
          type: 'boolean',
          description: 'Whether to allow multiple selections',
          default: false,
        },
      },
      required: ['question', 'options'],
    },
  },
  {
    name: 'present_draft',
    description:
      'Present a draft story to the user for review and approval before saving. Always use this before creating a story to confirm details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        asA: { type: 'string' },
        iWant: { type: 'string' },
        soThat: { type: 'string' },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
        },
        priority: { type: 'string' },
        edgeCases: {
          type: 'array',
          items: { type: 'string' },
        },
        openQuestions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['title', 'asA', 'iWant', 'soThat', 'acceptanceCriteria'],
    },
  },
  {
    name: 'analyze_story_quality',
    description:
      'Analyze a story against INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)',
    input_schema: {
      type: 'object' as const,
      properties: {
        storyId: {
          type: 'string',
          description: 'The story ID to analyze',
        },
        featureId: {
          type: 'string',
          description: 'The feature ID where the story is located',
        },
      },
      required: ['storyId', 'featureId'],
    },
  },
];

export type ToolName =
  | 'create_story'
  | 'update_story'
  | 'list_stories'
  | 'create_feature'
  | 'list_features'
  | 'search_stories'
  | 'ask_user_question'
  | 'present_draft'
  | 'analyze_story_quality';
