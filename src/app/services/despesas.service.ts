import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CondominioService } from './condominio.service';
import type { CategoriaDespesa, Despesa } from '../models/types';

@Injectable({ providedIn: 'root' })
export class DespesasService {
  private readonly supabase = inject(SupabaseService);
  private readonly condominioSvc = inject(CondominioService);

  private readonly _despesas = signal<Despesa[]>([]);
  private readonly _categorias = signal<CategoriaDespesa[]>([]);
  private readonly _loading = signal(false);

  readonly despesas = this._despesas.asReadonly();
  readonly categorias = this._categorias.asReadonly();
  readonly loading = this._loading.asReadonly();

  private get condominioId(): string {
    const id = this.condominioSvc.ativo()?.id;
    if (!id) throw new Error('Nenhum condomínio ativo');
    return id;
  }

  async carregarCategorias(): Promise<void> {
    if (!this.condominioSvc.ativo()?.id) return;
    const { data } = await this.supabase.client
      .from('categorias_despesa')
      .select('*')
      .eq('condominio_id', this.condominioId)
      .order('nome');

    this._categorias.set((data ?? []) as CategoriaDespesa[]);
  }

  async carregar(mes?: string): Promise<void> {
    if (!this.condominioSvc.ativo()?.id) return;
    this._loading.set(true);
    try {
      let query = this.supabase.client
        .from('despesas')
        .select('*, categorias_despesa(nome, icone, cor)')
        .eq('condominio_id', this.condominioId)
        .order('data_vencimento');

      if (mes) query = query.eq('mes_referencia', mes);

      const { data, error } = await query;
      if (error) throw error;
      this._despesas.set((data ?? []) as Despesa[]);
    } finally {
      this._loading.set(false);
    }
  }

  async criar(payload: Omit<Despesa, 'id' | 'condominio_id' | 'created_at' | 'updated_at'>): Promise<Despesa> {
    const { data, error } = await this.supabase.client
      .from('despesas')
      .insert({ ...payload, condominio_id: this.condominioId })
      .select('*, categorias_despesa(nome, icone, cor)')
      .single();

    if (error) throw error;
    const nova = data as Despesa;
    this._despesas.update((list) => [...list, nova]);
    return nova;
  }

  async atualizar(id: string, payload: Partial<Despesa>): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('despesas')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, categorias_despesa(nome, icone, cor)')
      .single();

    if (error) throw error;
    const atualizada = data as Despesa;
    this._despesas.update((list) =>
      list.map((d) => (d.id === id ? atualizada : d)),
    );
  }

  async remover(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('despesas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this._despesas.update((list) => list.filter((d) => d.id !== id));
  }

  async alterarStatus(id: string, status: Despesa['status']): Promise<void> {
    await this.atualizar(id, { status });
  }
}
