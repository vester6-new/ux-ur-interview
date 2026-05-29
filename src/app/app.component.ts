import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { FirebaseService } from './firebase.service';

@Component({
  selector: 'ur-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="app-shell">
      @if (showTopbar()) {
        <header class="topbar">
          <a class="brand" routerLink="/" aria-label="Open root interview">
            <span class="brand-mark" aria-hidden="true">UR</span>
            <span>UX Research Tool</span>
          </a>

          <nav class="actions" aria-label="Main navigation">
            <a class="ur-button ghost" routerLink="/dashboard">Dashboard</a>
            @if (firebase.user(); as user) {
              <span class="hint">{{ user.email }}</span>
              <button class="ur-button secondary" type="button" (click)="firebase.signOut()">Sign out</button>
            } @else {
              <a class="ur-button primary" routerLink="/dashboard">Sign in</a>
            }
          </nav>
        </header>
      }

      <main>
        <router-outlet />
      </main>
    </div>
  `
})
export class AppComponent {
  protected readonly firebase = inject(FirebaseService);
  private readonly router = inject(Router);

  protected showTopbar(): boolean {
    return this.router.url.startsWith('/dashboard');
  }
}
