import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  Auth,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD0byY3-zsyo7NoMWumcUJk7mC_bgAIyXk',
  authDomain: 'ux-ur-interview.firebaseapp.com',
  projectId: 'ux-ur-interview',
  storageBucket: 'ux-ur-interview.firebasestorage.app',
  messagingSenderId: '942807827099',
  appId: '1:942807827099:web:699e6536315f006061fc3e',
  measurementId: 'G-79FHQPFCXR'
};

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly app = initializeApp(firebaseConfig);
  readonly auth: Auth = getAuth(this.app);
  readonly db: Firestore = getFirestore(this.app);
  readonly user = signal<User | null>(null);
  readonly authReady = signal(false);
  readonly authError = signal('');
  private resolveAuthReady!: () => void;
  private readonly authReadyPromise = new Promise<void>((resolve) => {
    this.resolveAuthReady = resolve;
  });

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      this.authReady.set(true);
      this.resolveAuthReady();
    });
  }

  async waitForAuthReady(): Promise<void> {
    await this.authReadyPromise;
  }

  async signIn(email: string, password: string): Promise<void> {
    this.authError.set('');

    try {
      await signInWithEmailAndPassword(this.auth, email.trim(), password);
    } catch {
      this.authError.set('Could not sign in. Check email and password.');
      throw new Error('Could not sign in. Check email and password.');
    }
  }

  async signOut(): Promise<void> {
    this.authError.set('');
    await signOut(this.auth);
  }
}
