import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

import { FirebaseService } from './firebase.service';
import { DEFAULT_FIELDS, Interview, InterviewField, InterviewStatus, ResponseEntry, normalizeOption } from './models';
import { csvEscape, slugify } from './logic';

type InterviewWrite = Omit<Interview, 'id'>;

@Injectable({ providedIn: 'root' })
export class ResearchService {
  private readonly firebase = inject(FirebaseService);

  async listInterviews(): Promise<Interview[]> {
    const snapshot = await getDocs(query(collection(this.firebase.db, 'interviews'), orderBy('updatedAt', 'desc')));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Interview));
  }

  async findInterviewBySlug(slug: string): Promise<Interview | null> {
    const snapshot = await getDocs(query(collection(this.firebase.db, 'interviews'), where('slug', '==', slug), limit(1)));
    const first = snapshot.docs[0];
    return first ? ({ id: first.id, ...first.data() } as Interview) : null;
  }

  async findPublishedInterviewBySlug(slug: string): Promise<Interview | null> {
    const interviews = await this.listPublishedInterviews();
    return interviews.find((interview) => interview.slug === slug) ?? null;
  }

  async findRootInterview(): Promise<Interview | null> {
    const snapshot = await getDocs(query(collection(this.firebase.db, 'interviews'), where('rootActive', '==', true), limit(1)));
    const first = snapshot.docs[0];
    return first ? ({ id: first.id, ...first.data() } as Interview) : null;
  }

  async findPublishedRootInterview(): Promise<Interview | null> {
    const interviews = await this.listPublishedInterviews();
    return interviews.find((interview) => interview.rootActive) ?? interviews[0] ?? null;
  }

  async listPublishedInterviews(): Promise<Interview[]> {
    const snapshot = await getDocs(
      query(
        collection(this.firebase.db, 'interviews'),
        where('status', '==', 'published')
      )
    );
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Interview));
  }

  async slugAvailable(slug: string, currentId?: string): Promise<boolean> {
    const existing = await this.findInterviewBySlug(slug);
    return !existing || existing.id === currentId;
  }

  async saveInterview(input: Partial<Interview>, currentId?: string): Promise<string> {
    const slug = slugify(input.slug || input.name || 'interview');
    const available = await this.slugAvailable(slug, currentId);
    if (!available) {
      throw new Error('An interview with this URL already exists.');
    }

    const payload: InterviewWrite = {
      name: input.name?.trim() || 'Untitled interview',
      slug,
      description: input.description?.trim() || '',
      status: input.status ?? 'unpublished',
      fields: this.normalizeFields(input.fields),
      rootActive: Boolean(input.rootActive),
      createdAt: input.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (currentId) {
      await updateDoc(doc(this.firebase.db, 'interviews', currentId), {
        ...payload,
        createdAt: input.createdAt,
        updatedAt: serverTimestamp()
      });
      return currentId;
    }

    const created = await addDoc(collection(this.firebase.db, 'interviews'), payload);
    return created.id;
  }

  async updateInterviewStatus(interviewId: string, status: InterviewStatus): Promise<void> {
    await updateDoc(doc(this.firebase.db, 'interviews', interviewId), {
      status,
      updatedAt: serverTimestamp()
    });
  }

  async setRootInterview(interviewId: string): Promise<void> {
    const interviews = await this.listInterviews();
    await Promise.all(
      interviews.map((interview) =>
        updateDoc(doc(this.firebase.db, 'interviews', interview.id), {
          rootActive: interview.id === interviewId,
          updatedAt: serverTimestamp()
        })
      )
    );
  }

  async duplicateInterview(interview: Interview): Promise<string> {
    return this.saveInterview({
      name: `${interview.name} copy`,
      slug: `${interview.slug}-copy`,
      description: interview.description,
      status: 'unpublished',
      fields: interview.fields.map((field) => ({ ...field })),
      rootActive: false
    });
  }

  async deleteInterview(interviewId: string): Promise<void> {
    const responses = await getDocs(collection(this.firebase.db, 'interviews', interviewId, 'responses'));
    await Promise.all(responses.docs.map((response) => deleteDoc(response.ref)));
    await deleteDoc(doc(this.firebase.db, 'interviews', interviewId));
  }

  async loadResponses(interviewId: string): Promise<ResponseEntry[]> {
    const snapshot = await getDocs(
      query(collection(this.firebase.db, 'interviews', interviewId, 'responses'), orderBy('createdAt', 'desc'))
    );
    return snapshot.docs.map((item) => ({ ...item.data() } as ResponseEntry));
  }

  async saveResponse(interviewId: string, entry: ResponseEntry): Promise<void> {
    await setDoc(doc(collection(this.firebase.db, 'interviews', interviewId, 'responses')), {
      id: entry.id,
      ts: entry.ts,
      answers: entry.answers,
      createdAt: serverTimestamp()
    });
  }

  async deleteResponse(interviewId: string, responseId: number): Promise<void> {
    const snapshot = await getDocs(
      query(collection(this.firebase.db, 'interviews', interviewId, 'responses'), where('id', '==', responseId), limit(1))
    );
    await Promise.all(snapshot.docs.map((response) => deleteDoc(response.ref)));
  }

  exportResponses(interview: Interview, responses: ResponseEntry[]): void {
    const headers = ['Submitted', ...interview.fields.map((field) => field.label)];
    const rows = responses.map((response) => [
      response.ts,
      ...interview.fields.map((field) => {
        const value = response.answers[field.id];
        return Array.isArray(value) ? value.join(', ') : value;
      })
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${interview.slug}-responses.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private normalizeFields(fields: InterviewField[] | undefined): InterviewField[] {
    const source = fields?.length ? fields : DEFAULT_FIELDS;
    return source.map((field) => ({
      ...field,
      label: field.label.trim() || 'Untitled question',
      options: field.options?.map(normalizeOption).filter((option) => option.value)
    }));
  }
}
