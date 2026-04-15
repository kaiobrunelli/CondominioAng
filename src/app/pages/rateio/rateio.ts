import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RateioService } from '../../services/rateio.service';
import { DespesasService } from '../../services/despesas.service';
import { MoradoresService } from '../../services/moradores.service';
import { CondominioService } from '../../services/condominio.service';
import type { Rateio, RateioCalculo } from '../../models/types';

@Component({
  selector: 'app-rateio',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">

    <div>
      <h1 class="font-display text-2xl font-semibold text-slate-900">Cálculo de Rateio</h1>
      <p class="text-slate-500 text-sm mt-0.5">Distribua as despesas entre os moradores proporcionalmente</p>
    </div>

    <!-- Config -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
      <div class="flex flex-wrap items-end gap-6">

        <div>
          <label for="r-mes" class="label">Mês de Referência</label>
          <input
            id="r-mes"
            type="month"
            [(ngModel)]="mesReferencia"
            (ngModelChange)="onMesChange($event)"
            class="input-field w-auto"
          />
        </div>

        <div>
          <label for="r-pct" class="label">% Extra Cobertura</label>
          <div class="flex items-center gap-2">
            <input
              id="r-pct"
              type="number"
              [(ngModel)]="percentualCobertura"
              (ngModelChange)="recalcular()"
              min="0"
              max="100"
              step="0.5"
              class="input-field w-24"
              aria-describedby="r-pct-hint"
            />
            <span class="text-sm text-slate-500" id="r-pct-hint">%</span>
          </div>
        </div>

        <button
          type="button"
          (click)="recalcular()"
          class="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span class="material-symbols-rounded text-[18px]" aria-hidden="true">refresh</span>
          Recalcular
        </button>
      </div>
    </div>

    <!-- Resumo despesas -->
    @if (despesasMes().length > 0) {
      <section class="bg-white rounded-2xl border border-slate-100 shadow-card p-5" aria-labelledby="despesas-mes-title">
        <h2 id="despesas-mes-title" class="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span class="material-symbols-rounded text-primary-500 text-[20px]" aria-hidden="true">receipt_long</span>
          Despesas de {{ formatMesLong(mesReferencia) }}
        </h2>
        <ul class="space-y-2" aria-label="Lista de despesas do mês">
          @for (d of despesasMes(); track d.id) {
            <li class="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
              <span class="text-slate-700">{{ d.descricao }}</span>
              <span class="font-medium text-slate-900">{{ d.valor | currency:'BRL':'symbol':'1.2-2' }}</span>
            </li>
          }
        </ul>
        <div class="flex justify-between items-center pt-3 mt-1 border-t border-slate-200">
          <span class="font-semibold text-slate-800">TOTAL</span>
          <span class="font-bold text-xl text-slate-900 font-display">
            {{ totalDespesas() | currency:'BRL':'symbol':'1.2-2' }}
          </span>
        </div>
      </section>
    }

    <!-- Resultado -->
    @if (calculos().length > 0) {
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-display font-semibold text-slate-900 text-lg">Rateio por Morador</h2>
          <p class="text-sm text-slate-500">Cobertura paga +{{ percentualCobertura }}%</p>
        </div>

        <!-- Explicação -->
        <div class="rounded-xl bg-primary-50 border border-primary-100 p-4" role="note">
          <div class="flex gap-3">
            <span class="material-symbols-rounded text-primary-500 text-[20px] shrink-0" aria-hidden="true">calculate</span>
            <div class="text-sm text-primary-800 space-y-1">
              <p>
                <strong>Fórmula:</strong>
                Normal = peso 1 · Cobertura = peso {{ fatorCobertura().toFixed(2) }}
              </p>
              <p>
                Total pesos = {{ totalPesos().toFixed(4) }} ·
                Cota base = {{ cotaBase() | currency:'BRL':'symbol':'1.2-2' }}
              </p>
              <p>
                Soma final:
                <strong>{{ somaTotal() | currency:'BRL':'symbol':'1.2-2' }}</strong>
                de {{ totalDespesas() | currency:'BRL':'symbol':'1.2-2' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Cards -->
        <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Rateio por morador">
          @for (calc of calculos(); track calc.morador.id) {
            <li
              class="bg-white rounded-2xl border border-slate-100 shadow-card p-4"
              [class.ring-2]="calc.morador.tipo === 'cobertura'"
              [class.ring-amber-200]="calc.morador.tipo === 'cobertura'"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                    [class]="calc.morador.tipo === 'cobertura'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-primary-100 text-primary-700'"
                    aria-hidden="true"
                  >
                    {{ initials(calc.morador.nome) }}
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-slate-800">{{ calc.morador.nome }}</p>
                    <p class="text-xs text-slate-400">{{ calc.morador.unidade }}</p>
                  </div>
                </div>
                <span
                  [class]="calc.morador.tipo === 'cobertura'
                    ? 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'
                    : 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700'"
                >
                  {{ calc.morador.tipo === 'cobertura' ? 'Cobertura' : 'Normal' }}
                </span>
              </div>

              <dl class="space-y-1.5 border-t border-slate-50 pt-3">
                <div class="flex justify-between text-xs text-slate-500">
                  <dt>Cota base</dt>
                  <dd>{{ calc.valorBase | currency:'BRL':'symbol':'1.2-2' }}</dd>
                </div>
                @if (calc.valorAdicional > 0) {
                  <div class="flex justify-between text-xs text-amber-600">
                    <dt>Acréscimo (+{{ percentualCobertura }}%)</dt>
                    <dd>{{ calc.valorAdicional | currency:'BRL':'symbol':'1.2-2' }}</dd>
                  </div>
                }
                <div class="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-100">
                  <dt class="text-sm">Total a pagar</dt>
                  <dd class="text-base font-display">{{ calc.valorTotal | currency:'BRL':'symbol':'1.2-2' }}</dd>
                </div>
              </dl>
            </li>
          }
        </ul>

        <!-- Verificação -->
        <p
          class="flex items-center gap-2 text-sm"
          [class]="rateioFechado()
            ? 'text-emerald-600'
            : 'text-red-600'"
          role="status"
          aria-live="polite"
        >
          <span class="material-symbols-rounded text-[18px]" aria-hidden="true">
            {{ rateioFechado() ? 'check_circle' : 'error' }}
          </span>
          {{ rateioFechado()
            ? 'Rateio fechado: ' + formatCurrency(somaTotal())
            : 'Atenção: diferença de ' + formatCurrency(absDiff()) }}
        </p>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            (click)="salvarRateio()"
            [disabled]="rateioSvc.loading() || totalDespesas() === 0"
            class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span class="material-symbols-rounded text-[18px]" aria-hidden="true">save</span>
            {{ rateioSvc.loading() ? 'Salvando...' : 'Salvar Rateio do Mês' }}
          </button>
        </div>
      </div>
    } @else if (totalDespesas() === 0) {
      <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-5 text-center py-12">
        <span class="material-symbols-rounded text-5xl text-slate-200 block mb-3" aria-hidden="true">calculate</span>
        <p class="text-slate-500 text-sm">
          Nenhuma despesa cadastrada para <strong>{{ formatMesLong(mesReferencia) }}</strong>
        </p>
        <p class="text-slate-400 text-xs mt-1">Cadastre despesas primeiro para calcular o rateio</p>
      </div>
    } @else if (moradoresSvc.moradores().length === 0) {
      <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-5 text-center py-12">
        <span class="material-symbols-rounded text-5xl text-slate-200 block mb-3" aria-hidden="true">groups</span>
        <p class="text-slate-500 text-sm">Nenhum morador cadastrado</p>
      </div>
    }

    <!-- Rateios salvos -->
    @if (rateioSvc.rateios().length > 0) {
      <section class="bg-white rounded-2xl border border-slate-100 shadow-card p-5" aria-labelledby="rateio-salvo-title">
        <h2 id="rateio-salvo-title" class="font-semibold text-slate-800 mb-4">
          Rateio Salvo – {{ formatMesLong(mesReferencia) }}
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full" aria-label="Rateios dos moradores">
            <thead>
              <tr class="border-b border-slate-100">
                <th scope="col" class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-2 pr-4">Morador</th>
                <th scope="col" class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-2 pr-4">Unidade</th>
                <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider py-2 pr-4">Valor</th>
                <th scope="col" class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-2">Status</th>
                <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (r of rateioSvc.rateios(); track r.id) {
                <tr class="hover:bg-slate-50/50">
                  <td class="py-2.5 pr-4 text-sm font-medium text-slate-800">{{ r.moradores?.nome }}</td>
                  <td class="py-2.5 pr-4 text-sm text-slate-500">{{ r.moradores?.unidade }}</td>
                  <td class="py-2.5 pr-4 text-right text-sm font-semibold text-slate-900">
                    {{ r.valor_total | currency:'BRL':'symbol':'1.2-2' }}
                  </td>
                  <td class="py-2.5 text-center">
                    <span
                      [class]="r.status_pagamento === 'pago'
                        ? 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700'
                        : 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'"
                    >
                      {{ r.status_pagamento === 'pago' ? 'Pago' : 'Pendente' }}
                    </span>
                  </td>
                  <td class="py-2.5 pl-2">
                    @if (r.status_pagamento !== 'pago') {
                      <button
                        type="button"
                        (click)="marcarPago(r.id)"
                        class="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                        [attr.aria-label]="'Marcar pago: ' + r.moradores?.nome"
                      >
                        Marcar pago
                      </button>
                    } @else {
                      <span class="text-xs text-slate-400">{{ r.data_pagamento | date:'dd/MM/yy' }}</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

  </div>
  `,
  
})
export class RateioPage implements OnInit {
  protected readonly rateioSvc = inject(RateioService);
  protected readonly despesasSvc = inject(DespesasService);
  protected readonly moradoresSvc = inject(MoradoresService);
  private readonly condominioSvc = inject(CondominioService);

  protected mesReferencia = new Date().toISOString().substring(0, 7);
  protected percentualCobertura = 20;
  protected readonly calculos = signal<RateioCalculo[]>([]);

  protected readonly despesasMes = computed(() => this.despesasSvc.despesas());

  protected readonly totalDespesas = computed(() =>
    this.despesasMes().reduce((s, d) => s + d.valor, 0),
  );

  protected readonly fatorCobertura = computed(
    () => 1 + this.percentualCobertura / 100,
  );

  protected readonly totalPesos = computed(() => {
    const fator = this.fatorCobertura();
    return this.moradoresSvc.moradores().reduce(
      (sum, m) => sum + (m.tipo === 'cobertura' ? fator : 1),
      0,
    );
  });

  protected readonly cotaBase = computed(() =>
    this.totalPesos() > 0 ? this.totalDespesas() / this.totalPesos() : 0,
  );

  protected readonly somaTotal = computed(() =>
    this.calculos().reduce((s, c) => s + c.valorTotal, 0),
  );

  protected readonly absDiff = computed(() =>
    Math.abs(this.somaTotal() - this.totalDespesas()),
  );

  protected readonly rateioFechado = computed(() => this.absDiff() < 0.02);

  async ngOnInit(): Promise<void> {
    this.percentualCobertura = this.condominioSvc.ativo()?.percentual_cobertura ?? 20;
    await Promise.all([
      this.despesasSvc.carregar(this.mesReferencia),
      this.moradoresSvc.carregar(),
      this.rateioSvc.carregar(this.mesReferencia),
    ]);
    this.recalcular();
  }

  protected async onMesChange(mes: string): Promise<void> {
    await Promise.all([
      this.despesasSvc.carregar(mes),
      this.rateioSvc.carregar(mes),
    ]);
    this.recalcular();
  }

  protected recalcular(): void {
    const result = this.rateioSvc.calcularRateio(
      this.totalDespesas(),
      this.moradoresSvc.moradores(),
      this.percentualCobertura,
    );
    this.calculos.set(result);
  }

  protected async salvarRateio(): Promise<void> {
    await this.rateioSvc.salvarRateio(this.mesReferencia, this.calculos());
  }

  protected async marcarPago(id: string): Promise<void> {
    await this.rateioSvc.marcarPago(id);
  }

  protected initials(nome: string): string {
    return nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
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
}
