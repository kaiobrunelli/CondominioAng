import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CondominioService } from '../../services/condominio.service';

import { DespesasService } from '../../services/despesas.service';
import { MoradoresService } from '../../services/moradores.service';
import { SupabaseService } from '../../services/supabase.service';
import type { Despesa, RelatorioMensal } from '../../models/types';

type StatusKey = 'pago' | 'pendente' | 'atrasado';

const STATUS_LABEL: Record<StatusKey, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
};

const STATUS_BADGE_CLASS: Record<StatusKey, string> = {
  pago:     'text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700',
  pendente: 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100  text-amber-700',
  atrasado: 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100    text-red-700',
};

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-semibold text-slate-900">
            Olá, síndico 👋
          </h1>
          <p class="text-slate-500 text-sm mt-0.5">
            {{ condominioSvc.ativo()?.nome }} &nbsp;·&nbsp; {{ mesAtualLabel }}
          </p>
        </div>
        <a
          routerLink="/despesas"
          class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span class="material-symbols-rounded text-[18px]" aria-hidden="true">add</span>
          Nova Despesa
        </a>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" role="list" aria-label="Indicadores do mês">

        <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-5" role="listitem">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-slate-500">Despesas do Mês</span>
            <div class="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center" aria-hidden="true">
              <span class="material-symbols-rounded text-red-500 text-[20px]">receipt_long</span>
            </div>
          </div>
          <p class="text-2xl font-display font-semibold text-slate-900">
            {{ relatorio()?.total_despesas | currency:'BRL':'symbol':'1.2-2' }}
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ relatorio()?.qtd_despesas ?? 0 }} lançamentos</p>
        </article>

        <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-5" role="listitem">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-slate-500">Pagas</span>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center" aria-hidden="true">
              <span class="material-symbols-rounded text-emerald-500 text-[20px]">check_circle</span>
            </div>
          </div>
          <p class="text-2xl font-display font-semibold text-slate-900">
            {{ relatorio()?.despesas_pagas | currency:'BRL':'symbol':'1.2-2' }}
          </p>
          <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden" role="progressbar"
            [attr.aria-valuenow]="percentualPago()"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-label]="'Percentual pago: ' + percentualPago() + '%'"
          >
            <div
              class="h-full bg-emerald-500 rounded-full transition-all duration-500"
              [style.width]="percentualPago() + '%'"
            ></div>
          </div>
        </article>

        <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-5" role="listitem">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-slate-500">Pendentes</span>
            <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center" aria-hidden="true">
              <span class="material-symbols-rounded text-amber-500 text-[20px]">schedule</span>
            </div>
          </div>
          <p class="text-2xl font-display font-semibold text-slate-900">
            {{ relatorio()?.despesas_pendentes | currency:'BRL':'symbol':'1.2-2' }}
          </p>
          <p class="text-xs text-slate-400 mt-1">A vencer</p>
        </article>

        <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-5" role="listitem">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-slate-500">Moradores</span>
            <div class="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center" aria-hidden="true">
              <span class="material-symbols-rounded text-primary-600 text-[20px]">groups</span>
            </div>
          </div>
          <p class="text-2xl font-display font-semibold text-slate-900">
            {{ moradoresSvc.moradores().length }}
          </p>
          <p class="text-xs text-slate-400 mt-1">
            {{ qtdCobertura() }} cobertura · {{ qtdNormal() }} normal
          </p>
        </article>
      </div>

      <!-- Saldo -->
      <div
        class="rounded-2xl p-5 border flex items-center gap-4"
        [class]="saldoPositivo()
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
          : 'bg-red-50 border-red-100 text-red-800'"
        role="status"
        [attr.aria-label]="'Saldo do mês: ' + (relatorio()?.saldo | currency:'BRL':'symbol':'1.2-2')"
      >
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          [class]="saldoPositivo() ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'"
          aria-hidden="true"
        >
          <span class="material-symbols-rounded text-[24px]">
            {{ saldoPositivo() ? 'trending_up' : 'trending_down' }}
          </span>
        </div>
        <div>
          <p class="text-sm font-medium opacity-75">Saldo do mês (Receitas − Despesas)</p>
          <p class="text-3xl font-display font-bold">
            {{ relatorio()?.saldo | currency:'BRL':'symbol':'1.2-2' }}
          </p>
        </div>
      </div>

      <!-- Últimas despesas -->
      <section class="bg-white rounded-2xl border border-slate-100 shadow-card p-5" aria-labelledby="ultimas-despesas-title">
        <div class="flex items-center justify-between mb-4">
          <h2 id="ultimas-despesas-title" class="font-display font-semibold text-slate-800">
            Últimas Despesas
          </h2>
          <a
            routerLink="/despesas"
            class="text-sm text-primary-600 hover:text-primary-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Ver todas →
          </a>
        </div>

        @if (despesasSvc.despesas().length === 0) {
          <div class="text-center py-8 text-slate-400">
            <span class="material-symbols-rounded text-4xl block mb-2" aria-hidden="true">receipt_long</span>
            <p class="text-sm">Nenhuma despesa cadastrada este mês</p>
          </div>
        } @else {
          <ul class="space-y-1" aria-label="Últimas despesas">
            @for (despesa of ultimasDespesas(); track despesa.id) {
              <li class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div
                  class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  [style.background]="(despesa.categorias_despesa?.cor ?? '#3B82F6') + '18'"
                  aria-hidden="true"
                >
                  <span
                    class="material-symbols-rounded text-[18px]"
                    [style.color]="despesa.categorias_despesa?.cor ?? '#3B82F6'"
                  >
                    {{ despesa.categorias_despesa?.icone ?? 'receipt' }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800 truncate">{{ despesa.descricao }}</p>
                  <p class="text-xs text-slate-400">
                    Venc. {{ despesa.data_vencimento | date:'dd/MM' }}
                    · {{ despesa.categorias_despesa?.nome ?? 'Sem categoria' }}
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-semibold text-slate-900">
                    {{ despesa.valor | currency:'BRL':'symbol':'1.2-2' }}
                  </p>
                  <span [class]="badgeClass(despesa.status)">{{ statusLabel(despesa.status) }}</span>
                </div>
              </li>
            }
          </ul>
        }
      </section>

    </div>
  `,
})
export class DashboardPage implements OnInit {
  protected readonly condominioSvc = inject(CondominioService);
  protected readonly despesasSvc = inject(DespesasService);
  protected readonly moradoresSvc = inject(MoradoresService);
  private readonly supabase = inject(SupabaseService);

  protected readonly relatorio = signal<RelatorioMensal | null>(null);

  private readonly mesAtual = new Date().toISOString().substring(0, 7);

  protected readonly mesAtualLabel = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  protected readonly qtdCobertura = computed(() =>
    this.moradoresSvc.moradores().filter((m) => m.tipo === 'cobertura').length,
  );

  protected readonly qtdNormal = computed(() =>
    this.moradoresSvc.moradores().filter((m) => m.tipo === 'normal').length,
  );

  protected readonly percentualPago = computed(() => {
    const r = this.relatorio();
    if (!r || r.total_despesas === 0) return 0;
    return Math.round((r.despesas_pagas / r.total_despesas) * 100);
  });

  protected readonly saldoPositivo = computed(
    () => (this.relatorio()?.saldo ?? 0) >= 0,
  );

  protected readonly ultimasDespesas = computed(() =>
    this.despesasSvc.despesas().slice(0, 5),
  );

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.despesasSvc.carregar(this.mesAtual),
      this.moradoresSvc.carregar(),
      this.carregarRelatorio(),
    ]);
  }

  private async carregarRelatorio(): Promise<void> {
    const condId = this.condominioSvc.ativo()?.id;
    if (!condId) return;

    const { data } = await this.supabase.client
      .from('vw_relatorio_mensal')
      .select('*')
      .eq('condominio_id', condId)
      .eq('mes_referencia', this.mesAtual)
      .maybeSingle();

    this.relatorio.set(data as RelatorioMensal | null);
  }

  protected badgeClass(status: string): string {
    return STATUS_BADGE_CLASS[status as StatusKey] ?? STATUS_BADGE_CLASS['pendente'];
  }

  protected statusLabel(status: string): string {
    return STATUS_LABEL[status as StatusKey] ?? status;
  }
}
