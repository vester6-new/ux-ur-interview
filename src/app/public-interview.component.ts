import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { displayAnswer, isEmptyAnswer, isFieldVisible, pruneHiddenAnswers } from './logic';
import { DEFAULT_EMOJIS, DEFAULT_TAGS, FieldOption, Interview, InterviewField, fieldOptions } from './models';
import { ResearchService } from './research.service';

@Component({
  selector: 'ur-public-interview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page survey-page">
      @if (loading()) {
        <div class="card">Loading interview...</div>
      } @else if (error()) {
        <div class="card" role="alert">
          <p class="error">{{ error() }}</p>
          <a class="ur-button ghost" routerLink="/dashboard">Go to dashboard</a>
        </div>
      } @else if (submitted()) {
        <div class="card">
          <p class="eyebrow">Response submitted</p>
          <h1>Thank you</h1>
          <p class="lede">Your feedback has been saved.</p>
          <button class="ur-button primary" type="button" (click)="reset()">Submit another response</button>
        </div>
      } @else {
        @if (interview(); as current) {
          <div class="hero survey-hero">
            <h1>Share your feedback on <span>{{ current.name }}</span></h1>
            @if (current.description) {
              <p class="lede">{{ current.description }}</p>
            }
          </div>

          <form class="survey-form" (ngSubmit)="submit(current)" novalidate>
            @for (field of current.fields; track field.id) {
              @if (visible(field)) {
                @if (field.type === 'section') {
                  <hr class="divider" />
                  <div class="field section-field">
                    <h2 class="field-section-title">{{ field.label }}</h2>
                    @if (field.help || field.helpText) {
                      <p class="hint">{{ field.help || field.helpText }}</p>
                    }
                  </div>
                } @else {
                  <div class="field">
                <label [attr.for]="field.id">{{ field.label }} @if (field.required) { <span aria-label="required">*</span> }</label>
                @if (field.helpText || field.help) {
                  <p class="hint" [id]="field.id + '-hint'">{{ field.helpText || field.help }}</p>
                }

                @switch (field.type) {
                  @case ('textarea') {
                    <textarea
                      [id]="field.id"
                      [name]="field.id"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required || false"
                      [attr.aria-describedby]="field.helpText || field.help ? field.id + '-hint' : null"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    ></textarea>
                  }
                  @case ('longText') {
                    <textarea
                      [id]="field.id"
                      [name]="field.id"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required || false"
                      [attr.aria-describedby]="field.helpText || field.help ? field.id + '-hint' : null"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    ></textarea>
                  }
                  @case ('shortText') {
                    <input
                      [id]="field.id"
                      [name]="field.id"
                      type="text"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required || false"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    />
                  }
                  @case ('email') {
                    <input
                      [id]="field.id"
                      [name]="field.id"
                      type="email"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required || false"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    />
                  }
                  @case ('number') {
                    <input
                      [id]="field.id"
                      [name]="field.id"
                      type="number"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required || false"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    />
                  }
                  @case ('rating') {
                    <div class="slider-block">
                      <div class="slider-top">
                        <span class="slider-name">{{ field.label }}</span>
                        <span class="slider-num">{{ numberAnswer(field.id, 7) }} <small>/ {{ field.max || 10 }}</small></span>
                      </div>
                      <input
                        [id]="field.id"
                        [name]="field.id"
                        type="range"
                        [min]="field.min ?? 1"
                        [max]="field.max ?? 10"
                        [ngModel]="numberAnswer(field.id, 7)"
                        (ngModelChange)="setAnswer(field.id, $event)"
                      />
                      <div class="slider-labels">
                        <span>{{ field.min ?? 1 }} - {{ field.minLabel || 'Low' }}</span>
                        <span>{{ field.max ?? 10 }} - {{ field.maxLabel || 'High' }}</span>
                      </div>
                    </div>
                  }
                  @case ('score') {
                    <div class="range-row">
                      <input
                        [id]="field.id"
                        [name]="field.id"
                        type="range"
                        [min]="field.min ?? 0"
                        [max]="field.max ?? 10"
                        [ngModel]="numberAnswer(field.id, field.min ?? 0)"
                        (ngModelChange)="setAnswer(field.id, $event)"
                      />
                      <strong>{{ display(field, answer(field.id)) }}</strong>
                    </div>
                  }
                  @case ('emoji') {
                    <div class="emoji-row" role="radiogroup" [attr.aria-label]="field.label">
                      @for (option of options(field); track option) {
                        <button
                          class="emoji-btn"
                          type="button"
                          role="radio"
                          [class.selected]="answer(field.id) === option.value"
                          [attr.aria-checked]="answer(field.id) === option.value"
                          (click)="setAnswer(field.id, option.value)"
                        >
                          <span class="em" aria-hidden="true">{{ option.value }}</span>
                          <span class="em-label">{{ option.label }}</span>
                        </button>
                      }
                    </div>
                  }
                  @case ('tags') {
                    <div class="tag-row" role="group" [attr.aria-label]="field.label">
                      @for (option of options(field); track option) {
                        <button
                          class="tag-btn"
                          type="button"
                          [class.selected]="arrayAnswer(field.id).includes(option.value)"
                          [attr.aria-pressed]="arrayAnswer(field.id).includes(option.value)"
                          (click)="toggleArrayAnswer(field.id, option.value)"
                        >
                          {{ option.label }}
                        </button>
                      }
                    </div>
                  }
                  @case ('multiSelect') {
                    <div class="tag-row" role="group" [attr.aria-label]="field.label">
                      @for (option of options(field); track option) {
                        <button
                          class="tag-btn"
                          type="button"
                          [class.selected]="arrayAnswer(field.id).includes(option.value)"
                          [attr.aria-pressed]="arrayAnswer(field.id).includes(option.value)"
                          (click)="toggleArrayAnswer(field.id, option.value)"
                        >
                          {{ option.label }}
                        </button>
                      }
                    </div>
                  }
                  @case ('single') {
                    <select
                      [id]="field.id"
                      [name]="field.id"
                      [required]="field.required || false"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    >
                      <option value="">Choose one</option>
                      @for (option of options(field); track option) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  }
                  @case ('select') {
                    <select
                      [id]="field.id"
                      [name]="field.id"
                      [required]="field.required || false"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    >
                      <option value="">Choose one</option>
                      @for (option of options(field); track option) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  }
                  @case ('multi') {
                    <div class="tag-row" role="group" [attr.aria-label]="field.label">
                      @for (option of options(field); track option) {
                        <button
                          class="tag-btn"
                          type="button"
                          [class.selected]="arrayAnswer(field.id).includes(option.value)"
                          [attr.aria-pressed]="arrayAnswer(field.id).includes(option.value)"
                          (click)="toggleArrayAnswer(field.id, option.value)"
                        >
                          {{ option.label }}
                        </button>
                      }
                    </div>
                  }
                  @case ('checkbox') {
                    <label class="checkbox-row">
                      <input
                        type="checkbox"
                        [name]="field.id"
                        [checked]="answer(field.id) === true"
                        (change)="setAnswer(field.id, !answer(field.id))"
                      />
                      Yes
                    </label>
                  }
                  @case ('yesno') {
                    <select
                      [id]="field.id"
                      [name]="field.id"
                      [required]="field.required || false"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    >
                      <option value="">Choose one</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  }
                  @default {
                    <input
                      [id]="field.id"
                      [name]="field.id"
                      type="text"
                      [placeholder]="field.placeholder || ''"
                      [required]="field.required || false"
                      [ngModel]="answer(field.id)"
                      (ngModelChange)="setAnswer(field.id, $event)"
                    />
                  }
                }
                  </div>
                }
              }
            }

            @if (formError()) {
              <p class="error" role="alert">{{ formError() }}</p>
            }

            <button class="ur-button primary" type="submit" [disabled]="saving()">Submit feedback</button>
          </form>
        }
      }
    </section>
  `
})
export class PublicInterviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly research = inject(ResearchService);

  readonly interview = signal<Interview | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly answers = signal<Record<string, unknown>>({});
  readonly visibleFields = computed(() => this.interview()?.fields.filter((field) => this.visible(field)) ?? []);

  async ngOnInit(): Promise<void> {
    this.route.paramMap.subscribe((params) => {
      void this.load(params.get('slug'));
    });
  }

  async load(slug: string | null): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const interview = slug
        ? await this.research.findPublishedInterviewBySlug(slug)
        : await this.research.findPublishedRootInterview();

      if (!interview) {
        this.error.set(slug ? 'This interview does not exist.' : 'No root interview has been selected yet.');
        return;
      }

      this.interview.set(interview);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not load the interview.');
    } finally {
      this.loading.set(false);
    }
  }

  async submit(interview: Interview): Promise<void> {
    const pruned = pruneHiddenAnswers(interview.fields, this.answers());
    const missing = interview.fields
      .filter((field) => isFieldVisible(field, this.answers()) && field.required && isEmptyAnswer(pruned[field.id]))
      .map((field) => field.label);

    if (missing.length) {
      this.formError.set(`Please answer: ${missing.join(', ')}`);
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    try {
      await this.research.saveResponse(interview.id, {
        id: Date.now(),
        ts: new Date().toISOString(),
        answers: pruned
      });
      this.submitted.set(true);
      this.answers.set({});
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : 'Could not save your response.');
    } finally {
      this.saving.set(false);
    }
  }

  reset(): void {
    this.submitted.set(false);
    this.formError.set('');
  }

  visible(field: InterviewField): boolean {
    return isFieldVisible(field, this.answers());
  }

  answer(fieldId: string): unknown {
    return this.answers()[fieldId] ?? '';
  }

  numberAnswer(fieldId: string, fallback: number): number {
    const value = Number(this.answers()[fieldId] ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  }

  setAnswer(fieldId: string, value: unknown): void {
    this.answers.update((answers) => ({ ...answers, [fieldId]: value }));
  }

  arrayAnswer(fieldId: string): string[] {
    const value = this.answers()[fieldId];
    return Array.isArray(value) ? value.map(String) : [];
  }

  toggleArrayAnswer(fieldId: string, option: string): void {
    const current = this.arrayAnswer(fieldId);
    const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    this.setAnswer(fieldId, next);
  }

  options(field: InterviewField): FieldOption[] {
    const options = fieldOptions(field);
    if (field.type === 'emoji' && options.length < DEFAULT_EMOJIS.length) {
      return DEFAULT_EMOJIS;
    }
    if (['tags', 'multi', 'multiSelect'].includes(field.type) && this.hasIncompleteOptions(options)) {
      return DEFAULT_TAGS.map((tag) => ({ value: tag, label: tag }));
    }
    return options;
  }

  hasIncompleteOptions(options: FieldOption[]): boolean {
    return options.length < DEFAULT_TAGS.length || options.some((option) => !option.label.trim() || !option.value.trim());
  }

  scoreOptions(field: InterviewField): number[] {
    const min = field.min ?? 1;
    const max = field.max ?? 5;
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }

  display(field: InterviewField, value: unknown): string {
    return displayAnswer(field, value);
  }
}
