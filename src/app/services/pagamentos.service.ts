import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CondominioService } from './condominio.service';
import { LogService } from './log.service';
import type { Pagamento } from '../models/types';

@Injectable({ providedIn: 'root' })
export class PagamentosService {
  private readonly supabase  = inject(SupabaseService);
  private readonly condSvc   = inject(CondominioService);
  private readonly log       = inject(LogService);

  private readonly _pagamentos = signal<Pagamento[]>([]);
  private readonly _loading    = signal(false);

  readonly pagamentos = this._pagamentos.asReadonly();
  readonly loading    = this._loading.asReadonly();

  private get condominioId(): string {
    const id = this.condSvc.ativo()?.id;
    if (!id) throw new Error('Nenhum condomínio ativo');
    return id;
  }

  async carregar(mesReferencia?: string, despesaId?: string): Promise<void> {
    if (!this.condSvc.ativo()?.id) return;
    this._loading.set(true);
    try {
      let query = this.supabase.client
        .from('pagamentos')
        .select('*, despesas(descricao, valor), moradores(nome, unidade)')
        .eq('condominio_id', this.condominioId)
        .order('data_pagamento', { ascending: false });

      if (mesReferencia) query = query.eq('mes_referencia', mesReferencia);
      if (despesaId)     query = query.eq('despesa_id', despesaId);

      const { data, error } = await query;
      if (error) throw error;
      this._pagamentos.set((data ?? []) as Pagamento[]);
    } finally {
      this._loading.set(false);
    }
  }

  async carregarPorPeriodo(mesInicio: string, mesFim: string): Promise<Pagamento[]> {
    if (!this.condSvc.ativo()?.id) return [];
    const { data, error } = await this.supabase.client
      .from('pagamentos')
      .select('*, despesas(descricao, valor), moradores(nome, unidade)')
      .eq('condominio_id', this.condominioId)
      .gte('mes_referencia', mesInicio)
      .lte('mes_referencia', mesFim)
      .order('data_pagamento', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Pagamento[];
  }

  async buscarPorDespesa(despesaId: string): Promise<Pagamento[]> {
    if (!this.condSvc.ativo()?.id) return [];
    const { data } = await this.supabase.client
      .from('pagamentos')
      .select('*')
      .eq('condominio_id', this.condominioId)
      .eq('despesa_id', despesaId)
      .order('data_pagamento');

    return (data ?? []) as Pagamento[];
  }

  /** Total pago para uma despesa específica */
  async totalPagoPorDespesa(despesaId: string): Promise<number> {
    const lista = await this.buscarPorDespesa(despesaId);
    return lista.reduce((s, p) => s + p.valor, 0);
  }

  async criar(
    payload: Omit<Pagamento, 'id' | 'condominio_id' | 'created_at' | 'updated_at'>,
  ): Promise<Pagamento> {
    const { data, error } = await this.supabase.client
      .from('pagamentos')
      .insert({ ...payload, condominio_id: this.condominioId })
      .select('*, despesas(descricao, valor), moradores(nome, unidade)')
      .single();

    if (error) throw error;
    const novo = data as Pagamento;
    this._pagamentos.update((list) => [novo, ...list]);

    await this.log.registrar({
      tabela:      'pagamentos',
      acao:        'PAGAR',
      descricao:   `Pagamento de R$ ${payload.valor.toFixed(2)} registrado (${payload.forma_pagamento})`,
      registro_id: novo.id,
      dados_novos: payload as Record<string, unknown>,
    });

    return novo;
  }

  async remover(id: string): Promise<void> {
    const anterior = this._pagamentos().find((p) => p.id === id);
    const { error } = await this.supabase.client
      .from('pagamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this._pagamentos.update((list) => list.filter((p) => p.id !== id));

    await this.log.registrar({
      tabela:           'pagamentos',
      acao:             'REMOVER',
      descricao:        `Pagamento removido`,
      registro_id:      id,
      dados_anteriores: anterior as unknown as Record<string, unknown>,
    });
  }

  /** Soma total dos pagamentos carregados em memória para um mês */
  totalDoMes(mes: string): number {
    return this._pagamentos()
      .filter((p) => p.mes_referencia === mes)
      .reduce((s, p) => s + p.valor, 0);
  }
}
