import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CondominioService } from './condominio.service';
import type { Morador, Rateio, RateioCalculo } from '../models/types';

@Injectable({ providedIn: 'root' })
export class RateioService {
  private readonly supabase = inject(SupabaseService);
  private readonly condominioSvc = inject(CondominioService);

  private readonly _rateios = signal<Rateio[]>([]);
  private readonly _loading = signal(false);

  readonly rateios = this._rateios.asReadonly();
  readonly loading = this._loading.asReadonly();

  private get condominioId(): string {
    const id = this.condominioSvc.ativo()?.id;
    if (!id) throw new Error('Nenhum condomínio ativo');
    return id;
  }

  /**
   * Cálculo de rateio ponderado por tipo de unidade.
   *
   * Algoritmo:
   *   fator = 1 + (percentualCobertura / 100)
   *   peso_normal   = 1
   *   peso_cobertura = fator
   *   totalPesos    = Σ peso de cada morador
   *   cotaBase      = totalDespesas / totalPesos
   *   valorNormal   = cotaBase × 1
   *   valorCobertura= cotaBase × fator
   *
   * Ajuste de centavos no primeiro morador para garantir fechamento exato.
   */
  calcularRateio(
    totalDespesas: number,
    moradores: Morador[],
    percentualCobertura: number,
  ): RateioCalculo[] {
    if (moradores.length === 0 || totalDespesas <= 0) return [];

    const fator = 1 + percentualCobertura / 100;
    const totalPesos = moradores.reduce(
      (sum, m) => sum + (m.tipo === 'cobertura' ? fator : 1),
      0,
    );
    const cotaBase = totalDespesas / totalPesos;

    const resultados: RateioCalculo[] = moradores.map((m) => {
      const peso = m.tipo === 'cobertura' ? fator : 1;
      const valorTotal = cotaBase * peso;
      const valorAdicional = m.tipo === 'cobertura' ? cotaBase * (fator - 1) : 0;
      return { morador: m, valorBase: cotaBase, valorAdicional, valorTotal };
    });

    // Garante fechamento exato (ajuste de arredondamento no primeiro item)
    const soma = resultados.reduce((s, r) => s + r.valorTotal, 0);
    const diff = totalDespesas - soma;
    if (Math.abs(diff) > 0.001) {
      const primeiro = resultados[0];
      resultados[0] = { ...primeiro, valorTotal: primeiro.valorTotal + diff };
    }

    return resultados;
  }

  async salvarRateio(mes: string, calculos: RateioCalculo[]): Promise<void> {
    this._loading.set(true);
    try {
      await this.supabase.client
        .from('rateios')
        .delete()
        .eq('condominio_id', this.condominioId)
        .eq('mes_referencia', mes);

      const rows = calculos.map((c) => ({
        condominio_id: this.condominioId,
        mes_referencia: mes,
        morador_id: c.morador.id,
        valor_base: parseFloat(c.valorBase.toFixed(2)),
        valor_adicional: parseFloat(c.valorAdicional.toFixed(2)),
        valor_total: parseFloat(c.valorTotal.toFixed(2)),
        status_pagamento: 'pendente',
      }));

      const { error } = await this.supabase.client.from('rateios').insert(rows);
      if (error) throw error;

      await this.carregar(mes);
    } finally {
      this._loading.set(false);
    }
  }

  async carregar(mes?: string): Promise<void> {
    if (!this.condominioSvc.ativo()?.id) return;
    this._loading.set(true);
    try {
      let query = this.supabase.client
        .from('rateios')
        .select('*, moradores(nome, unidade, tipo)')
        .eq('condominio_id', this.condominioId);

      if (mes) query = query.eq('mes_referencia', mes);

      const { data, error } = await query;
      if (error) throw error;
      this._rateios.set((data ?? []) as Rateio[]);
    } finally {
      this._loading.set(false);
    }
  }

  async marcarPago(id: string): Promise<void> {
    const hoje = new Date().toISOString().split('T')[0];
    const { error } = await this.supabase.client
      .from('rateios')
      .update({ status_pagamento: 'pago', data_pagamento: hoje })
      .eq('id', id);

    if (error) throw error;
    this._rateios.update((list) =>
      list.map((r) =>
        r.id === id
          ? { ...r, status_pagamento: 'pago' as const, data_pagamento: hoje }
          : r,
      ),
    );
  }
}
