import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Condominio } from '../models/types';

const STORAGE_KEY = 'condogest_active_condo';

@Injectable({ providedIn: 'root' })
export class CondominioService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  private readonly _condominios = signal<Condominio[]>([]);
  private readonly _ativo = signal<Condominio | null>(null);
  private readonly _loading = signal(false);

  readonly condominios = this._condominios.asReadonly();
  readonly ativo = this._ativo.asReadonly();
  readonly loading = this._loading.asReadonly();

  async carregar(): Promise<void> {
    this._loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('condominios')
        .select('*')
        .order('nome');

      if (error) throw error;

      const list = (data ?? []) as Condominio[];
      this._condominios.set(list);

      const savedId = localStorage.getItem(STORAGE_KEY);
      const saved = savedId ? list.find((c) => c.id === savedId) : undefined;

      if (saved) {
        this._ativo.set(saved);
      } else if (list.length > 0) {
        this.setAtivo(list[0]);
      }
    } finally {
      this._loading.set(false);
    }
  }

  setAtivo(c: Condominio): void {
    this._ativo.set(c);
    localStorage.setItem(STORAGE_KEY, c.id);
  }

  async criar(payload: Omit<Condominio, 'id' | 'codigo' | 'created_at' | 'updated_at'>): Promise<Condominio> {
    const codigo = `COND-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data, error } = await this.supabase.client
      .from('condominios')
      .insert({ ...payload, codigo })
      .select()
      .single();

    if (error) throw error;

    const userId = this.auth.user()?.id;
    if (userId) {
      await this.supabase.client.from('usuarios_condominios').insert({
        user_id: userId,
        condominio_id: (data as Condominio).id,
        role: 'sindico',
      });
    }

    await this.carregar();
    return data as Condominio;
  }

  async atualizar(id: string, payload: Partial<Condominio>): Promise<void> {
    const { error } = await this.supabase.client
      .from('condominios')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await this.carregar();
  }
}
