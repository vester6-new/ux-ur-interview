import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FirebaseService } from './firebase.service';
import { buildAnalyticsOverview, slugify } from './logic';
import {
  AnalyticsOverview,
  ConditionOperator,
  FIELD_TYPES,
  Interview,
  InterviewField,
  InterviewStatus,
  createDefaultField,
  fieldOptions
} from './models';
import { ResearchService } from './research.service';

type DraftInterview = Partial<Interview> & { fields: InterviewField[] };

@Component({
  selector: 'ur-dashboard',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <div class="hero">
        <p class="eyebrow">Admin dashboard</p>
        <h1>Interviews</h1>
        <p class="lede">
          Create interview routes, publish or unpublish studies, select the root interview, and review responses across all
          active research.
        </p>
      </div>

      @if (!firebase.authReady()) {
        <div class="card login-card">Checking sign-in...</div>
      } @else if (!firebase.user()) {
        <form class="card login-card" (ngSubmit)="signIn()" novalidate>
          <h2>Dashboard login</h2>
          <p class="hint">Sign in with the same email and password used before the Angular migration.</p>
          <div class="field">
            <label for="dashboard-email">Email</label>
            <input id="dashboard-email" name="email" type="email" autocomplete="email" [(ngModel)]="email" />
          </div>
          <div class="field">
            <label for="dashboard-password">Password</label>
            <input
              id="dashboard-password"
              name="password"
              type="password"
              autocomplete="current-password"
              [(ngModel)]="password"
            />
          </div>
          <button class="ur-button primary" type="submit" [disabled]="signingIn()">
            {{ signingIn() ? 'Signing in...' : 'Sign in' }}
          </button>
          @if (loginError()) {
            <p class="error" role="alert">{{ loginError() }}</p>
          }
        </form>
      } @else {
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <div class="toolbar">
          <div>
            <h2>Research overview</h2>
            <p class="hint">Design-system adapter active. UR Angular package can replace these controls once registry access is available.</p>
          </div>
          <button class="ur-button primary" type="button" (click)="openCreate()">Add new interview</button>
        </div>

        @if (overview(); as stats) {
          <div class="grid four grid three" aria-label="Dashboard statistics">
            <article class="card">
              <p class="eyebrow">Interviews</p>
              <h2>{{ stats.totalInterviews }}</h2>
            </article>
            <article class="card">
              <p class="eyebrow">Published</p>
              <h2>{{ stats.publishedInterviews }}</h2>
            </article>
            <article class="card">
              <p class="eyebrow">Responses</p>
              <h2>{{ stats.totalResponses }}</h2>
            </article>
            <article class="card">
              <p class="eyebrow">Latest response</p>
              <h3>{{ stats.lastResponseLabel }}</h3>
            </article>
          </div>
        }

        <div class="grid">
          @if (loading()) {
            <div class="card">Loading interviews...</div>
          } @else if (!interviews().length) {
            <div class="empty">
              <h2>No interviews yet</h2>
              <p>Create the first interview to make the root URL useful.</p>
            </div>
          } @else {
            @for (interview of interviews(); track interview.id) {
              <article class="card">
                <div class="toolbar">
                  <div>
                    <p class="status" [class.published]="interview.status === 'published'" [class.unpublished]="interview.status !== 'published'">
                      {{ interview.status }}
                    </p>
                    @if (interview.rootActive) {
                      <span class="pill">Root interview</span>
                    }
                    <h2>{{ interview.name }}</h2>
                    <p class="hint">Public URL: /{{ interview.slug }}</p>
                    @if (interview.description) {
                      <p>{{ interview.description }}</p>
                    }
                  </div>
                  <div class="actions">
                    <a class="ur-button ghost" [routerLink]="['/dashboard', interview.slug]">View results</a>
                    <a class="ur-button ghost" [routerLink]="['/', interview.slug]">Open public form</a>
                    <button class="ur-button secondary" type="button" (click)="toggleStatus(interview)">
                      {{ interview.status === 'published' ? 'Unpublish' : 'Publish' }}
                    </button>
                    <button class="ur-button secondary" type="button" (click)="setRoot(interview)">Set as root</button>
                    <button class="ur-button secondary" type="button" (click)="openEdit(interview)">Edit</button>
                    <button class="ur-button secondary" type="button" (click)="duplicate(interview)">Duplicate</button>
                    <button class="ur-button danger" type="button" (click)="remove(interview)">Delete</button>
                  </div>
                </div>
              </article>
            }
          }
        </div>
      }
    </section>

    @if (draft(); as form) {
      <div class="dialog-backdrop" role="presentation" (click)="closeDialog()">
        <section
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="builder-title"
          (click)="$event.stopPropagation()"
        >
          <div class="toolbar">
            <div>
              <p class="eyebrow">Interview builder</p>
              <h2 id="builder-title">{{ editingId() ? 'Edit interview' : 'Create interview' }}</h2>
            </div>
            <button class="ur-button ghost" type="button" (click)="closeDialog()">Close</button>
          </div>

          <div class="builder-step">
            <h3>Step 1: Details and route</h3>
            <div class="grid two">
              <div class="field">
                <label for="draft-name">Name</label>
                <input id="draft-name" name="name" [(ngModel)]="form.name" (ngModelChange)="syncSlug(form)" />
              </div>
              <div class="field">
                <label for="draft-slug">Public URL</label>
                <input id="draft-slug" name="slug" [(ngModel)]="form.slug" (ngModelChange)="normalizeDraftSlug(form)" />
                <p class="hint">Participants will use /{{ form.slug || 'your-interview' }}</p>
              </div>
            </div>
            <div class="field">
              <label for="draft-description">Description</label>
              <textarea id="draft-description" name="description" [(ngModel)]="form.description"></textarea>
            </div>
            <label class="pill">
              <input type="checkbox" name="rootActive" [(ngModel)]="form.rootActive" />
              Use this interview on the main URL
            </label>
          </div>

          <div class="builder-step">
            <h3>Step 2: Add fields</h3>
            <p class="hint">Start from an empty form, then add only the fields needed for this interview.</p>
            <div class="field-type-grid">
              @for (type of fieldTypes; track type.type) {
                <button class="field-type" type="button" (click)="addField(form, type.type)">
                  <strong>{{ type.title }}</strong>
                  <span class="hint">{{ type.description }}</span>
                </button>
              }
            </div>
          </div>

          <div class="builder-step">
            <div class="toolbar">
              <h3>Step 3: Configure and order fields</h3>
              <span class="hint">{{ form.fields.length }} fields</span>
            </div>

            @if (!form.fields.length) {
              <div class="empty">
                <p>No fields added yet. Choose a field type above to start building the interview.</p>
              </div>
            } @else {
              <div cdkDropList (cdkDropListDropped)="dropField(form, $event)" aria-label="Interview fields">
                @for (field of form.fields; track field.id; let index = $index) {
                  <article class="drag-row" cdkDrag>
                    <button class="ur-button secondary" type="button" cdkDragHandle aria-label="Drag field">Drag</button>
                    <div>
                      <div class="grid two">
                        <div class="field">
                          <label [for]="field.id + '-label'">Question label</label>
                          <input [id]="field.id + '-label'" [name]="field.id + '-label'" [(ngModel)]="field.label" />
                        </div>
                        <div class="field">
                          <label [for]="field.id + '-placeholder'">Placeholder</label>
                          <input
                            [id]="field.id + '-placeholder'"
                            [name]="field.id + '-placeholder'"
                            [(ngModel)]="field.placeholder"
                          />
                        </div>
                      </div>
                      <div class="grid two">
                        <label class="pill">
                          <input type="checkbox" [name]="field.id + '-required'" [(ngModel)]="field.required" />
                          Required
                        </label>
                        @if (usesOptions(field)) {
                          <div class="field">
                            <label [for]="field.id + '-options'">Options</label>
                            <input
                              [id]="field.id + '-options'"
                              [name]="field.id + '-options'"
                              [ngModel]="optionText(field)"
                              (ngModelChange)="setOptions(field, $event)"
                            />
                            <p class="hint">Comma-separated list</p>
                          </div>
                        }
                      </div>
                      <details>
                        <summary>Conditional logic</summary>
                        <div class="grid three">
                          <div class="field">
                            <label [for]="field.id + '-condition-field'">Show when field</label>
                            <select
                              [id]="field.id + '-condition-field'"
                              [name]="field.id + '-condition-field'"
                              [ngModel]="field.condition?.fieldId || ''"
                              (ngModelChange)="setConditionField(field, $event)"
                            >
                              <option value="">Always show</option>
                              @for (candidate of conditionCandidates(form, field); track candidate.id) {
                                <option [value]="candidate.id">{{ candidate.label }}</option>
                              }
                            </select>
                          </div>
                          <div class="field">
                            <label [for]="field.id + '-condition-operator'">Operator</label>
                            <select
                              [id]="field.id + '-condition-operator'"
                              [name]="field.id + '-condition-operator'"
                              [disabled]="!field.condition?.fieldId"
                              [ngModel]="field.condition?.operator || 'equals'"
                              (ngModelChange)="setConditionOperator(field, $event)"
                            >
                              <option value="equals">equals</option>
                              <option value="notEquals">does not equal</option>
                              <option value="contains">contains</option>
                              <option value="greaterThan">greater than</option>
                              <option value="lessThan">less than</option>
                              <option value="isAnswered">is answered</option>
                            </select>
                          </div>
                          <div class="field">
                            <label [for]="field.id + '-condition-value'">Value</label>
                            <input
                              [id]="field.id + '-condition-value'"
                              [name]="field.id + '-condition-value'"
                              [disabled]="!field.condition?.fieldId || field.condition?.operator === 'isAnswered'"
                              [ngModel]="field.condition?.value || ''"
                              (ngModelChange)="setConditionValue(field, $event)"
                            />
                          </div>
                        </div>
                      </details>
                    </div>
                    <button class="ur-button danger" type="button" (click)="removeField(form, index)">Remove</button>
                  </article>
                }
              </div>
            }
          </div>

          @if (dialogError()) {
            <p class="error" role="alert">{{ dialogError() }}</p>
          }

          <div class="actions">
            <button class="ur-button primary" type="button" (click)="saveDraft(form)" [disabled]="saving()">Save interview</button>
            <button class="ur-button ghost" type="button" (click)="closeDialog()">Cancel</button>
          </div>
        </section>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit {
  protected readonly firebase = inject(FirebaseService);
  private readonly research = inject(ResearchService);

  readonly fieldTypes = FIELD_TYPES;
  readonly interviews = signal<Interview[]>([]);
  readonly overview = signal<AnalyticsOverview | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly signingIn = signal(false);
  readonly error = signal('');
  readonly loginError = signal('');
  readonly dialogError = signal('');
  readonly draft = signal<DraftInterview | null>(null);
  readonly editingId = signal<string | null>(null);
  email = '';
  password = '';

  async ngOnInit(): Promise<void> {
    await this.firebase.waitForAuthReady();
    if (this.firebase.user()) {
      await this.refresh();
    } else {
      this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const interviews = await this.research.listInterviews();
      this.interviews.set(interviews);
      const entries = await Promise.all(interviews.map(async (interview) => [interview.id, await this.research.loadResponses(interview.id)] as const));
      this.overview.set(buildAnalyticsOverview(interviews, Object.fromEntries(entries)));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not load dashboard data.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.dialogError.set('');
    this.draft.set({
      name: '',
      slug: '',
      description: '',
      status: 'unpublished',
      fields: [],
      rootActive: false
    });
  }

  async signIn(): Promise<void> {
    this.signingIn.set(true);
    this.loginError.set('');

    try {
      await this.firebase.signIn(this.email, this.password);
      this.password = '';
      await this.refresh();
    } catch (error) {
      this.loginError.set(error instanceof Error ? error.message : 'Could not sign in. Check email and password.');
    } finally {
      this.signingIn.set(false);
    }
  }

  openEdit(interview: Interview): void {
    this.editingId.set(interview.id);
    this.dialogError.set('');
    this.draft.set({
      ...interview,
      fields: interview.fields.map((field) => ({ ...field, options: field.options ? [...field.options] : undefined }))
    });
  }

  closeDialog(): void {
    this.draft.set(null);
    this.editingId.set(null);
    this.dialogError.set('');
  }

  syncSlug(form: DraftInterview): void {
    if (!this.editingId() && !form.slug) {
      form.slug = slugify(form.name || '');
    }
  }

  normalizeDraftSlug(form: DraftInterview): void {
    form.slug = slugify(form.slug || '');
  }

  addField(form: DraftInterview, type: InterviewField['type']): void {
    form.fields = [...form.fields, createDefaultField(type, form.fields.length)];
  }

  removeField(form: DraftInterview, index: number): void {
    form.fields = form.fields.filter((_, fieldIndex) => fieldIndex !== index);
  }

  dropField(form: DraftInterview, event: CdkDragDrop<InterviewField[]>): void {
    const fields = [...form.fields];
    moveItemInArray(fields, event.previousIndex, event.currentIndex);
    form.fields = fields;
  }

  async saveDraft(form: DraftInterview): Promise<void> {
    if (!form.name?.trim()) {
      this.dialogError.set('Give the interview a name.');
      return;
    }

    if (!form.fields.length) {
      this.dialogError.set('Add at least one field before saving.');
      return;
    }

    this.saving.set(true);
    this.dialogError.set('');

    try {
      const id = await this.research.saveInterview(form, this.editingId() ?? undefined);
      if (form.rootActive) {
        await this.research.setRootInterview(id);
      }
      this.closeDialog();
      await this.refresh();
    } catch (error) {
      this.dialogError.set(error instanceof Error ? error.message : 'Could not save interview.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleStatus(interview: Interview): Promise<void> {
    const status: InterviewStatus = interview.status === 'published' ? 'unpublished' : 'published';
    await this.research.updateInterviewStatus(interview.id, status);
    await this.refresh();
  }

  async setRoot(interview: Interview): Promise<void> {
    await this.research.setRootInterview(interview.id);
    await this.refresh();
  }

  async duplicate(interview: Interview): Promise<void> {
    await this.research.duplicateInterview(interview);
    await this.refresh();
  }

  async remove(interview: Interview): Promise<void> {
    const confirmed = window.confirm(`Delete "${interview.name}" and all responses?`);
    if (!confirmed) {
      return;
    }
    await this.research.deleteInterview(interview.id);
    await this.refresh();
  }

  usesOptions(field: InterviewField): boolean {
    return ['emoji', 'tags', 'single', 'multi', 'select', 'multiSelect'].includes(field.type);
  }

  optionText(field: InterviewField): string {
    return fieldOptions(field).map((option) => option.label === option.value ? option.value : `${option.value}|${option.label}`).join(', ');
  }

  setOptions(field: InterviewField, value: string): void {
    field.options = value.split(',').map((option) => option.trim()).filter(Boolean);
  }

  conditionCandidates(form: DraftInterview, field: InterviewField): InterviewField[] {
    return form.fields.filter((candidate) => candidate.id !== field.id);
  }

  setConditionField(field: InterviewField, fieldId: string): void {
    field.condition = fieldId ? { fieldId, operator: 'equals', value: '' } : null;
  }

  setConditionOperator(field: InterviewField, operator: ConditionOperator): void {
    if (!field.condition) {
      return;
    }
    field.condition = { ...field.condition, operator };
  }

  setConditionValue(field: InterviewField, value: string): void {
    if (!field.condition) {
      return;
    }
    field.condition = { ...field.condition, value };
  }
}
