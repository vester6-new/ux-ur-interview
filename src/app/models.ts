import { FieldValue, Timestamp } from 'firebase/firestore';

export type InterviewStatus = 'draft' | 'published' | 'unpublished';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'shortText'
  | 'longText'
  | 'email'
  | 'number'
  | 'rating'
  | 'score'
  | 'emoji'
  | 'tags'
  | 'multiSelect'
  | 'single'
  | 'select'
  | 'multi'
  | 'yesno'
  | 'checkbox'
  | 'section';

export type ConditionOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isAnswered';

export interface ConditionRule {
  fieldId: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface InterviewField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  help?: string;
  required?: boolean;
  options?: FieldOptionInput[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  condition?: ConditionRule | null;
}

export interface FieldOption {
  value: string;
  label: string;
}

export type FieldOptionInput = string | FieldOption;

export interface Interview {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: InterviewStatus;
  fields: InterviewField[];
  rootActive?: boolean;
  createdAt?: Timestamp | FieldValue | Date | string;
  updatedAt?: Timestamp | FieldValue | Date | string;
}

export interface ResponseEntry {
  id: number;
  ts: string;
  answers: Record<string, unknown>;
  createdAt?: Timestamp | FieldValue | Date | string;
}

export interface InterviewStats {
  totalResponses: number;
  lastResponseLabel: string;
  averageScore: number | null;
  fieldCompletion: Array<{ label: string; count: number; percent: number }>;
  counts: Record<string, Array<{ label: string; count: number }>>;
}

export interface AnalyticsOverview {
  totalInterviews: number;
  publishedInterviews: number;
  totalResponses: number;
  topInterviews: Array<{ interview: Interview; count: number }>;
  lastResponseLabel: string;
}

export const DEFAULT_EMOJIS: FieldOption[] = [
  { value: '😤', label: 'Frustrated' },
  { value: '😐', label: 'Neutral' },
  { value: '🙂', label: 'Okay' },
  { value: '😊', label: 'Satisfied' },
  { value: '🤩', label: 'Delighted' }
];

export const DEFAULT_TAGS = [
  'Intuitive',
  'Confusing',
  'Precise',
  'Unreliable',
  'Fast',
  'Slow',
  'Clear feedback',
  'Missing feedback',
  'Overcorrected',
  'Hard to find'
];

export const FIELD_TYPES: Array<{ type: FieldType; title: string; description: string }> = [
  { type: 'textarea', title: 'Long answer', description: 'Detailed feedback or open comments.' },
  { type: 'text', title: 'Short answer', description: 'One-line answer for names, feature areas, or notes.' },
  { type: 'rating', title: 'Rating', description: 'A 1-5 satisfaction or usefulness score.' },
  { type: 'score', title: 'Score slider', description: 'A 0-10 score for NPS-like questions.' },
  { type: 'emoji', title: 'Emoji choice', description: 'Quick sentiment with editable emoji options.' },
  { type: 'tags', title: 'Tags', description: 'Let participants select multiple tags.' },
  { type: 'single', title: 'Single choice', description: 'One option from a short list.' },
  { type: 'multi', title: 'Multiple choice', description: 'Several options from a list.' },
  { type: 'yesno', title: 'Yes / no', description: 'Simple binary question.' },
  { type: 'email', title: 'Email', description: 'Optional contact detail.' },
  { type: 'number', title: 'Number', description: 'Numeric answer.' }
];

export const DEFAULT_FIELDS: InterviewField[] = [
  {
    id: 'role',
    type: 'text',
    label: 'What is your role?',
    placeholder: 'Example: Product owner'
  },
  {
    id: 'feature-feedback',
    type: 'textarea',
    label: 'What should we improve about this feature?',
    placeholder: 'Tell us what worked well and what could be clearer',
    required: true
  },
  {
    id: 'feature-score',
    type: 'score',
    label: 'How useful is this feature?',
    min: 0,
    max: 10,
    required: true
  }
];

export function createDefaultField(type: FieldType, index: number): InterviewField {
  const base: InterviewField = {
    id: `${type}-${crypto.randomUUID().slice(0, 8)}`,
    type,
    label: `Feature question ${index + 1}`,
    placeholder: 'Write feedback about the feature',
    required: false,
    condition: null
  };

  if (type === 'rating') {
    return { ...base, label: 'How satisfied are you with this feature?', min: 1, max: 5 };
  }

  if (type === 'score') {
    return { ...base, label: 'How useful is this feature?', min: 0, max: 10 };
  }

  if (type === 'emoji') {
    return { ...base, label: 'How did this feature feel?', options: [...DEFAULT_EMOJIS] };
  }

  if (type === 'tags') {
    return { ...base, label: 'Which words describe this feature?', options: [...DEFAULT_TAGS] };
  }

  if (type === 'single' || type === 'multi') {
    return { ...base, label: 'Which option best fits your experience?', options: ['Option 1', 'Option 2', 'Option 3'] };
  }

  if (type === 'yesno') {
    return { ...base, label: 'Would you use this feature again?', options: ['Yes', 'No'] };
  }

  if (type === 'email') {
    return { ...base, label: 'Email address', placeholder: 'name@example.com' };
  }

  if (type === 'number') {
    return { ...base, label: 'Add a number', placeholder: '0' };
  }

  return base;
}

export function normalizeOption(option: FieldOptionInput): FieldOption {
  if (typeof option === 'string') {
    return { value: option, label: option };
  }

  return {
    value: String(option.value ?? ''),
    label: String(option.label || option.value || '')
  };
}

export function fieldOptions(field: InterviewField | undefined): FieldOption[] {
  return Array.isArray(field?.options) ? field.options.map(normalizeOption).filter((option) => option.value) : [];
}
