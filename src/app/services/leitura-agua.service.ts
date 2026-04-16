import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CondominioService } from './condominio.service';
import { LogService } from './log.service';
import type { LeituraAgua } from '../models/types';

const STORAGE_KEY = 'condogest_agua_preco';

@Injectable({ providedIn: 'root' })
export class LeituraAguaService {
  private readonly supabase = inject(SupabaseService);
  private readonly condSvc  = inject(CondominioService);
  private readonly log      = inject(LogService);

  private readonly _valorPorLitro = signal(this.loadPrice());
  private readonly _leituras      = signal<LeituraAgua[]>([]);
  private readonly _loading       = signal(false);

  readonly valorPorLitro = this._valorPorLitro.asReadonly();
  readonly leituras      = this._leituras.asReadonly();
  readonly loading       = this._loading.asReadonly();

  // ── Preço ────────────────────────────────────────────────
  private loadPrice(): number {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      const n = v ? Number(v) : 1.0;
      return isFinite(n) && n > 0 ? n : 1.0;
    } catch {
      return 1.0;
    }
  }

  salvarPreco(valor: number): void {
    if (!isFinite(valor) || valor <= 0) return;
    this._valorPorLitro.set(valor);
    try { localStorage.setItem(STORAGE_KEY, String(valor)); } catch { /* ignore */ }
  }

  // ── Leituras ─────────────────────────────────────────────
  /** Carrega todas as leituras de um mês de referência */
  async carregarPorMes(mesReferencia: string): Promise<void> {
    const condId = this.condSvc.ativo()?.id;
    if (!condId) return;

    this._loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('leituras_agua')
        .select('*, moradores(nome, unidade, tipo)')
        .eq('condominio_id', condId)
        .eq('mes_referencia', mesReferencia);

      if (error) throw error;
      this._leituras.set((data ?? []) as LeituraAgua[]);
    } finally {
      this._loading.set(false);
    }
  }

  /** Busca a leitura mais recente de um morador (para pré-preencher leitura anterior) */
  async buscarUltimaLeitura(
    moradorId: string,
    mesAnteriorA: string,
  ): Promise<LeituraAgua | null> {
    const condId = this.condSvc.ativo()?.id;
    if (!condId) return null;

    const { data } = await this.supabase.client
      .from('leituras_agua')
      .select('*')
      .eq('condominio_id', condId)
      .eq('morador_id', moradorId)
      .lt('mes_referencia', mesAnteriorA)
      .order('mes_referencia', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data as LeituraAgua | null;
  }

  /** Salva (upsert) uma leitura — atualiza se já existe para o mês */
  async salvar(
    leitura: Omit<LeituraAgua, 'id' | 'condominio_id' | 'created_at' | 'updated_at'>,
  ): Promise<LeituraAgua> {
    const condId = this.condSvc.ativo()?.id;
    if (!condId) throw new Error('Nenhum condomínio ativo');

    const { data, error } = await this.supabase.client
      .from('leituras_agua')
      .upsert(
        { ...leitura, condominio_id: condId },
        { onConflict: 'condominio_id,morador_id,mes_referencia' },
      )
      .select('*, moradores(nome, unidade, tipo)')
      .single();

    if (error) throw error;
    const saved = data as LeituraAgua;

    // Atualiza memória
    this._leituras.update((list) => {
      const idx = list.findIndex(
        (l) => l.morador_id === saved.morador_id && l.mes_referencia === saved.mes_referencia,
      );
      return idx >= 0
        ? list.map((l, i) => (i === idx ? saved : l))
        : [...list, saved];
    });

    await this.log.registrar({
      tabela:      'leituras_agua',
      acao:        'LEITURA_AGUA',
      descricao:   `Leitura de água registrada — ${saved.mes_referencia} · consumo: ${saved.consumo_litros.toFixed(3)}L`,
      registro_id: saved.id,
      dados_novos: leitura as unknown as Record<string, unknown>,
    });

    return saved;
  }
}

// ── helpers de data/formato exportados ──────────────────────
export function mesProximo(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMesLabel(mes: string): string {
  const [y, m] = mes.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
}
