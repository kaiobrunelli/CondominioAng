import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CondominioService } from './condominio.service';
import { LogService } from './log.service';
import type { CategoriaDespesa, Despesa } from '../models/types';

@Injectable({ providedIn: 'root' })
export class DespesasService {
  private readonly supabase = inject(SupabaseService);
  private readonly condSvc  = inject(CondominioService);
  private readonly log      = inject(LogService);

  private readonly _despesas   = signal<Despesa[]>([]);
  private readonly _categorias = signal<CategoriaDespesa[]>([]);
  private readonly _loading    = signal(false);

  readonly despesas   = this._despesas.asReadonly();
  readonly categorias = this._categorias.asReadonly();
  readonly loading    = this._loading.asReadonly();

  private get condominioId(): string {
    const id = this.condSvc.ativo()?.id;
    if (!id) throw new Error('Nenhum condomínio ativo');
    return id;
  }

  async carregarCategorias(): Promise<void> {
    if (!this.condSvc.ativo()?.id) return;
    const { data } = await this.supabase.client
      .from('categorias_despesa')
      .select('*')
      .eq('condominio_id', this.condominioId)
      .order('nome');

    this._categorias.set((data ?? []) as CategoriaDespesa[]);
  }

  async carregar(mes?: string): Promise<void> {
    if (!this.condSvc.ativo()?.id) return;
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

  /** Carrega despesas em um intervalo de meses (para relatório) */
  async carregarPorPeriodo(mesInicio: string, mesFim: string): Promise<Despesa[]> {
    if (!this.condSvc.ativo()?.id) return [];
    const { data, error } = await this.supabase.client
      .from('despesas')
      .select('*, categorias_despesa(nome, icone, cor)')
      .eq('condominio_id', this.condominioId)
      .gte('mes_referencia', mesInicio)
      .lte('mes_referencia', mesFim)
      .order('data_vencimento');

    if (error) throw error;
    return (data ?? []) as Despesa[];
  }

  async criar(
    payload: Omit<Despesa, 'id' | 'condominio_id' | 'created_at' | 'updated_at'>,
  ): Promise<Despesa> {
    const { data, error } = await this.supabase.client
      .from('despesas')
      .insert({ ...payload, condominio_id: this.condominioId })
      .select('*, categorias_despesa(nome, icone, cor)')
      .single();

    if (error) throw error;
    const nova = data as Despesa;
    this._despesas.update((list) => [...list, nova]);

    await this.log.registrar({
      tabela:      'despesas',
      acao:        'CRIAR',
      descricao:   `Despesa criada: "${nova.descricao}" — R$ ${nova.valor.toFixed(2)}`,
      registro_id: nova.id,
      dados_novos: payload as unknown as Record<string, unknown>,
    });

    return nova;
  }

  async atualizar(id: string, payload: Partial<Despesa>): Promise<void> {
    const anterior = this._despesas().find((d) => d.id === id);

    const { data, error } = await this.supabase.client
      .from('despesas')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, categorias_despesa(nome, icone, cor)')
      .single();

    if (error) throw error;
    const atualizada = data as Despesa;
    this._despesas.update((list) => list.map((d) => (d.id === id ? atualizada : d)));

    await this.log.registrar({
      tabela:           'despesas',
      acao:             'ATUALIZAR',
      descricao:        `Despesa atualizada: "${atualizada.descricao}"`,
      registro_id:      id,
      dados_anteriores: anterior as unknown as Record<string, unknown>,
      dados_novos:      payload as unknown as Record<string, unknown>,
    });
  }

  async remover(id: string): Promise<void> {
    const anterior = this._despesas().find((d) => d.id === id);
    const { error } = await this.supabase.client
      .from('despesas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this._despesas.update((list) => list.filter((d) => d.id !== id));

    await this.log.registrar({
      tabela:           'despesas',
      acao:             'REMOVER',
      descricao:        `Despesa removida: "${anterior?.descricao ?? id}"`,
      registro_id:      id,
      dados_anteriores: anterior as unknown as Record<string, unknown>,
    });
  }

  async alterarStatus(id: string, status: Despesa['status']): Promise<void> {
    const anterior = this._despesas().find((d) => d.id === id);
    await this.atualizar(id, { status });

    await this.log.registrar({
      tabela:           'despesas',
      acao:             'STATUS',
      descricao:        `Status alterado: "${anterior?.descricao ?? id}" → ${status}`,
      registro_id:      id,
      dados_anteriores: { status: anterior?.status },
      dados_novos:      { status },
    });
  }
}
