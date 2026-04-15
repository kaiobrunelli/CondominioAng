import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CondominioService } from './condominio.service';
import type { Morador } from '../models/types';

@Injectable({ providedIn: 'root' })
export class MoradoresService {
  private readonly supabase = inject(SupabaseService);
  private readonly condominioSvc = inject(CondominioService);

  private readonly _moradores = signal<Morador[]>([]);
  private readonly _loading = signal(false);

  readonly moradores = this._moradores.asReadonly();
  readonly loading = this._loading.asReadonly();

  private get condominioId(): string {
    const id = this.condominioSvc.ativo()?.id;
    if (!id) throw new Error('Nenhum condomínio ativo');
    return id;
  }

  async carregar(): Promise<void> {
    if (!this.condominioSvc.ativo()?.id) return;
    this._loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('moradores')
        .select('*')
        .eq('condominio_id', this.condominioId)
        .eq('ativo', true)
        .order('unidade');

      if (error) throw error;
      this._moradores.set((data ?? []) as Morador[]);
    } finally {
      this._loading.set(false);
    }
  }

  async criar(payload: Omit<Morador, 'id' | 'condominio_id' | 'created_at' | 'updated_at'>): Promise<Morador> {
    const { data, error } = await this.supabase.client
      .from('moradores')
      .insert({ ...payload, condominio_id: this.condominioId })
      .select()
      .single();

    if (error) throw error;
    const novo = data as Morador;
    this._moradores.update((list) =>
      [...list, novo].sort((a, b) => a.unidade.localeCompare(b.unidade)),
    );
    return novo;
  }

  async atualizar(id: string, payload: Partial<Morador>): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('moradores')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const atualizado = data as Morador;
    this._moradores.update((list) =>
      list.map((m) => (m.id === id ? atualizado : m)),
    );
  }

  async remover(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('moradores')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;
    this._moradores.update((list) => list.filter((m) => m.id !== id));
  }
}
