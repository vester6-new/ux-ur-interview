import { Routes } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { InterviewDashboardComponent } from './interview-dashboard.component';
import { PublicInterviewComponent } from './public-interview.component';

export const routes: Routes = [
  { path: '', component: PublicInterviewComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'dashboard/:slug', component: InterviewDashboardComponent },
  { path: 'interview/:slug', component: PublicInterviewComponent },
  { path: ':slug', component: PublicInterviewComponent },
  { path: '**', redirectTo: '' }
];
