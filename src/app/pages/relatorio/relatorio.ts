import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CondominioService } from '../../services/condominio.service';
import { SupabaseService } from '../../services/supabase.service';
import type { RelatorioMensal } from '../../models/types';

interface MesDisponivel {
  valor: string;
  label: string;
}

@Component({
  selector: 'app-relatorio',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">

    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-semibold text-slate-900">Relatório Mensal</h1>
        <p class="text-slate-500 text-sm mt-0.5">Visão financeira completa do condomínio</p>
      </div>
      <div>
        <label for="rel-mes" class="sr-only">Selecionar mês</label>
        <select
          id="rel-mes"
          [value]="mesSelecionado()"
          (change)="onMesChange($event)"
          class="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          @for (m of mesesDisponiveis; track m.valor) {
            <option [value]="m.valor">{{ m.label }}</option>
          }
        </select>
      </div>
    </div>

    @if (loading()) {
      <p class="text-center py-12 text-slate-400 text-sm" aria-live="polite">Carregando relatório...</p>
    } @else if (!relatorio()) {
      <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-8 text-center">
        <span class="material-symbols-rounded text-5xl text-slate-200 block mb-3" aria-hidden="true">bar_chart</span>
        <p class="text-slate-500 text-sm">Nenhum dado encontrado para este período</p>
      </div>
    } @else {
      <!-- Saldo principal -->
      <div
        class="rounded-2xl p-6 border"
        [class]="saldoPositivo()
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'"
        role="status"
        [attr.aria-label]="'Saldo do mês: ' + formatCurrency(relatorio()!.saldo)"
      >
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p class="text-sm font-medium"
              [class]="saldoPositivo() ? 'text-emerald-600' : 'text-red-600'">
              Saldo do Mês
            </p>
            <p class="text-4xl font-display font-bold mt-1"
              [class]="saldoPositivo() ? 'text-emerald-800' : 'text-red-800'">
              {{ relatorio()!.saldo | currency:'BRL':'symbol':'1.2-2' }}
            </p>
            <p class="text-sm mt-1"
              [class]="saldoPositivo() ? 'text-emerald-600' : 'text-red-600'">
              {{ saldoPositivo() ? '✓ Superávit' : '⚠ Déficit' }} — {{ formatMesLong(mesSelecionado()) }}
            </p>
          </div>
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            [class]="saldoPositivo() ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'"
            aria-hidden="true"
          >
            <span class="material-symbols-rounded text-[32px]">
              {{ saldoPositivo() ? 'trending_up' : 'trending_down' }}
            </span>
          </div>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Indicadores financeiros">
        <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4" role="listitem">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Despesas</p>
          <p class="text-xl font-display font-bold text-slate-900">
            {{ relatorio()!.total_despesas | currency:'BRL':'symbol':'1.2-2' }}
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ relatorio()!.qtd_despesas }} lançamentos</p>
        </article>

        <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4" role="listitem">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Receitas</p>
          <p class="text-xl font-display font-bold text-slate-900">
            {{ relatorio()!.total_receitas | currency:'BRL':'symbol':'1.2-2' }}
          </p>
        </article>

        <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4" role="listitem">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pagas</p>
          <p class="text-xl font-display font-bold text-emerald-600">
            {{ relatorio()!.despesas_pagas | currency:'BRL':'symbol':'1.2-2' }}
          </p>
          <div
            class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            [attr.aria-valuenow]="percentualPago()"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-label]="percentualPago() + '% pago'"
          >
            <div
              class="h-full bg-emerald-500 rounded-full transition-all duration-700"
              [style.width]="percentualPago() + '%'"
            ></div>
          </div>
        </article>

        <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4" role="listitem">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Em Aberto</p>
          <p class="text-xl font-display font-bold"
            [class]="relatorio()!.despesas_pendentes > 0 ? 'text-amber-600' : 'text-slate-400'">
            {{ relatorio()!.despesas_pendentes | currency:'BRL':'symbol':'1.2-2' }}
          </p>
          @if (relatorio()!.despesas_atrasadas > 0) {
            <p class="text-xs text-red-500 mt-1 font-medium">
              {{ relatorio()!.despesas_atrasadas | currency:'BRL':'symbol':'1.2-2' }} atrasado
            </p>
          }
        </article>
      </div>

      <!-- Barra de composição -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
        <h2 class="font-semibold text-slate-800 mb-4">Composição das Despesas</h2>
        <div
          class="h-4 bg-slate-100 rounded-full overflow-hidden flex"
          role="img"
          [attr.aria-label]="composicaoAriaLabel()"
        >
          @if (relatorio()!.despesas_pagas > 0) {
            <div
              class="h-full bg-emerald-500 transition-all duration-700"
              [style.width]="percentualPago() + '%'"
              [attr.title]="'Pagas: ' + formatCurrency(relatorio()!.despesas_pagas)"
            ></div>
          }
          @if (relatorio()!.despesas_atrasadas > 0) {
            <div
              class="h-full bg-red-500 transition-all duration-700"
              [style.width]="percentualAtrasado() + '%'"
              [attr.title]="'Atrasadas: ' + formatCurrency(relatorio()!.despesas_atrasadas)"
            ></div>
          }
          @if (relatorio()!.despesas_pendentes > 0) {
            <div
              class="h-full bg-amber-400 transition-all duration-700"
              [style.width]="percentualPendente() + '%'"
              [attr.title]="'Pendentes: ' + formatCurrency(relatorio()!.despesas_pendentes)"
            ></div>
          }
        </div>
        <div class="flex flex-wrap gap-4 mt-3">
          <div class="flex items-center gap-2 text-xs text-slate-600">
            <span class="w-3 h-3 rounded-sm bg-emerald-500 shrink-0" aria-hidden="true"></span>
            Pagas ({{ percentualPago() }}%)
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-600">
            <span class="w-3 h-3 rounded-sm bg-amber-400 shrink-0" aria-hidden="true"></span>
            Pendentes ({{ percentualPendente() }}%)
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-600">
            <span class="w-3 h-3 rounded-sm bg-red-500 shrink-0" aria-hidden="true"></span>
            Atrasadas ({{ percentualAtrasado() }}%)
          </div>
        </div>
      </div>
    }
  </div>
  `,
  styles: [],
})
export class RelatorioPage implements OnInit {
  private readonly condominioSvc = inject(CondominioService);
  private readonly supabase = inject(SupabaseService);

  protected readonly relatorio = signal<RelatorioMensal | null>(null);
  protected readonly mesSelecionado = signal(new Date().toISOString().substring(0, 7));
  protected readonly loading = signal(false);

  protected readonly saldoPositivo = computed(
    () => (this.relatorio()?.saldo ?? 0) >= 0,
  );

  protected readonly percentualPago = computed(() => {
    const r = this.relatorio();
    if (!r || r.total_despesas === 0) return 0;
    return Math.round((r.despesas_pagas / r.total_despesas) * 100);
  });

  protected readonly percentualPendente = computed(() => {
    const r = this.relatorio();
    if (!r || r.total_despesas === 0) return 0;
    return Math.round((r.despesas_pendentes / r.total_despesas) * 100);
  });

  protected readonly percentualAtrasado = computed(() => {
    const r = this.relatorio();
    if (!r || r.total_despesas === 0) return 0;
    return Math.round((r.despesas_atrasadas / r.total_despesas) * 100);
  });

  /** Últimos 12 meses para o seletor */
  protected readonly mesesDisponiveis: MesDisponivel[] = Array.from(
    { length: 12 },
    (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const valor = d.toISOString().substring(0, 7);
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return { valor, label };
    },
  );

  async ngOnInit(): Promise<void> {
    await this.carregarRelatorio();
  }

  protected async onMesChange(event: Event): Promise<void> {
    const mes = (event.target as HTMLSelectElement).value;
    this.mesSelecionado.set(mes);
    await this.carregarRelatorio();
  }

  private async carregarRelatorio(): Promise<void> {
    const condId = this.condominioSvc.ativo()?.id;
    if (!condId) return;

    this.loading.set(true);
    try {
      const { data } = await this.supabase.client
        .from('vw_relatorio_mensal')
        .select('*')
        .eq('condominio_id', condId)
        .eq('mes_referencia', this.mesSelecionado())
        .maybeSingle();

      this.relatorio.set(data as RelatorioMensal | null);
    } finally {
      this.loading.set(false);
    }
  }

  protected formatMesLong(mes: string): string {
    const [y, m] = mes.split('-');
    const meses = [
      'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
    ];
    return `${meses[parseInt(m, 10) - 1]} de ${y}`;
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected composicaoAriaLabel(): string {
    const r = this.relatorio();
    if (!r) return '';
    return `Pagas: ${this.percentualPago()}%, Pendentes: ${this.percentualPendente()}%, Atrasadas: ${this.percentualAtrasado()}%`;
  }
}
