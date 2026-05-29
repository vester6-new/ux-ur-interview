import { AnalyticsOverview, ConditionRule, Interview, InterviewField, InterviewStats, ResponseEntry } from './models';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64);
}

export function dateLabel(value: unknown): string {
  if (!value) {
    return 'No responses yet';
  }

  const date = firebaseDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : String(value);
}

export function firebaseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate() as Date;
  }

  return null;
}

export function isEmptyAnswer(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

export function evaluateConditionRule(rule: ConditionRule | null | undefined, answers: Record<string, unknown>): boolean {
  if (!rule?.fieldId) {
    return true;
  }

  const answer = answers[rule.fieldId];

  switch (rule.operator) {
    case 'isAnswered':
      return !isEmptyAnswer(answer);
    case 'equals':
      return String(answer) === String(rule.value ?? '');
    case 'notEquals':
      return String(answer) !== String(rule.value ?? '');
    case 'contains':
      return Array.isArray(answer)
        ? answer.map(String).includes(String(rule.value ?? ''))
        : String(answer ?? '').includes(String(rule.value ?? ''));
    case 'greaterThan':
      return Number(answer) > Number(rule.value);
    case 'lessThan':
      return Number(answer) < Number(rule.value);
    default:
      return true;
  }
}

export function isFieldVisible(field: InterviewField, answers: Record<string, unknown>): boolean {
  return evaluateConditionRule(field.condition, answers);
}

export function pruneHiddenAnswers(fields: InterviewField[], answers: Record<string, unknown>): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((next, field) => {
    if (isFieldVisible(field, answers) && !isEmptyAnswer(answers[field.id])) {
      next[field.id] = answers[field.id];
    }
    return next;
  }, {});
}

export function displayAnswer(field: InterviewField | undefined, value: unknown): string {
  if (isEmptyAnswer(value)) {
    return 'No answer';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  const suffix = field?.type === 'score' || field?.type === 'rating' ? ` / ${field.max ?? 10}` : '';
  return `${String(value)}${suffix}`;
}

export function buildInterviewStats(interview: Interview, responses: ResponseEntry[]): InterviewStats {
  const last = responses
    .map((response) => firebaseDate(response.createdAt) ?? firebaseDate(response.ts))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const scoreFields = interview.fields.filter((field) => field.type === 'score' || field.type === 'rating');
  const numericScores = responses.flatMap((response) =>
    scoreFields
      .map((field) => Number(response.answers[field.id]))
      .filter((value) => Number.isFinite(value))
  );

  const counts = interview.fields.reduce<Record<string, Array<{ label: string; count: number }>>>((result, field) => {
    const options = field.options ?? [];
    if (!options.length && !['yesno', 'rating', 'score'].includes(field.type)) {
      return result;
    }

    const tally = new Map<string, number>();

    responses.forEach((response) => {
      const value = response.answers[field.id];
      const values = Array.isArray(value) ? value : [value];
      values.filter((item) => !isEmptyAnswer(item)).forEach((item) => {
        const key = String(item);
        tally.set(key, (tally.get(key) ?? 0) + 1);
      });
    });

    result[field.id] = Array.from(tally.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
    return result;
  }, {});

  return {
    totalResponses: responses.length,
    lastResponseLabel: last ? dateLabel(last) : 'No responses yet',
    averageScore: numericScores.length
      ? Math.round((numericScores.reduce((sum, value) => sum + value, 0) / numericScores.length) * 10) / 10
      : null,
    fieldCompletion: interview.fields.map((field) => {
      const count = responses.filter((response) => !isEmptyAnswer(response.answers[field.id])).length;
      return {
        label: field.label,
        count,
        percent: responses.length ? Math.round((count / responses.length) * 100) : 0
      };
    }),
    counts
  };
}

export function buildAnalyticsOverview(
  interviews: Interview[],
  responseMap: Record<string, ResponseEntry[]>
): AnalyticsOverview {
  const allResponses = Object.values(responseMap).flat();
  const last = allResponses
    .map((response) => firebaseDate(response.createdAt) ?? firebaseDate(response.ts))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    totalInterviews: interviews.length,
    publishedInterviews: interviews.filter((interview) => interview.status === 'published').length,
    totalResponses: allResponses.length,
    topInterviews: interviews
      .map((interview) => ({ interview, count: responseMap[interview.id]?.length ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    lastResponseLabel: last ? dateLabel(last) : 'No responses yet'
  };
}

export function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
