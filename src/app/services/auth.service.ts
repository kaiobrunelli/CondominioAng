import { inject, Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import type { Session, User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  private readonly _user    = signal<User | null>(null);
  private readonly _session = signal<Session | null>(null);
  private readonly _loading = signal(true);

  readonly user            = this._user.asReadonly();
  readonly session         = this._session.asReadonly();
  readonly loading         = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  // Promessa exposta para o APP_INITIALIZER aguardar
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    try {
      const { data } = await this.supabase.client.auth.getSession();
      this._session.set(data.session);
      this._user.set(data.session?.user ?? null);
    } catch {
      this._user.set(null);
      this._session.set(null);
    } finally {
      this._loading.set(false);
    }

    this.supabase.client.auth.onAuthStateChange((_, session) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);
    });
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUpWithEmail(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.router.navigate(['/auth']);
  }
}
