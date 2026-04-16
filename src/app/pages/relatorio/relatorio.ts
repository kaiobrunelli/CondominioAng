import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CondominioService } from '../../services/condominio.service';
import { SupabaseService } from '../../services/supabase.service';
import { DespesasService } from '../../services/despesas.service';
import { PagamentosService } from '../../services/pagamentos.service';
import { MesReferenciaService } from '../../services/mes-referencia.service';
import { MonthPickerComponent } from '../../shared/month-picker/month-picker';
import type { LancamentoLedger, RelatorioMensal, SaldoGlobal } from '../../models/types';

type TabAtiva   = 'resumo' | 'lancamentos';
type TipoFiltro = 'todos'  | 'despesa' | 'pagamento';

@Component({
  selector: 'app-relatorio',
  imports: [CurrencyPipe, DatePipe, MonthPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">

    <!-- Header + Tabs -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl font-semibold text-slate-900">Relatório Financeiro</h1>
        <p class="text-slate-500 text-sm mt-0.5">Controle contábil completo do condomínio</p>
      </div>
      <div class="flex gap-1 bg-slate-100 rounded-xl p-1" role="tablist">
        @for (tab of TABS; track tab.value) {
          <button type="button" role="tab"
            [attr.aria-selected]="tabAtiva() === tab.value"
            (click)="tabAtiva.set(tab.value)"
            class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all focus:outline-none"
            [class]="tabAtiva() === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
            <span class="material-symbols-rounded text-[16px]" aria-hidden="true">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        }
      </div>
    </div>

    <!-- ══════════════════════════════════════
         CAIXA GERAL — sempre visível
         Saldo acumulado de TODOS os meses
    ══════════════════════════════════════ -->
    @if (saldoGlobal()) {
      <div class="rounded-2xl border p-5"
        [class]="saldoGlobal()!.saldo_caixa >= 0
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
          : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'">

        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-rounded text-[18px]"
                [class]="saldoGlobal()!.saldo_caixa >= 0 ? 'text-emerald-600' : 'text-red-500'"
                aria-hidden="true">account_balance_wallet</span>
              <p class="text-sm font-semibold uppercase tracking-wider"
                [class]="saldoGlobal()!.saldo_caixa >= 0 ? 'text-emerald-700' : 'text-red-600'">
                Caixa Geral — Saldo Acumulado (todos os meses)
              </p>
            </div>
            <p class="text-4xl font-display font-bold"
              [class]="saldoGlobal()!.saldo_caixa >= 0 ? 'text-emerald-800' : 'text-red-700'">
              {{ saldoGlobal()!.saldo_caixa | currency:'BRL':'symbol':'1.2-2' }}
            </p>
            <p class="text-sm mt-1"
              [class]="saldoGlobal()!.saldo_caixa >= 0 ? 'text-emerald-600' : 'text-red-500'">
              {{ saldoGlobal()!.saldo_caixa >= 0 ? '✓ Há dinheiro disponível em caixa' : '⚠ Caixa negativo — verifique pendências' }}
            </p>
          </div>

          <!-- Mini KPIs do saldo global -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-white/70 rounded-xl px-3 py-2 text-center">
              <p class="text-xs text-slate-400 leading-none mb-1">Recebido</p>
              <p class="text-sm font-bold text-emerald-700">{{ saldoGlobal()!.total_recebido | currency:'BRL':'symbol':'1.2-2' }}</p>
            </div>
            <div class="bg-white/70 rounded-xl px-3 py-2 text-center">
              <p class="text-xs text-slate-400 leading-none mb-1">Despesas pagas</p>
              <p class="text-sm font-bold text-slate-700">{{ saldoGlobal()!.total_pago | currency:'BRL':'symbol':'1.2-2' }}</p>
            </div>
            <div class="bg-white/70 rounded-xl px-3 py-2 text-center">
              <p class="text-xs text-slate-400 leading-none mb-1">Em aberto</p>
              <p class="text-sm font-bold" [class]="saldoGlobal()!.total_em_aberto > 0 ? 'text-amber-600' : 'text-slate-400'">
                {{ saldoGlobal()!.total_em_aberto | currency:'BRL':'symbol':'1.2-2' }}
              </p>
            </div>
            <div class="bg-white/70 rounded-xl px-3 py-2 text-center">
              <p class="text-xs text-slate-400 leading-none mb-1">Atrasado</p>
              <p class="text-sm font-bold" [class]="saldoGlobal()!.total_atrasado > 0 ? 'text-red-600' : 'text-slate-400'">
                {{ saldoGlobal()!.total_atrasado | currency:'BRL':'symbol':'1.2-2' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Alerta de em aberto de meses anteriores -->
        @if (saldoGlobal()!.total_em_aberto > 0) {
          <div class="mt-3 rounded-xl bg-amber-50/80 border border-amber-200 px-3 py-2 flex items-center gap-2">
            <span class="material-symbols-rounded text-[16px] text-amber-500 shrink-0" aria-hidden="true">warning</span>
            <p class="text-xs text-amber-700">
              Existem <strong>{{ saldoGlobal()!.total_em_aberto | currency:'BRL':'symbol':'1.2-2' }}</strong>
              em despesas não pagas acumuladas.
              @if (saldoGlobal()!.total_atrasado > 0) {
                Sendo <strong class="text-red-600">{{ saldoGlobal()!.total_atrasado | currency:'BRL':'symbol':'1.2-2' }} atrasadas</strong>.
              }
            </p>
          </div>
        }
      </div>
    }

    <!-- ── Filtro de Período ──────────────────────────────── -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
      <div class="flex flex-wrap items-end gap-4">
        <!-- Modo -->
        <div class="flex gap-1 bg-slate-100 rounded-xl p-1" role="group">
          <button type="button" (click)="modoPeriodo.set('mes')"
            class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus:outline-none"
            [class]="modoPeriodo() === 'mes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
            Por mês
          </button>
          <button type="button" (click)="modoPeriodo.set('periodo')"
            class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus:outline-none"
            [class]="modoPeriodo() === 'periodo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
            Intervalo
          </button>
        </div>

        @if (modoPeriodo() === 'mes') {
          <app-month-picker label="Mês" [value]="mesInicio()" (valueChange)="onMesUnicoChange($event)" />
        } @else {
          <app-month-picker label="De" [value]="mesInicio()" (valueChange)="onMesInicioChange($event)" />
          <app-month-picker label="Até" [value]="mesFim()" (valueChange)="onMesFimChange($event)" />
        }

        @if (tabAtiva() === 'lancamentos') {
          <div class="flex gap-1 bg-slate-100 rounded-xl p-1" role="group">
            @for (t of TIPOS; track t.value) {
              <button type="button" (click)="tipoFiltro.set(t.value)"
                class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus:outline-none"
                [class]="tipoFiltro() === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                [attr.aria-pressed]="tipoFiltro() === t.value">{{ t.label }}</button>
            }
          </div>
          @if (tipoFiltro() !== 'pagamento') {
            <div class="flex gap-1 bg-slate-100 rounded-xl p-1" role="group">
              @for (s of STATUS_FILTROS; track s.value) {
                <button type="button" (click)="statusFiltro.set(s.value)"
                  class="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus:outline-none"
                  [class]="statusFiltro() === s.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                  {{ s.label }}
                </button>
              }
            </div>
          }
        }

        <button type="button" (click)="carregarDados()" [disabled]="loading()"
          class="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 focus:outline-none">
          <span class="material-symbols-rounded text-[16px]" aria-hidden="true">refresh</span>
          Atualizar
        </button>
      </div>

      <p class="text-xs text-slate-400 mt-2 flex items-center gap-1">
        <span class="material-symbols-rounded text-[14px]" aria-hidden="true">date_range</span>
        Período:
        <strong class="text-slate-600">
          {{ modoPeriodo() === 'mes' ? labelMes(mesInicio()) : labelMes(mesInicio()) + ' → ' + labelMes(mesFim()) }}
        </strong>
      </p>
    </div>

    @if (loading()) {
      <p class="text-center py-12 text-slate-400 text-sm" aria-live="polite">Carregando...</p>
    } @else {

      <!-- ══════════════════════════════════
           TAB: RESUMO
      ══════════════════════════════════ -->
      @if (tabAtiva() === 'resumo') {
        @if (!relatorio()) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-8 text-center">
            <span class="material-symbols-rounded text-5xl text-slate-200 block mb-3" aria-hidden="true">bar_chart</span>
            <p class="text-slate-500 text-sm">Nenhum dado encontrado para este período</p>
          </div>
        } @else {
          <!-- Saldo do período -->
          <div class="rounded-2xl p-6 border"
            [class]="saldoPositivo() ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'"
            role="status">
            <div class="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p class="text-sm font-medium" [class]="saldoPositivo() ? 'text-emerald-600' : 'text-red-600'">Saldo do Período</p>
                <p class="text-4xl font-display font-bold mt-1"
                  [class]="saldoPositivo() ? 'text-emerald-800' : 'text-red-800'">
                  {{ relatorio()!.saldo | currency:'BRL':'symbol':'1.2-2' }}
                </p>
                <p class="text-sm mt-1" [class]="saldoPositivo() ? 'text-emerald-600' : 'text-red-600'">
                  {{ saldoPositivo() ? '✓ Superávit' : '⚠ Déficit' }} — {{ labelMes(mesInicio()) }}
                </p>
              </div>
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                [class]="saldoPositivo() ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'" aria-hidden="true">
                <span class="material-symbols-rounded text-[32px]">{{ saldoPositivo() ? 'trending_up' : 'trending_down' }}</span>
              </div>
            </div>
          </div>

          <!-- KPIs -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Despesas</p>
              <p class="text-xl font-display font-bold text-slate-900">{{ relatorio()!.total_despesas | currency:'BRL':'symbol':'1.2-2' }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ relatorio()!.qtd_despesas }} lançamentos</p>
            </article>

            <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Recebido</p>
              <p class="text-xl font-display font-bold text-emerald-600">{{ relatorio()!.total_receitas | currency:'BRL':'symbol':'1.2-2' }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ relatorio()!.qtd_pagamentos || 0 }} pagamentos</p>
            </article>

            <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Despesas Pagas</p>
              <p class="text-xl font-display font-bold text-emerald-600">{{ relatorio()!.despesas_pagas | currency:'BRL':'symbol':'1.2-2' }}</p>
              <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden"
                role="progressbar" [attr.aria-valuenow]="percentualPago()" aria-valuemin="0" aria-valuemax="100">
                <div class="h-full bg-emerald-500 rounded-full transition-all duration-700" [style.width]="percentualPago() + '%'"></div>
              </div>
              <p class="text-xs text-slate-400 mt-1">{{ percentualPago() }}% do total</p>
            </article>

            <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
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
            <div class="h-4 bg-slate-100 rounded-full overflow-hidden flex"
              role="img" [attr.aria-label]="composicaoAriaLabel()">
              @if (relatorio()!.despesas_pagas > 0) {
                <div class="h-full bg-emerald-500 transition-all duration-700"
                  [style.width]="percentualPago() + '%'"></div>
              }
              @if (relatorio()!.despesas_atrasadas > 0) {
                <div class="h-full bg-red-500 transition-all duration-700"
                  [style.width]="percentualAtrasado() + '%'"></div>
              }
              @if (relatorio()!.despesas_pendentes > 0) {
                <div class="h-full bg-amber-400 transition-all duration-700"
                  [style.width]="percentualPendente() + '%'"></div>
              }
            </div>
            <div class="flex flex-wrap gap-4 mt-3">
              <div class="flex items-center gap-2 text-xs text-slate-600">
                <span class="w-3 h-3 rounded-sm bg-emerald-500" aria-hidden="true"></span>
                Pagas ({{ percentualPago() }}%)
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-600">
                <span class="w-3 h-3 rounded-sm bg-amber-400" aria-hidden="true"></span>
                Pendentes ({{ percentualPendente() }}%)
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-600">
                <span class="w-3 h-3 rounded-sm bg-red-500" aria-hidden="true"></span>
                Atrasadas ({{ percentualAtrasado() }}%)
              </div>
            </div>
          </div>
        }
      }

      <!-- ══════════════════════════════════
           TAB: LANÇAMENTOS (Ledger)
      ══════════════════════════════════ -->
      @if (tabAtiva() === 'lancamentos') {

        <!-- Totalizadores -->
        <div class="grid grid-cols-3 gap-4">
          <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Débitos</p>
            <p class="text-xl font-display font-bold text-red-500">
              {{ totalDebitos() | currency:'BRL':'symbol':'1.2-2' }}
            </p>
            <p class="text-xs text-slate-400 mt-1">{{ qtdDespesas() }} despesas</p>
          </article>
          <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Créditos</p>
            <p class="text-xl font-display font-bold text-emerald-600">
              {{ totalCreditos() | currency:'BRL':'symbol':'1.2-2' }}
            </p>
            <p class="text-xs text-slate-400 mt-1">{{ qtdPagamentos() }} pagamentos</p>
          </article>
          <article class="rounded-2xl border p-4 text-center"
            [class]="saldoLedger() >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'">
            <p class="text-xs font-semibold uppercase tracking-wider mb-1"
              [class]="saldoLedger() >= 0 ? 'text-emerald-500' : 'text-red-500'">Saldo do Período</p>
            <p class="text-xl font-display font-bold"
              [class]="saldoLedger() >= 0 ? 'text-emerald-700' : 'text-red-700'">
              {{ saldoLedger() | currency:'BRL':'symbol':'1.2-2' }}
            </p>
            <p class="text-xs mt-1" [class]="saldoLedger() >= 0 ? 'text-emerald-500' : 'text-red-500'">
              {{ saldoLedger() >= 0 ? 'Superávit' : 'Déficit' }}
            </p>
          </article>
        </div>

        <!-- Tabela ledger -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full" aria-label="Lançamentos financeiros">
              <thead>
                <tr class="border-b border-slate-100">
                  <th scope="col" class="text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Data</th>
                  <th scope="col" class="text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Tipo</th>
                  <th scope="col" class="text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Descrição</th>
                  <th scope="col" class="text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Categoria / Forma</th>
                  <th scope="col" class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                  <th scope="col" class="text-right  text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Valor</th>
                  <th scope="col" class="text-right  text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Saldo Acum.</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @if (lancamentosFiltrados().length === 0) {
                  <tr>
                    <td colspan="7" class="text-center py-12">
                      <span class="material-symbols-rounded text-4xl text-slate-200 block mb-2" aria-hidden="true">receipt_long</span>
                      <p class="text-slate-400 text-sm">Nenhum lançamento no período</p>
                    </td>
                  </tr>
                } @else {
                  @for (l of lancamentosFiltrados(); track l.id) {
                    <!-- Linha: verde se pago/pagamento, vermelho se atrasado, normal se pendente -->
                    <tr class="hover:bg-slate-50/50 transition-colors"
                      [class]="rowClass(l)">

                      <td class="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{{ l.data | date:'dd/MM/yyyy' }}</td>

                      <!-- Tipo badge — despesa paga fica verde -->
                      <td class="px-4 py-3">
                        @if (l.tipo === 'pagamento') {
                          <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            <span class="material-symbols-rounded text-[11px]" aria-hidden="true">arrow_upward</span>
                            Pagamento
                          </span>
                        } @else if (l.status === 'pago') {
                          <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                            <span class="material-symbols-rounded text-[11px]" aria-hidden="true">check_circle</span>
                            Despesa Paga
                          </span>
                        } @else if (l.status === 'atrasado') {
                          <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            <span class="material-symbols-rounded text-[11px]" aria-hidden="true">error</span>
                            Atrasada
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            <span class="material-symbols-rounded text-[11px]" aria-hidden="true">pending</span>
                            Pendente
                          </span>
                        }
                      </td>

                      <td class="px-4 py-3">
                        <p class="text-sm font-medium text-slate-800">{{ l.descricao }}</p>
                        @if (l.mes_referencia) {
                          <p class="text-xs text-slate-400">{{ labelMes(l.mes_referencia) }}</p>
                        }
                      </td>

                      <td class="px-4 py-3">
                        @if (l.tipo === 'despesa' && l.categoria) {
                          <div class="flex items-center gap-1.5">
                            @if (l.categoriaIcone) {
                              <span class="material-symbols-rounded text-[14px]"
                                [style.color]="l.categoriaCor ?? '#6B7280'" aria-hidden="true">{{ l.categoriaIcone }}</span>
                            }
                            <span class="text-sm text-slate-600">{{ l.categoria }}</span>
                          </div>
                        } @else if (l.tipo === 'pagamento' && l.forma_pagamento) {
                          <span class="text-sm text-slate-600">{{ formaLabel(l.forma_pagamento) }}</span>
                        } @else {
                          <span class="text-slate-300">—</span>
                        }
                      </td>

                      <!-- Status badge simplificado -->
                      <td class="px-4 py-3 text-center">
                        @if (l.tipo === 'pagamento') {
                          <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Recebido</span>
                        } @else if (l.status) {
                          <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                            [class]="statusBadgeClass(l.status)">{{ statusLabel(l.status) }}</span>
                        }
                      </td>

                      <!-- Valor: verde se pago/pagamento, vermelho se atrasado/pendente -->
                      <td class="px-4 py-3 text-right font-semibold tabular-nums"
                        [class]="valorClass(l)">
                        {{ l.tipo === 'pagamento' ? '+' : '-' }}{{ l.valor | currency:'BRL':'symbol':'1.2-2' }}
                      </td>

                      <!-- Saldo acumulado -->
                      <td class="px-4 py-3 text-right text-sm tabular-nums font-medium"
                        [class]="(l.saldoAcumulado ?? 0) >= 0 ? 'text-slate-700' : 'text-red-600'">
                        {{ l.saldoAcumulado | currency:'BRL':'symbol':'1.2-2' }}
                      </td>
                    </tr>
                  }
                }
              </tbody>
              @if (lancamentosFiltrados().length > 0) {
                <tfoot>
                  <tr class="bg-slate-50 border-t border-slate-200">
                    <th scope="row" colspan="5" class="px-5 py-3 text-sm font-semibold text-slate-600 text-left">Saldo final do período</th>
                    <td class="px-4 py-3 text-right text-sm font-bold"
                      [class]="saldoLedger() >= 0 ? 'text-emerald-600' : 'text-red-600'">
                      {{ saldoLedger() | currency:'BRL':'symbol':'1.2-2' }}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              }
            </table>
          </div>
        </div>
      }
    }
  </div>
  `,
})
export class RelatorioPage implements OnInit {
  private readonly condSvc       = inject(CondominioService);
  private readonly supabase      = inject(SupabaseService);
  private readonly despesasSvc   = inject(DespesasService);
  private readonly pagamentosSvc = inject(PagamentosService);
  private readonly mesRefSvc     = inject(MesReferenciaService);
  private readonly cdr           = inject(ChangeDetectorRef);

  protected readonly relatorio   = signal<RelatorioMensal | null>(null);
  protected readonly saldoGlobal = signal<SaldoGlobal | null>(null);
  protected readonly loading     = signal(false);

  protected readonly tabAtiva     = signal<TabAtiva>('resumo');
  protected readonly modoPeriodo  = signal<'mes' | 'periodo'>('mes');
  protected readonly mesInicio    = signal(this.mesRefSvc.mes());
  protected readonly mesFim       = signal(this.mesRefSvc.mes());
  protected readonly tipoFiltro   = signal<TipoFiltro>('todos');
  protected readonly statusFiltro = signal<string>('todos');

  private readonly _lancamentos = signal<LancamentoLedger[]>([]);

  protected readonly TABS = [
    { value: 'resumo'      as TabAtiva, label: 'Resumo',      icon: 'bar_chart'    },
    { value: 'lancamentos' as TabAtiva, label: 'Lançamentos', icon: 'receipt_long' },
  ];

  protected readonly TIPOS: { value: TipoFiltro; label: string }[] = [
    { value: 'todos',     label: 'Todos'      },
    { value: 'despesa',   label: 'Despesas'   },
    { value: 'pagamento', label: 'Pagamentos' },
  ];

  protected readonly STATUS_FILTROS = [
    { value: 'todos',    label: 'Todos'     },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'pago',     label: 'Pagas'     },
    { value: 'atrasado', label: 'Atrasadas' },
  ];

  // ── Computed Resumo ──────────────────────────────────────
  protected readonly saldoPositivo = computed(() => (this.relatorio()?.saldo ?? 0) >= 0);

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

  // ── Computed Ledger ──────────────────────────────────────
  protected readonly lancamentosFiltrados = computed(() => {
    let lista = this._lancamentos();

    const tipo   = this.tipoFiltro();
    const status = this.statusFiltro();

    if (tipo !== 'todos')   lista = lista.filter((l) => l.tipo === tipo);
    if (status !== 'todos') lista = lista.filter((l) => l.tipo !== 'despesa' || l.status === status);

    let saldoAcum = 0;
    return lista.map((l) => {
      saldoAcum += l.tipo === 'pagamento' ? l.valor : -l.valor;
      return { ...l, saldoAcumulado: saldoAcum };
    });
  });

  protected readonly totalDebitos  = computed(() =>
    this._lancamentos().filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0));
  protected readonly totalCreditos = computed(() =>
    this._lancamentos().filter((l) => l.tipo === 'pagamento').reduce((s, l) => s + l.valor, 0));
  protected readonly saldoLedger   = computed(() => this.totalCreditos() - this.totalDebitos());
  protected readonly qtdDespesas   = computed(() => this._lancamentos().filter((l) => l.tipo === 'despesa').length);
  protected readonly qtdPagamentos = computed(() => this._lancamentos().filter((l) => l.tipo === 'pagamento').length);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.carregarSaldoGlobal(),
      this.carregarDados(),
    ]);
  }

  // ── Eventos de filtro ────────────────────────────────────
  protected async onMesUnicoChange(mes: string): Promise<void> {
    this.mesInicio.set(mes);
    this.mesFim.set(mes);
    this.mesRefSvc.setMes(mes);
    await this.carregarDados();
  }

  protected async onMesInicioChange(mes: string): Promise<void> {
    this.mesInicio.set(mes);
    if (mes > this.mesFim()) this.mesFim.set(mes);
    await this.carregarDados();
  }

  protected async onMesFimChange(mes: string): Promise<void> {
    this.mesFim.set(mes);
    if (mes < this.mesInicio()) this.mesInicio.set(mes);
    await this.carregarDados();
  }

  // ── Caixa Geral (todos os meses) ─────────────────────────
  private async carregarSaldoGlobal(): Promise<void> {
    const condId = this.condSvc.ativo()?.id;
    if (!condId) return;

    try {
      const { data } = await this.supabase.client
        .from('vw_saldo_global')
        .select('*')
        .eq('condominio_id', condId)
        .maybeSingle();

      this.saldoGlobal.set(data as SaldoGlobal | null);
    } catch {
      // view pode não existir ainda — carrega sem saldo global
    }
  }

  // ── Carregamento do período ──────────────────────────────
  protected async carregarDados(): Promise<void> {
    const condId = this.condSvc.ativo()?.id;
    if (!condId) return;

    this.loading.set(true);
    try {
      const inicio = this.mesInicio();
      const fim    = this.mesFim();

      if (this.modoPeriodo() === 'mes') {
        const { data } = await this.supabase.client
          .from('vw_relatorio_mensal')
          .select('*')
          .eq('condominio_id', condId)
          .eq('mes_referencia', inicio)
          .maybeSingle();
        this.relatorio.set(data as RelatorioMensal | null);
      } else {
        const { data: dadosPeriodo } = await this.supabase.client
          .from('vw_relatorio_mensal')
          .select('*')
          .eq('condominio_id', condId)
          .gte('mes_referencia', inicio)
          .lte('mes_referencia', fim);

        if (dadosPeriodo && dadosPeriodo.length > 0) {
          const zero: RelatorioMensal = {
            condominio_id: condId, mes_referencia: '',
            total_despesas: 0, total_receitas: 0, saldo: 0,
            qtd_despesas: 0, qtd_pagamentos: 0,
            despesas_pagas: 0, despesas_pendentes: 0, despesas_atrasadas: 0,
          };
          const agregado = (dadosPeriodo as RelatorioMensal[]).reduce(
            (acc, r) => ({
              ...acc,
              total_despesas:     acc.total_despesas     + r.total_despesas,
              total_receitas:     acc.total_receitas     + r.total_receitas,
              saldo:              acc.saldo              + r.saldo,
              qtd_despesas:       acc.qtd_despesas       + r.qtd_despesas,
              qtd_pagamentos:     (acc.qtd_pagamentos || 0) + (r.qtd_pagamentos || 0),
              despesas_pagas:     acc.despesas_pagas     + r.despesas_pagas,
              despesas_pendentes: acc.despesas_pendentes + r.despesas_pendentes,
              despesas_atrasadas: acc.despesas_atrasadas + r.despesas_atrasadas,
            }),
            zero,
          );
          this.relatorio.set(agregado);
        } else {
          this.relatorio.set(null);
        }
      }

      await this.carregarLancamentos(condId, inicio, fim);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  private async carregarLancamentos(condId: string, inicio: string, fim: string): Promise<void> {
    const [despesas, pagamentos] = await Promise.all([
      this.despesasSvc.carregarPorPeriodo(inicio, fim),
      this.pagamentosSvc.carregarPorPeriodo(inicio, fim),
    ]);

    const lancamentos: LancamentoLedger[] = [];

    for (const d of despesas) {
      lancamentos.push({
        id:             d.id,
        tipo:           'despesa',
        data:           d.data_vencimento,
        descricao:      d.descricao,
        categoria:      d.categorias_despesa?.nome,
        categoriaIcone: d.categorias_despesa?.icone,
        categoriaCor:   d.categorias_despesa?.cor,
        valor:          d.valor,
        status:         d.status,
        mes_referencia: d.mes_referencia,
      });
    }

    for (const p of pagamentos) {
      lancamentos.push({
        id:              p.id,
        tipo:            'pagamento',
        data:            p.data_pagamento,
        descricao:       p.descricao ?? (p.despesas?.descricao ? `Pgto: ${p.despesas.descricao}` : 'Pagamento'),
        valor:           p.valor,
        forma_pagamento: p.forma_pagamento,
        mes_referencia:  p.mes_referencia,
      });
    }

    lancamentos.sort((a, b) => a.data.localeCompare(b.data));

    let saldoAcum = 0;
    for (const l of lancamentos) {
      saldoAcum += l.tipo === 'pagamento' ? l.valor : -l.valor;
      l.saldoAcumulado = saldoAcum;
    }

    this._lancamentos.set(lancamentos);
  }

  // ── Helpers de cor para o ledger ─────────────────────────

  /** Classe da linha: verde se pago/pagamento, vermelho se atrasado */
  protected rowClass(l: LancamentoLedger): string {
    if (l.tipo === 'pagamento')    return 'bg-emerald-50/40';
    if (l.status === 'pago')       return 'bg-teal-50/40';
    if (l.status === 'atrasado')   return 'bg-red-50/30';
    return '';
  }

  /** Cor do valor: verde se pago/pagamento, vermelho se atrasado, âmbar se pendente */
  protected valorClass(l: LancamentoLedger): string {
    if (l.tipo === 'pagamento')    return 'text-emerald-600';
    if (l.status === 'pago')       return 'text-teal-600';
    if (l.status === 'atrasado')   return 'text-red-600';
    return 'text-amber-600'; // pendente
  }

  // ── Helpers gerais ───────────────────────────────────────
  protected labelMes(mes: string): string {
    if (!mes || mes.includes('→')) return mes;
    const [y, m] = mes.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${meses[parseInt(m, 10) - 1]}/${y}`;
  }

  protected formaLabel(forma: string): string {
    const map: Record<string, string> = {
      pix: 'Pix', dinheiro: 'Dinheiro', transferencia: 'Transferência',
      boleto: 'Boleto', cartao: 'Cartão', cheque: 'Cheque',
    };
    return map[forma] ?? forma;
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' };
    return map[status] ?? status;
  }

  protected statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pago:     'bg-teal-100 text-teal-700',
      pendente: 'bg-amber-100 text-amber-700',
      atrasado: 'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-slate-100 text-slate-500';
  }

  protected composicaoAriaLabel(): string {
    const r = this.relatorio();
    if (!r) return '';
    return `Pagas: ${this.percentualPago()}%, Pendentes: ${this.percentualPendente()}%, Atrasadas: ${this.percentualAtrasado()}%`;
  }
}
