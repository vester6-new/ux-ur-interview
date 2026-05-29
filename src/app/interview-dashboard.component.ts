import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { displayAnswer, buildInterviewStats } from './logic';
import { FirebaseService } from './firebase.service';
import { Interview, InterviewField, InterviewStats, ResponseEntry } from './models';
import { ResearchService } from './research.service';

@Component({
  selector: 'ur-interview-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      @if (!firebase.authReady()) {
        <div class="card login-card">Checking sign-in...</div>
      } @else if (!firebase.user()) {
        <form class="card login-card" (ngSubmit)="signIn()" novalidate>
          <h1>Dashboard login</h1>
          <p class="lede">Sign in with the same email and password used before the Angular migration.</p>
          <div class="field">
            <label for="results-email">Email</label>
            <input id="results-email" name="email" type="email" autocomplete="email" [(ngModel)]="email" />
          </div>
          <div class="field">
            <label for="results-password">Password</label>
            <input
              id="results-password"
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
      } @else if (loading()) {
        <div class="card">Loading results...</div>
      } @else if (error()) {
        <div class="card" role="alert">
          <p class="error">{{ error() }}</p>
          <a class="ur-button ghost" routerLink="/dashboard">Back to dashboard</a>
        </div>
      } @else {
        @if (interview(); as current) {
          <div class="hero">
            <p class="eyebrow">Interview results</p>
            <h1>{{ current.name }}</h1>
            <p class="lede">{{ current.description || 'Review participant responses and export the raw data.' }}</p>
            <div class="actions">
              <a class="ur-button ghost" routerLink="/dashboard">Back to dashboard</a>
              <a class="ur-button ghost" [routerLink]="['/', current.slug]">Open public form</a>
              <button class="ur-button primary" type="button" (click)="export(current)">Export CSV</button>
            </div>
          </div>

          @if (stats(); as summary) {
            <div class="grid three">
            <article class="card">
              <p class="eyebrow">Responses</p>
              <h2>{{ summary.totalResponses }}</h2>
            </article>
            <article class="card">
              <p class="eyebrow">Average score</p>
              <h2>{{ summary.averageScore ?? 'N/A' }}</h2>
            </article>
            <article class="card">
              <p class="eyebrow">Latest response</p>
              <h3>{{ summary.lastResponseLabel }}</h3>
            </article>
          </div>

          <section class="card">
            <h2>Field completion</h2>
            <div class="grid">
              @for (field of summary.fieldCompletion; track field.label) {
                <div>
                  <div class="toolbar">
                    <strong>{{ field.label }}</strong>
                    <span>{{ field.count }} responses, {{ field.percent }}%</span>
                  </div>
                  <progress [value]="field.percent" max="100">{{ field.percent }}%</progress>
                </div>
              }
            </div>
          </section>

          <section class="card">
            <h2>Choice summaries</h2>
            @if (countKeys(summary).length) {
              <div class="grid two">
                @for (key of countKeys(summary); track key) {
                  <article class="card">
                    <h3>{{ fieldLabel(current, key) }}</h3>
                    @for (item of summary.counts[key]; track item.label) {
                      <div class="toolbar">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.count }}</strong>
                      </div>
                    }
                  </article>
                }
              </div>
            } @else {
              <p class="hint">No choice-based fields have responses yet.</p>
            }
            </section>
          }

          <section class="card">
          <div class="toolbar">
            <h2>Responses</h2>
            <span class="hint">{{ responses().length }} total</span>
          </div>

          @if (!responses().length) {
            <div class="empty">No responses have been submitted yet.</div>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Submitted</th>
                    @for (field of current.fields; track field.id) {
                      <th>{{ field.label }}</th>
                    }
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (response of responses(); track response.id) {
                    <tr>
                      <td>{{ response.ts | date: 'medium' }}</td>
                      @for (field of current.fields; track field.id) {
                        <td>{{ display(field, response.answers[field.id]) }}</td>
                      }
                      <td>
                        <button class="ur-button danger" type="button" (click)="removeResponse(current, response)">Delete</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          </section>
        }
      }
    </section>
  `
})
export class InterviewDashboardComponent implements OnInit {
  protected readonly firebase = inject(FirebaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly research = inject(ResearchService);

  readonly interview = signal<Interview | null>(null);
  readonly responses = signal<ResponseEntry[]>([]);
  readonly stats = signal<InterviewStats | null>(null);
  readonly loading = signal(true);
  readonly signingIn = signal(false);
  readonly error = signal('');
  readonly loginError = signal('');
  email = '';
  password = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      void this.loadWhenAuthenticated(params.get('slug') ?? '');
    });
  }

  async loadWhenAuthenticated(slug: string): Promise<void> {
    await this.firebase.waitForAuthReady();
    if (this.firebase.user()) {
      await this.load(slug);
    } else {
      this.loading.set(false);
    }
  }

  async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const interview = await this.research.findInterviewBySlug(slug);
      if (!interview) {
        this.error.set('This interview does not exist.');
        return;
      }

      const responses = await this.research.loadResponses(interview.id);
      this.interview.set(interview);
      this.responses.set(responses);
      this.stats.set(buildInterviewStats(interview, responses));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not load interview results.');
    } finally {
      this.loading.set(false);
    }
  }

  async signIn(): Promise<void> {
    this.signingIn.set(true);
    this.loginError.set('');

    try {
      await this.firebase.signIn(this.email, this.password);
      this.password = '';
      await this.load(this.route.snapshot.paramMap.get('slug') ?? '');
    } catch (error) {
      this.loginError.set(error instanceof Error ? error.message : 'Could not sign in. Check email and password.');
    } finally {
      this.signingIn.set(false);
    }
  }

  display(field: InterviewField, value: unknown): string {
    return displayAnswer(field, value);
  }

  countKeys(stats: InterviewStats): string[] {
    return Object.keys(stats.counts).filter((key) => stats.counts[key]?.length);
  }

  fieldLabel(interview: Interview, fieldId: string): string {
    return interview.fields.find((field) => field.id === fieldId)?.label ?? fieldId;
  }

  export(interview: Interview): void {
    this.research.exportResponses(interview, this.responses());
  }

  async removeResponse(interview: Interview, response: ResponseEntry): Promise<void> {
    const confirmed = window.confirm('Delete this response?');
    if (!confirmed) {
      return;
    }

    await this.research.deleteResponse(interview.id, response.id);
    await this.load(interview.slug);
  }
}
