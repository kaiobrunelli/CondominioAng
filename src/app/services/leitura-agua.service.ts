import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CondominioService } from './condominio.service';
import type { ConfigAgua, LeituraAgua } from '../models/types';

@Injectable({ providedIn: 'root' })
export class LeituraAguaService {
  private readonly supabase = inject(SupabaseService);
  private readonly condominioSvc = inject(CondominioService);

  private readonly _config = signal<ConfigAgua | null>(null);
  private readonly _leituras = signal<LeituraAgua[]>([]);
  private readonly _leiturasPrevMes = signal<Pick<LeituraAgua, 'morador_id' | 'leitura_atual'>[]>([]);
  private readonly _loading = signal(false);

  readonly config = this._config.asReadonly();
  readonly leituras = this._leituras.asReadonly();
  readonly leiturasPrevMes = this._leiturasPrevMes.asReadonly();
  readonly loading = this._loading.asReadonly();

  private get condominioId(): string {
    const id = this.condominioSvc.ativo()?.id;
    if (!id) throw new Error('Nenhum condomínio ativo');
    return id;
  }

  async carregarConfig(): Promise<void> {
    const { data } = await this.supabase.client
      .from('config_agua')
      .select('*')
      .eq('condominio_id', this.condominioId)
      .maybeSingle();

    if (data) {
      this._config.set(data as ConfigAgua);
      return;
    }

    // Cria config padrão se não existir
    const { data: nova, error } = await this.supabase.client
      .from('config_agua')
      .insert({ condominio_id: this.condominioId, valor_por_litro: 1.0 })
      .select()
      .single();
    if (error) throw error;
    this._config.set(nova as ConfigAgua);
  }

  async atualizarConfig(valorPorLitro: number): Promise<void> {
    const config = this._config();
    if (!config) return;
    const { data, error } = await this.supabase.client
      .from('config_agua')
      .update({ valor_por_litro: valorPorLitro, updated_at: new Date().toISOString() })
      .eq('id', config.id)
      .select()
      .single();
    if (error) throw error;
    this._config.set(data as ConfigAgua);
  }

  async carregarMes(mes: string): Promise<void> {
    this._loading.set(true);
    try {
      // Leituras do mês selecionado
      const { data: current } = await this.supabase.client
        .from('leituras_agua')
        .select('*, moradores(nome, unidade, tipo)')
        .eq('condominio_id', this.condominioId)
        .eq('mes_referencia', mes)
        .order('created_at');
      this._leituras.set((current ?? []) as LeituraAgua[]);

      // Leituras do mês anterior (para pré-preencher leitura_anterior)
      const { data: prev } = await this.supabase.client
        .from('leituras_agua')
        .select('morador_id, leitura_atual')
        .eq('condominio_id', this.condominioId)
        .eq('mes_referencia', mesAnterior(mes));
      this._leiturasPrevMes.set(
        (prev ?? []) as Pick<LeituraAgua, 'morador_id' | 'leitura_atual'>[],
      );
    } finally {
      this._loading.set(false);
    }
  }

  /** Retorna a última leitura registrada para o morador (como ponto de partida). */
  leituraAnteriorDe(moradorId: string): number {
    return (
      this._leiturasPrevMes().find((l) => l.morador_id === moradorId)
        ?.leitura_atual ?? 0
    );
  }

  async salvarLeitura(payload: Omit<LeituraAgua, 'id' | 'condominio_id' | 'created_at' | 'updated_at' | 'moradores'>): Promise<LeituraAgua> {
    const existing = this._leituras().find((l) => l.morador_id === payload.morador_id);
    let result: LeituraAgua;

    if (existing) {
      const { data, error } = await this.supabase.client
        .from('leituras_agua')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*, moradores(nome, unidade, tipo)')
        .single();
      if (error) throw error;
      result = data as LeituraAgua;
      this._leituras.update((list) =>
        list.map((l) => (l.id === existing.id ? result : l)),
      );
    } else {
      const { data, error } = await this.supabase.client
        .from('leituras_agua')
        .insert({ ...payload, condominio_id: this.condominioId })
        .select('*, moradores(nome, unidade, tipo)')
        .single();
      if (error) throw error;
      result = data as LeituraAgua;
      this._leituras.update((list) => [...list, result]);
    }
    return result;
  }

  async vincularDespesa(leituraId: string, despesaId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('leituras_agua')
      .update({ despesa_id: despesaId })
      .eq('id', leituraId);
    if (error) throw error;
    this._leituras.update((list) =>
      list.map((l) => (l.id === leituraId ? { ...l, despesa_id: despesaId } : l)),
    );
  }
}

// ── helpers de data ─────────────────────────────────────────
export function mesAnterior(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1); // m-1 para 0-indexed, -1 para mês anterior
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function mesProximo(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m, 1); // m já é 0-indexed para o próximo mês
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMesLabel(mes: string): string {
  const [y, m] = mes.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
}
