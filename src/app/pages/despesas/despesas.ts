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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DespesasService } from '../../services/despesas.service';
import { PagamentosService } from '../../services/pagamentos.service';
import { MesReferenciaService } from '../../services/mes-referencia.service';
import { CondominioService } from '../../services/condominio.service';
import { MoradoresService } from '../../services/moradores.service';
import { MonthPickerComponent } from '../../shared/month-picker/month-picker';
import type { Despesa, FormaPagamento } from '../../models/types';

type StatusKey = 'pago' | 'pendente' | 'atrasado';

const STATUS_CLASS: Record<StatusKey, string> = {
  pago:     'text-xs font-medium rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500',
  pendente: 'text-xs font-medium rounded-full px-2 py-0.5 bg-amber-100  text-amber-700  border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500',
  atrasado: 'text-xs font-medium rounded-full px-2 py-0.5 bg-red-100    text-red-700    border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500',
};

const FORMAS: { value: FormaPagamento; label: string; icon: string }[] = [
  { value: 'pix',          label: 'Pix',           icon: 'qr_code_2' },
  { value: 'dinheiro',     label: 'Dinheiro',       icon: 'payments' },
  { value: 'transferencia',label: 'Transferência',  icon: 'swap_horiz' },
  { value: 'boleto',       label: 'Boleto',         icon: 'receipt' },
  { value: 'cartao',       label: 'Cartão',         icon: 'credit_card' },
  { value: 'cheque',       label: 'Cheque',         icon: 'article' },
];

/** Descrição fixa usada para identificar a taxa de condomínio nos lançamentos */
const TAXA_DESCRICAO = 'Taxa de Condomínio';

@Component({
  selector: 'app-despesas',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, MonthPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; appearance: textfield; }
  `],
  template: `
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-slate-900">Despesas</h1>
        <p class="text-slate-500 text-sm mt-0.5">Gerencie contas, gastos e pagamentos do condomínio</p>
      </div>
      <button
        type="button"
        (click)="abrirModal()"
        class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span class="material-symbols-rounded text-[18px]" aria-hidden="true">add</span>
        Nova Despesa
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════
         PAINEL — Taxa de Condomínio
    ═══════════════════════════════════════════════════════ -->
    <div class="bg-white rounded-2xl shadow-card overflow-hidden"
      [class]="taxaJaLancada() ? 'border border-emerald-200' : editandoTaxa() ? 'border-2 border-primary-400' : 'border border-slate-200'">

      <div class="flex flex-wrap items-center gap-4 px-5 py-4"
        [class]="taxaJaLancada() ? 'bg-emerald-50' : editandoTaxa() ? 'bg-primary-50' : 'bg-slate-50'">

        <!-- Ícone + info -->
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            [class]="taxaJaLancada() ? 'bg-emerald-100' : editandoTaxa() ? 'bg-primary-100' : 'bg-slate-100'">
            <span class="material-symbols-rounded text-[20px]"
              [class]="taxaJaLancada() ? 'text-emerald-600' : editandoTaxa() ? 'text-primary-600' : 'text-slate-500'"
              aria-hidden="true">home</span>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold"
              [class]="taxaJaLancada() ? 'text-emerald-800' : editandoTaxa() ? 'text-primary-800' : 'text-slate-700'">
              Taxa de Condomínio
            </p>
            @if (taxaJaLancada()) {
              <p class="text-xs text-emerald-600 flex items-center gap-1">
                <span class="material-symbols-rounded text-[14px]" aria-hidden="true">check_circle</span>
                Lançada para {{ formatMesLong(mesFiltro()) }}
              </p>
            } @else if (editandoTaxa()) {
              <p class="text-xs text-primary-600">Editando valor da taxa unitária por morador</p>
            } @else {
              <p class="text-xs text-slate-400">
                Não lançada para {{ formatMesLong(mesFiltro()) }}
              </p>
            }
          </div>
        </div>

        <!-- Valor + edição inline -->
        <div class="flex items-center gap-3 flex-wrap justify-end">
          @if (editandoTaxa()) {
            <!-- Modo edição — visual primário/azul -->
            <div class="flex items-center gap-2">
              <div class="relative">
                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  [value]="novoValorTaxa()"
                  (input)="onTaxaInput($event)"
                  class="w-32 pl-8 pr-2 py-1.5 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white shadow-sm"
                  placeholder="0,00"
                  autofocus
                />
              </div>
              <!-- Preview multiplicado -->
              @if (novoValorTaxa() > 0 && qtdMoradores() > 0) {
                <div class="text-center px-3 py-1 bg-white rounded-lg border border-primary-200 shadow-sm">
                  <p class="text-[10px] text-primary-500 leading-none">{{ qtdMoradores() }} mor.</p>
                  <p class="text-sm font-bold text-primary-700">
                    {{ (novoValorTaxa() * qtdMoradores()) | currency:'BRL':'symbol':'1.2-2' }}
                  </p>
                </div>
              }
              <button
                type="button"
                (click)="salvarValorTaxa()"
                [disabled]="salvandoTaxa()"
                class="text-xs font-medium px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {{ salvandoTaxa() ? '...' : 'Salvar' }}
              </button>
              <button
                type="button"
                (click)="editandoTaxa.set(false)"
                class="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-white transition-colors focus:outline-none"
              >
                Cancelar
              </button>
            </div>
          } @else {
            <!-- Modo exibição -->
            <div class="text-right">
              <p class="text-xl font-display font-bold"
                [class]="taxaJaLancada() ? 'text-emerald-700' : 'text-slate-800'">
                {{ (condominioSvc.ativo()?.valor_condominio ?? 0) | currency:'BRL':'symbol':'1.2-2' }}
              </p>
              <p class="text-[11px] text-slate-400">
                por morador · {{ qtdMoradores() }} moradores
              </p>
            </div>

            <!-- Separador + total -->
            @if (qtdMoradores() > 0 && (condominioSvc.ativo()?.valor_condominio ?? 0) > 0) {
              <div class="text-right px-3 py-1 rounded-xl"
                [class]="taxaJaLancada() ? 'bg-emerald-100/60' : 'bg-slate-100'">
                <p class="text-xl font-display font-bold"
                  [class]="taxaJaLancada() ? 'text-emerald-700' : 'text-slate-800'">
                  {{ valorTotalTaxa() | currency:'BRL':'symbol':'1.2-2' }}
                </p>
                <p class="text-[11px] text-slate-400">total do mês</p>
              </div>
            }

            <button
              type="button"
              (click)="iniciarEdicaoTaxa()"
              class="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors focus:outline-none"
              title="Alterar valor unitário da taxa"
              aria-label="Alterar valor unitário da taxa mensal"
            >
              <span class="material-symbols-rounded text-[16px]" aria-hidden="true">edit</span>
            </button>
          }

          <!-- Botão lançar -->
          @if (!taxaJaLancada() && !editandoTaxa()) {
            <button
              type="button"
              (click)="lancarTaxaMes()"
              [disabled]="lancandoTaxa() || valorTotalTaxa() <= 0"
              class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span class="material-symbols-rounded text-[18px]" aria-hidden="true">
                {{ lancandoTaxa() ? 'hourglass_empty' : 'add_task' }}
              </span>
              {{ lancandoTaxa() ? 'Lançando...' : 'Lançar para este mês' }}
            </button>
          } @else if (taxaJaLancada()) {
            <button
              type="button"
              (click)="verTaxaNaLista()"
              class="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-medium rounded-xl border border-emerald-200 transition-colors focus:outline-none"
            >
              <span class="material-symbols-rounded text-[16px]" aria-hidden="true">visibility</span>
              Ver na lista
            </button>
          }
        </div>
      </div>

      @if ((condominioSvc.ativo()?.valor_condominio ?? 0) <= 0 && !editandoTaxa()) {
        <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          <span class="material-symbols-rounded text-[14px]" aria-hidden="true">info</span>
          Defina o valor unitário da taxa clicando no ícone de edição acima.
        </div>
      }
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3 items-end">
      <!-- Month Picker -->
      <app-month-picker
        [value]="mesFiltro()"
        (valueChange)="onMesChange($event)"
      />

      <!-- Status -->
      <div class="flex gap-1 bg-white border border-slate-200 rounded-xl p-1" role="group" aria-label="Filtrar por status">
        @for (s of statusFiltros; track s.value) {
          <button
            type="button"
            (click)="filtroStatus.set(s.value)"
            [class]="filtroStatus() === s.value
              ? 'text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 text-white transition-colors'
              : 'text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors'"
            [attr.aria-pressed]="filtroStatus() === s.value"
          >{{ s.label }}</button>
        }
      </div>

      <!-- Totais rápidos -->
      <div class="ml-auto flex items-center gap-3 flex-wrap">
        <div class="text-right">
          <p class="text-xs text-slate-400 uppercase tracking-wide leading-none mb-0.5">Total despesas</p>
          <p class="text-sm font-bold text-slate-900">{{ totalDespesas() | currency:'BRL':'symbol':'1.2-2' }}</p>
        </div>
        <div class="w-px h-8 bg-slate-200"></div>
        <div class="text-right">
          <p class="text-xs text-slate-400 uppercase tracking-wide leading-none mb-0.5">Pago</p>
          <p class="text-sm font-bold text-emerald-600">{{ totalPago() | currency:'BRL':'symbol':'1.2-2' }}</p>
        </div>
        <div class="w-px h-8 bg-slate-200"></div>
        <div class="text-right">
          <p class="text-xs text-slate-400 uppercase tracking-wide leading-none mb-0.5">A pagar</p>
          <p class="text-sm font-bold text-amber-600">{{ totalAPagar() | currency:'BRL':'symbol':'1.2-2' }}</p>
        </div>
        <div class="w-px h-8 bg-slate-200"></div>
        <div class="text-right px-3 py-1 rounded-xl" [class]="saldoMes() >= 0 ? 'bg-emerald-50' : 'bg-red-50'">
          <p class="text-xs uppercase tracking-wide leading-none mb-0.5" [class]="saldoMes() >= 0 ? 'text-emerald-500' : 'text-red-400'">Saldo</p>
          <p class="text-sm font-bold" [class]="saldoMes() >= 0 ? 'text-emerald-700' : 'text-red-600'">{{ saldoMes() | currency:'BRL':'symbol':'1.2-2' }}</p>
        </div>
      </div>
    </div>

    <!-- Tabela -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden" id="lista-despesas">
      <div class="overflow-x-auto">
        <table class="w-full" aria-label="Lista de despesas">
          <thead>
            <tr class="border-b border-slate-100">
              <th scope="col" class="text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Descrição</th>
              <th scope="col" class="text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Categoria</th>
              <th scope="col" class="text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Mês Ref.</th>
              <th scope="col" class="text-left   text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Vencimento</th>
              <th scope="col" class="text-right  text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Valor Total</th>
              <th scope="col" class="text-right  text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Pago</th>
              <th scope="col" class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            @if (svc.loading()) {
              <tr><td colspan="8" class="text-center py-12 text-slate-400 text-sm" aria-live="polite">Carregando...</td></tr>
            } @else if (despesasFiltradas().length === 0) {
              <tr>
                <td colspan="8" class="text-center py-12">
                  <span class="material-symbols-rounded text-4xl text-slate-200 block mb-2" aria-hidden="true">receipt_long</span>
                  <p class="text-slate-400 text-sm">Nenhuma despesa encontrada</p>
                  <button type="button" (click)="abrirModal()"
                    class="mt-3 text-sm text-primary-600 font-medium hover:underline focus:outline-none">
                    + Adicionar despesa
                  </button>
                </td>
              </tr>
            } @else {
              @for (d of despesasFiltradas(); track d.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group"
                  [class.bg-amber-50/30]="d.descricao === TAXA_DESCRICAO">
                  <!-- Descrição -->
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-2">
                      @if (d.descricao === TAXA_DESCRICAO) {
                        <span class="material-symbols-rounded text-[14px] text-amber-500 shrink-0" aria-hidden="true">home</span>
                      }
                      <div>
                        <p class="text-sm font-medium text-slate-800">{{ d.descricao }}</p>
                        @if (d.observacao) {
                          <p class="text-xs text-slate-400 truncate max-w-[200px]">{{ d.observacao }}</p>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- Categoria -->
                  <td class="px-4 py-3.5">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-rounded text-[16px]"
                        [style.color]="d.categorias_despesa?.cor ?? '#6B7280'" aria-hidden="true">
                        {{ d.categorias_despesa?.icone ?? 'receipt' }}
                      </span>
                      <span class="text-sm text-slate-600">{{ d.categorias_despesa?.nome ?? '—' }}</span>
                    </div>
                  </td>

                  <td class="px-4 py-3.5 text-sm text-slate-600">{{ formatMes(d.mes_referencia) }}</td>
                  <td class="px-4 py-3.5 text-sm text-slate-600">{{ d.data_vencimento | date:'dd/MM/yyyy' }}</td>

                  <!-- Valor total -->
                  <td class="px-4 py-3.5 text-right text-sm font-semibold text-slate-900">
                    {{ d.valor | currency:'BRL':'symbol':'1.2-2' }}
                  </td>

                  <!-- Valor pago -->
                  <td class="px-4 py-3.5 text-right">
                    @if (valorPagoDisplay(d) > 0) {
                      <div>
                        <span class="text-sm font-semibold text-emerald-600">
                          {{ valorPagoDisplay(d) | currency:'BRL':'symbol':'1.2-2' }}
                        </span>
                        @if (valorPagoDisplay(d) < d.valor) {
                          <p class="text-[11px] text-amber-500 leading-none mt-0.5">
                            falta {{ (d.valor - valorPagoDisplay(d)) | currency:'BRL':'symbol':'1.2-2' }}
                          </p>
                        }
                      </div>
                    } @else {
                      <span class="text-slate-300 text-sm">—</span>
                    }
                  </td>

                  <!-- Status -->
                  <td class="px-4 py-3.5 text-center">
                    <label [attr.aria-label]="'Status de ' + d.descricao" class="sr-only">Status</label>
                    <select (change)="alterarStatus(d.id, $event)" [value]="d.status" [class]="statusSelectClass(d.status)">
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                      <option value="atrasado">Atrasado</option>
                    </select>
                  </td>

                  <!-- Ações -->
                  <td class="px-4 py-3.5">
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        (click)="abrirPagamentoModal(d)"
                        class="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        [attr.aria-label]="'Registrar pagamento de ' + d.descricao"
                        title="Registrar pagamento"
                      >
                        <span class="material-symbols-rounded text-[16px]" aria-hidden="true">payments</span>
                      </button>
                      <button type="button" (click)="abrirModal(d)"
                        class="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        [attr.aria-label]="'Editar ' + d.descricao">
                        <span class="material-symbols-rounded text-[16px]" aria-hidden="true">edit</span>
                      </button>
                      <button type="button" (click)="remover(d)"
                        class="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        [attr.aria-label]="'Remover ' + d.descricao">
                        <span class="material-symbols-rounded text-[16px]" aria-hidden="true">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
          @if (despesasFiltradas().length > 0) {
            <tfoot>
              <tr class="bg-slate-50 border-t border-slate-200">
                <th scope="row" colspan="4" class="px-5 py-3 text-sm font-semibold text-slate-600 text-left">Totais do período</th>
                <td class="px-4 py-3 text-right text-sm font-bold text-slate-900">{{ totalDespesas() | currency:'BRL':'symbol':'1.2-2' }}</td>
                <td class="px-4 py-3 text-right">
                  <span class="text-sm font-bold text-emerald-600 block">{{ totalPago() | currency:'BRL':'symbol':'1.2-2' }}</span>
                  @if (totalAPagar() > 0) {
                    <span class="text-[11px] text-amber-500">falta {{ totalAPagar() | currency:'BRL':'symbol':'1.2-2' }}</span>
                  }
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════
       MODAL — Nova/Editar Despesa
  ═══════════════════════════════════════════════════════ -->
  @if (modalAberto()) {
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" [attr.aria-modal]="true" aria-labelledby="modal-title"
      (keydown.escape)="fecharModal()">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="fecharModal()" aria-hidden="true"></div>
      <div class="relative bg-white rounded-3xl shadow-modal w-full max-w-lg animate-scale-in" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 id="modal-title" class="font-display font-semibold text-slate-900">
            {{ editando() ? 'Editar Despesa' : 'Nova Despesa' }}
          </h2>
          <button type="button" (click)="fecharModal()"
            class="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Fechar modal">
            <span class="material-symbols-rounded text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="salvar()" novalidate class="p-6 space-y-4">
          <div>
            <label for="f-descricao" class="label">Descrição <span aria-hidden="true">*</span></label>
            <input id="f-descricao" formControlName="descricao" placeholder="Ex: Conta de água" class="input-field" autocomplete="off"
              [attr.aria-required]="true" [attr.aria-invalid]="form.get('descricao')?.invalid && form.get('descricao')?.touched"/>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="f-categoria" class="label">Categoria</label>
              <select id="f-categoria" formControlName="categoria_id" class="input-field">
                <option value="">Selecionar...</option>
                @for (cat of svc.categorias(); track cat.id) {
                  <option [value]="cat.id">{{ cat.nome }}</option>
                }
              </select>
            </div>

            <div>
              <label for="f-valor" class="label">Valor (R$) <span aria-hidden="true">*</span></label>
              <input id="f-valor" formControlName="valor" type="number" step="0.01" min="0.01"
                placeholder="0,00" class="input-field" [attr.aria-required]="true"
                [attr.aria-invalid]="form.get('valor')?.invalid && form.get('valor')?.touched"/>
            </div>

            <div>
              <label for="f-mes" class="label">Mês de Referência <span aria-hidden="true">*</span></label>
              <input id="f-mes" formControlName="mes_referencia" type="month" class="input-field" [attr.aria-required]="true"/>
            </div>

            <div>
              <label for="f-vencimento" class="label">Vencimento <span aria-hidden="true">*</span></label>
              <input id="f-vencimento" formControlName="data_vencimento" type="date" class="input-field" [attr.aria-required]="true"/>
            </div>

            <div>
              <label for="f-status" class="label">Status</label>
              <select id="f-status" formControlName="status" class="input-field">
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
          </div>

          <div>
            <label for="f-obs" class="label">Observação</label>
            <textarea id="f-obs" formControlName="observacao" rows="2"
              placeholder="Observações opcionais..." class="input-field resize-none"></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" (click)="fecharModal()"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              Cancelar
            </button>
            <button type="submit" [disabled]="form.invalid || salvando()"
              class="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              {{ salvando() ? 'Salvando...' : (editando() ? 'Atualizar' : 'Cadastrar') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  }

  <!-- ═══════════════════════════════════════════════════════
       MODAL — Registrar Pagamento
  ═══════════════════════════════════════════════════════ -->
  @if (pagamentoModalAberto()) {
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" [attr.aria-modal]="true" aria-labelledby="pag-modal-title"
      (keydown.escape)="fecharPagamentoModal()">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="fecharPagamentoModal()" aria-hidden="true"></div>
      <div class="relative bg-white rounded-3xl shadow-modal w-full max-w-md animate-scale-in" (click)="$event.stopPropagation()">

        <div class="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 id="pag-modal-title" class="font-display font-semibold text-slate-900">Registrar Pagamento</h2>
            @if (despesaEmPagamento()) {
              <p class="text-sm text-slate-500 mt-0.5 truncate max-w-[280px]">{{ despesaEmPagamento()!.descricao }}</p>
            }
          </div>
          <button type="button" (click)="fecharPagamentoModal()"
            class="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none"
            aria-label="Fechar">
            <span class="material-symbols-rounded text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        @if (despesaEmPagamento()) {
          <div class="mx-6 mt-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-xs text-slate-400">Total</p>
              <p class="text-sm font-bold text-slate-900">{{ despesaEmPagamento()!.valor | currency:'BRL':'symbol':'1.2-2' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400">Já pago</p>
              <p class="text-sm font-bold text-emerald-600">{{ totalPagoPorDespesa(despesaEmPagamento()!.id) | currency:'BRL':'symbol':'1.2-2' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400">Saldo</p>
              <p class="text-sm font-bold" [class]="saldoDespesa() < 0 ? 'text-red-600' : 'text-amber-600'">
                {{ saldoDespesa() | currency:'BRL':'symbol':'1.2-2' }}
              </p>
            </div>
          </div>
        }

        <form [formGroup]="pagamentoForm" (ngSubmit)="registrarPagamento()" novalidate class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="pag-valor" class="label">Valor (R$) <span aria-hidden="true">*</span></label>
              <input id="pag-valor" formControlName="valor" type="number" step="0.01" min="0.01"
                class="input-field" [attr.aria-required]="true"/>
            </div>
            <div>
              <label for="pag-data" class="label">Data do Pagamento <span aria-hidden="true">*</span></label>
              <input id="pag-data" formControlName="data_pagamento" type="date" class="input-field" [attr.aria-required]="true"/>
            </div>
          </div>

          <div>
            <p class="label">Forma de Pagamento</p>
            <div class="grid grid-cols-3 gap-2 mt-1.5">
              @for (f of FORMAS; track f.value) {
                <button
                  type="button"
                  (click)="pagamentoForm.patchValue({ forma_pagamento: f.value })"
                  class="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  [class]="pagamentoForm.get('forma_pagamento')?.value === f.value
                    ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'"
                >
                  <span class="material-symbols-rounded text-[20px]" aria-hidden="true">{{ f.icon }}</span>
                  {{ f.label }}
                </button>
              }
            </div>
          </div>

          <div>
            <label for="pag-desc" class="label">Descrição</label>
            <input id="pag-desc" formControlName="descricao" type="text" class="input-field" placeholder="Ex: Pagamento parcial, comprovante #123"/>
          </div>

          <div>
            <label for="pag-obs" class="label">Observação</label>
            <textarea id="pag-obs" formControlName="observacao" rows="2" class="input-field resize-none" placeholder="Opcional..."></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" (click)="fecharPagamentoModal()"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none">
              Cancelar
            </button>
            <button type="submit" [disabled]="pagamentoForm.invalid || salvandoPagamento()"
              class="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <span class="material-symbols-rounded text-[16px] mr-1.5" aria-hidden="true">payments</span>
              {{ salvandoPagamento() ? 'Registrando...' : 'Registrar Pagamento' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  }
  `,
})
export class DespesasPage implements OnInit {
  protected readonly svc            = inject(DespesasService);
  protected readonly pagamentosSvc  = inject(PagamentosService);
  protected readonly mesRefSvc      = inject(MesReferenciaService);
  protected readonly condominioSvc  = inject(CondominioService);
  private   readonly moradoresSvc   = inject(MoradoresService);
  private   readonly fb             = inject(FormBuilder);
  private   readonly cdr            = inject(ChangeDetectorRef);

  protected readonly FORMAS       = FORMAS;
  protected readonly TAXA_DESCRICAO = TAXA_DESCRICAO;

  protected readonly mesFiltro      = signal(this.mesRefSvc.mes());
  protected readonly filtroStatus   = signal<string>('todos');
  protected readonly modalAberto    = signal(false);
  protected readonly editando       = signal<Despesa | null>(null);
  protected readonly salvando       = signal(false);

  // Taxa de condomínio
  protected readonly editandoTaxa  = signal(false);
  protected readonly novoValorTaxa = signal(0);
  protected readonly salvandoTaxa  = signal(false);
  protected readonly lancandoTaxa  = signal(false);

  // Pagamento modal
  protected readonly pagamentoModalAberto = signal(false);
  protected readonly despesaEmPagamento   = signal<Despesa | null>(null);
  protected readonly salvandoPagamento    = signal(false);

  /** Mapa reativo: despesa_id → total de pagamentos registrados */
  private readonly pagamentosPorDespesaMap = computed(() => {
    const map: Record<string, number> = {};
    for (const p of this.pagamentosSvc.pagamentos()) {
      if (p.despesa_id) {
        map[p.despesa_id] = (map[p.despesa_id] ?? 0) + p.valor;
      }
    }
    return map;
  });

  /** True se já existe uma despesa "Taxa de Condomínio" no mês atual */
  protected readonly taxaJaLancada = computed(() =>
    this.svc.despesas().some((d) => d.descricao === TAXA_DESCRICAO),
  );

  /** Quantidade de moradores ativos cadastrados */
  protected readonly qtdMoradores = computed(() =>
    this.moradoresSvc.moradores().filter((m) => m.ativo).length,
  );

  /** Valor total da taxa = taxa unitária × nº de moradores */
  protected readonly valorTotalTaxa = computed(() => {
    const taxa = this.condominioSvc.ativo()?.valor_condominio ?? 0;
    return taxa * this.qtdMoradores();
  });

  protected readonly statusFiltros = [
    { label: 'Todos',     value: 'todos'    },
    { label: 'Pendentes', value: 'pendente' },
    { label: 'Pagas',     value: 'pago'     },
    { label: 'Atrasadas', value: 'atrasado' },
  ] as const;

  protected readonly form = this.fb.group({
    descricao:       ['', Validators.required],
    categoria_id:    [''],
    valor:           [null as number | null, [Validators.required, Validators.min(0.01)]],
    mes_referencia:  [new Date().toISOString().substring(0, 7), Validators.required],
    data_vencimento: ['', Validators.required],
    status:          ['pendente'],
    observacao:      [''],
  });

  protected readonly pagamentoForm = this.fb.group({
    valor:           [null as number | null, [Validators.required, Validators.min(0.01)]],
    data_pagamento:  [new Date().toISOString().substring(0, 10), Validators.required],
    forma_pagamento: ['pix' as FormaPagamento],
    descricao:       [''],
    observacao:      [''],
  });

  protected readonly despesasFiltradas = computed(() => {
    const status = this.filtroStatus();
    const list   = this.svc.despesas();
    return status === 'todos' ? list : list.filter((d) => d.status === status);
  });

  protected readonly totalDespesas = computed(() =>
    this.despesasFiltradas().reduce((s, d) => s + d.valor, 0),
  );

  protected readonly totalPago = computed(() =>
    this.despesasFiltradas().reduce((s, d) => s + this.valorPagoDisplay(d), 0),
  );

  protected readonly totalAPagar = computed(() =>
    this.despesasFiltradas().reduce((s, d) => s + Math.max(0, d.valor - this.valorPagoDisplay(d)), 0),
  );

  protected readonly saldoMes = computed(() => this.totalPago() - this.totalDespesas());

  protected readonly saldoDespesa = computed(() => {
    const d = this.despesaEmPagamento();
    if (!d) return 0;
    return Math.max(0, d.valor - this.totalPagoPorDespesa(d.id));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.svc.carregarCategorias(),
      this.moradoresSvc.carregar(),
    ]);
    await this.carregarTudo();
  }

  private async carregarTudo(): Promise<void> {
    const mes = this.mesFiltro();
    await Promise.all([
      this.svc.carregar(mes),
      this.pagamentosSvc.carregar(mes),
    ]);
    this.cdr.markForCheck();
  }

  // ── Taxa de Condomínio ───────────────────────────────────

  /** Necessário pois Angular template não aceita cast "as T" em event bindings */
  protected onTaxaInput(event: Event): void {
    this.novoValorTaxa.set(+(event.target as HTMLInputElement).value);
  }

  protected iniciarEdicaoTaxa(): void {
    this.novoValorTaxa.set(this.condominioSvc.ativo()?.valor_condominio ?? 0);
    this.editandoTaxa.set(true);
  }

  protected async salvarValorTaxa(): Promise<void> {
    const id = this.condominioSvc.ativo()?.id;
    if (!id) return;
    this.salvandoTaxa.set(true);
    try {
      await this.condominioSvc.atualizar(id, { valor_condominio: this.novoValorTaxa() });
      this.editandoTaxa.set(false);
    } finally {
      this.salvandoTaxa.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async lancarTaxaMes(): Promise<void> {
    const taxaUnitaria = this.condominioSvc.ativo()?.valor_condominio ?? 0;
    const qtd = this.qtdMoradores();
    const valorTotal = taxaUnitaria * qtd;

    if (valorTotal <= 0) return;

    this.lancandoTaxa.set(true);
    try {
      const mes = this.mesFiltro();
      // Vencimento: dia 10 do mês de referência (padrão comum)
      const [y, m] = mes.split('-');
      const vencimento = `${y}-${m}-10`;

      await this.svc.criar({
        descricao:       TAXA_DESCRICAO,
        valor:           valorTotal,
        mes_referencia:  mes,
        data_vencimento: vencimento,
        status:          'pendente',
        observacao:      `${qtd} morador${qtd !== 1 ? 'es' : ''} × ${taxaUnitaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      });
      await this.svc.carregar(mes);
    } finally {
      this.lancandoTaxa.set(false);
      this.cdr.markForCheck();
    }
  }

  /** Rola a página para a lista de despesas */
  protected verTaxaNaLista(): void {
    document.getElementById('lista-despesas')?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Utilitários ──────────────────────────────────────────

  protected totalPagoPorDespesa(despesaId: string): number {
    return this.pagamentosPorDespesaMap()[despesaId] ?? 0;
  }

  protected valorPagoDisplay(d: Despesa): number {
    const pago = this.totalPagoPorDespesa(d.id);
    return pago > 0 ? pago : (d.status === 'pago' ? d.valor : 0);
  }

  protected async onMesChange(mes: string): Promise<void> {
    this.mesFiltro.set(mes);
    this.mesRefSvc.setMes(mes);
    await this.carregarTudo();
  }

  // ── Modal Despesa ────────────────────────────────────────
  protected abrirModal(despesa?: Despesa): void {
    if (despesa) {
      this.editando.set(despesa);
      this.form.patchValue({
        descricao:       despesa.descricao,
        categoria_id:    despesa.categoria_id ?? '',
        valor:           despesa.valor,
        mes_referencia:  despesa.mes_referencia,
        data_vencimento: despesa.data_vencimento,
        status:          despesa.status,
        observacao:      despesa.observacao ?? '',
      });
    } else {
      this.editando.set(null);
      this.form.reset({ status: 'pendente', mes_referencia: this.mesFiltro(), categoria_id: '', observacao: '' });
    }
    this.modalAberto.set(true);
  }

  protected fecharModal(): void {
    this.modalAberto.set(false);
    this.editando.set(null);
    this.form.reset();
  }

  protected async salvar(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.salvando.set(true);
    try {
      const raw = this.form.getRawValue();
      const payload = {
        descricao:       raw.descricao!,
        categoria_id:    raw.categoria_id || undefined,
        valor:           Number(raw.valor),
        mes_referencia:  raw.mes_referencia!,
        data_vencimento: raw.data_vencimento!,
        status:          (raw.status ?? 'pendente') as Despesa['status'],
        observacao:      raw.observacao ?? '',
      };
      if (this.editando()) {
        await this.svc.atualizar(this.editando()!.id, payload);
      } else {
        await this.svc.criar(payload);
      }
      this.fecharModal();
    } finally {
      this.salvando.set(false);
    }
  }

  protected async remover(d: Despesa): Promise<void> {
    if (!confirm(`Remover a despesa "${d.descricao}"?`)) return;
    await this.svc.remover(d.id);
  }

  protected async alterarStatus(id: string, event: Event): Promise<void> {
    const status = (event.target as HTMLSelectElement).value as Despesa['status'];
    await this.svc.alterarStatus(id, status);
  }

  // ── Modal Pagamento ──────────────────────────────────────
  protected abrirPagamentoModal(despesa: Despesa): void {
    this.despesaEmPagamento.set(despesa);
    const saldo = Math.max(0, despesa.valor - this.totalPagoPorDespesa(despesa.id));
    this.pagamentoForm.reset({
      valor:           saldo > 0 ? saldo : despesa.valor,
      data_pagamento:  new Date().toISOString().substring(0, 10),
      forma_pagamento: 'pix',
      descricao:       '',
      observacao:      '',
    });
    this.pagamentoModalAberto.set(true);
  }

  protected fecharPagamentoModal(): void {
    this.pagamentoModalAberto.set(false);
    this.despesaEmPagamento.set(null);
    this.pagamentoForm.reset();
  }

  protected async registrarPagamento(): Promise<void> {
    if (this.pagamentoForm.invalid) { this.pagamentoForm.markAllAsTouched(); return; }
    const despesa = this.despesaEmPagamento();
    if (!despesa) return;

    this.salvandoPagamento.set(true);
    try {
      const raw = this.pagamentoForm.getRawValue();
      await this.pagamentosSvc.criar({
        despesa_id:      despesa.id,
        valor:           Number(raw.valor),
        data_pagamento:  raw.data_pagamento!,
        mes_referencia:  despesa.mes_referencia,
        forma_pagamento: (raw.forma_pagamento ?? 'pix') as FormaPagamento,
        descricao:       raw.descricao ?? undefined,
        observacao:      raw.observacao ?? undefined,
      });

      const totalPagoAtualizado = this.totalPagoPorDespesa(despesa.id) + Number(raw.valor);
      if (totalPagoAtualizado >= despesa.valor && despesa.status !== 'pago') {
        await this.svc.alterarStatus(despesa.id, 'pago');
      }

      this.fecharPagamentoModal();
      this.cdr.markForCheck();
    } finally {
      this.salvandoPagamento.set(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  protected formatMes(mes: string): string {
    const [y, m] = mes.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${meses[parseInt(m, 10) - 1]}/${y}`;
  }

  protected formatMesLong(mes: string): string {
    const [y, m] = mes.split('-');
    const meses = [
      'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
    ];
    return `${meses[parseInt(m, 10) - 1]}/${y}`;
  }

  protected statusSelectClass(status: string): string {
    return STATUS_CLASS[status as StatusKey] ?? STATUS_CLASS['pendente'];
  }
}
