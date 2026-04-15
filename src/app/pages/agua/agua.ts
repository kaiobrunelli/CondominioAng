import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeituraAguaService, formatMesLabel, mesProximo } from '../../services/leitura-agua.service';
import { MoradoresService } from '../../services/moradores.service';
import { DespesasService } from '../../services/despesas.service';
import type { Morador } from '../../models/types';

@Component({
  selector: 'app-agua',
  imports: [CurrencyPipe, DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-slate-900">Leituras de Água</h1>
        <p class="text-slate-500 text-sm mt-0.5">Registre o consumo mensal por unidade e lance as despesas</p>
      </div>
      <button
        type="button"
        (click)="lancarTodasDespesas()"
        [disabled]="lancando() || leiturasSemDespesa() === 0"
        class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span class="material-symbols-rounded text-[18px]" aria-hidden="true">water_drop</span>
        {{ lancando() ? 'Lançando...' : 'Lançar Despesas (' + leiturasSemDespesa() + ')' }}
      </button>
    </div>

    <!-- Config card -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
      <div class="flex flex-wrap gap-6 items-end">

        <!-- Mês de Referência -->
        <div>
          <label for="mes-ref" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Mês de Referência
          </label>
          <input
            id="mes-ref"
            type="month"
            [ngModel]="mesRef"
            (ngModelChange)="onMesRefChange($event)"
            class="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <!-- Mês de Vencimento -->
        <div>
          <label for="mes-venc" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Vencimento em
          </label>
          <input
            id="mes-venc"
            type="month"
            [(ngModel)]="mesVenc"
            class="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <!-- Valor por Litro -->
        <div class="flex items-end gap-2">
          <div>
            <label for="valor-litro" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Valor por Litro (R$)
            </label>
            @if (editandoPreco()) {
              <input
                id="valor-litro"
                type="number"
                step="0.0001"
                min="0.0001"
                [(ngModel)]="precoInputVal"
                class="w-32 text-sm border border-primary-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                (keydown.enter)="salvarPreco()"
                (keydown.escape)="editandoPreco.set(false)"
                #precoInput
              />
            } @else {
              <div class="flex items-center gap-2 py-2">
                <span class="text-sm font-semibold text-slate-900">
                  {{ svc.config()?.valor_por_litro | number:'1.4-4' }}
                </span>
              </div>
            }
          </div>
          @if (editandoPreco()) {
            <button
              type="button"
              (click)="salvarPreco()"
              [disabled]="salvandoPreco()"
              class="text-sm font-medium px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
            >
              {{ salvandoPreco() ? '...' : 'Salvar' }}
            </button>
            <button
              type="button"
              (click)="editandoPreco.set(false)"
              class="text-sm font-medium px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors focus:outline-none"
            >
              Cancelar
            </button>
          } @else {
            <button
              type="button"
              (click)="iniciarEditarPreco()"
              class="inline-flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span class="material-symbols-rounded text-[14px]" aria-hidden="true">edit</span>
              Editar
            </button>
          }
        </div>
      </div>

      <!-- Banner informativo -->
      <div class="mt-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-start gap-2">
        <span class="material-symbols-rounded text-blue-500 text-[18px] shrink-0 mt-0.5" aria-hidden="true">info</span>
        <p class="text-xs text-blue-700">
          Leituras do mês de <strong>{{ formatMes(mesRef) }}</strong> serão cobradas com vencimento em
          <strong>{{ formatMes(mesVenc) }}</strong>. Você pode ajustar o mês de vencimento acima.
        </p>
      </div>
    </div>

    <!-- Resumo rápido -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
        <p class="text-2xl font-display font-bold text-slate-900">{{ moradoresSvc.moradores().length }}</p>
        <p class="text-xs text-slate-500 mt-1">Moradores</p>
      </article>
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
        <p class="text-2xl font-display font-bold text-primary-600">{{ svc.leituras().length }}</p>
        <p class="text-xs text-slate-500 mt-1">Leituras Salvas</p>
      </article>
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
        <p class="text-2xl font-display font-bold text-emerald-600">{{ leiturasLancadas() }}</p>
        <p class="text-xs text-slate-500 mt-1">Despesas Lançadas</p>
      </article>
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
        <p class="text-2xl font-display font-bold text-amber-600">{{ totalACobrar() | currency:'BRL':'symbol':'1.2-2' }}</p>
        <p class="text-xs text-slate-500 mt-1">Total do Mês</p>
      </article>
    </div>

    @if (erroLancamento()) {
      <div class="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2" role="alert">
        <span class="material-symbols-rounded text-red-500 text-[18px] shrink-0 mt-0.5" aria-hidden="true">error</span>
        <p class="text-sm text-red-700">{{ erroLancamento() }}</p>
        <button type="button" (click)="erroLancamento.set('')" class="ml-auto text-red-400 hover:text-red-600">
          <span class="material-symbols-rounded text-[16px]" aria-hidden="true">close</span>
        </button>
      </div>
    }

    <!-- Tabela de leituras -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full" aria-label="Leituras de água por morador">
          <thead>
            <tr class="border-b border-slate-100">
              <th scope="col" class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Morador / Unidade</th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Leit. Anterior</th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Leit. Atual</th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Consumo (L)</th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Valor</th>
              <th scope="col" class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            @if (svc.loading() || moradoresSvc.loading()) {
              <tr>
                <td colspan="7" class="text-center py-12 text-slate-400 text-sm" aria-live="polite">Carregando...</td>
              </tr>
            } @else if (moradoresSvc.moradores().length === 0) {
              <tr>
                <td colspan="7" class="text-center py-12">
                  <span class="material-symbols-rounded text-4xl text-slate-200 block mb-2" aria-hidden="true">groups</span>
                  <p class="text-slate-400 text-sm">Nenhum morador cadastrado</p>
                </td>
              </tr>
            } @else {
              @for (m of moradoresSvc.moradores(); track m.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group">

                  <!-- Morador -->
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                        [class]="m.tipo === 'cobertura' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'"
                        aria-hidden="true"
                      >{{ initials(m.nome) }}</div>
                      <div>
                        <p class="text-sm font-medium text-slate-800">{{ m.nome }}</p>
                        <p class="text-xs text-slate-400">{{ m.unidade }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Leitura anterior -->
                  <td class="px-4 py-3.5 text-right">
                    <span class="text-sm text-slate-500 tabular-nums">
                      {{ leituraAnterior(m.id) | number:'1.0-3' }}
                    </span>
                  </td>

                  <!-- Leitura atual (input) -->
                  <td class="px-4 py-3.5">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      [(ngModel)]="leituraValores[m.id]"
                      [attr.aria-label]="'Leitura atual de ' + m.nome"
                      [disabled]="temDespesaLancada(m.id)"
                      placeholder="0"
                      class="w-28 text-sm text-right border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed tabular-nums"
                    />
                  </td>

                  <!-- Consumo calculado -->
                  <td class="px-4 py-3.5 text-right">
                    @if (consumo(m) !== null) {
                      <span class="text-sm font-medium text-slate-700 tabular-nums">
                        {{ consumo(m) | number:'1.0-3' }} L
                      </span>
                    } @else {
                      <span class="text-slate-300">—</span>
                    }
                  </td>

                  <!-- Valor calculado -->
                  <td class="px-4 py-3.5 text-right">
                    @if (valorTotal(m) !== null) {
                      <span class="text-sm font-semibold text-slate-900 tabular-nums">
                        {{ valorTotal(m) | currency:'BRL':'symbol':'1.2-2' }}
                      </span>
                    } @else {
                      <span class="text-slate-300">—</span>
                    }
                  </td>

                  <!-- Status -->
                  <td class="px-4 py-3.5 text-center">
                    @if (temDespesaLancada(m.id)) {
                      <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <span class="material-symbols-rounded text-[12px]" aria-hidden="true">check_circle</span>
                        Lançado
                      </span>
                    } @else if (temLeituraSalva(m.id)) {
                      <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <span class="material-symbols-rounded text-[12px]" aria-hidden="true">pending</span>
                        Aguardando
                      </span>
                    } @else {
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Pendente
                      </span>
                    }
                  </td>

                  <!-- Ação -->
                  <td class="px-4 py-3.5">
                    @if (!temDespesaLancada(m.id)) {
                      <button
                        type="button"
                        (click)="salvarLinha(m)"
                        [disabled]="!leituraValida(m) || salvandoLinha()[m.id]"
                        class="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 whitespace-nowrap"
                      >
                        {{ salvandoLinha()[m.id] ? 'Salvando...' : (temLeituraSalva(m.id) ? 'Atualizar' : 'Salvar') }}
                      </button>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
          @if (svc.leituras().length > 0) {
            <tfoot>
              <tr class="bg-slate-50 border-t border-slate-200">
                <th scope="row" colspan="4" class="px-5 py-3 text-sm font-semibold text-slate-600 text-left">
                  Total do período
                </th>
                <td class="px-4 py-3 text-right text-sm font-bold text-slate-900">
                  {{ totalACobrar() | currency:'BRL':'symbol':'1.2-2' }}
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  </div>
  `,
})
export class AguaPage implements OnInit {
  protected readonly svc = inject(LeituraAguaService);
  protected readonly moradoresSvc = inject(MoradoresService);
  protected readonly despesasSvc = inject(DespesasService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Estado da página
  protected mesRef = new Date().toISOString().substring(0, 7);
  protected mesVenc = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().substring(0, 7);
  })();

  protected readonly editandoPreco = signal(false);
  protected readonly salvandoPreco = signal(false);
  protected readonly lancando = signal(false);
  protected readonly erroLancamento = signal('');
  protected readonly salvandoLinha = signal<Record<string, boolean>>({});

  // Valores dos inputs (gerenciados pelo ngModel — ngModel dispara markForCheck internamente)
  protected leituraValores: Record<string, number | null> = {};

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.svc.carregarConfig(),
      this.moradoresSvc.carregar(),
    ]);
    await this.svc.carregarMes(this.mesRef);
    this.initInputs();
    this.cdr.markForCheck();
  }

  private initInputs(): void {
    const leituras = this.svc.leituras();
    for (const m of this.moradoresSvc.moradores()) {
      const saved = leituras.find((l) => l.morador_id === m.id);
      this.leituraValores[m.id] = saved?.leitura_atual ?? null;
    }
  }

  protected precoInputVal = '';

  protected iniciarEditarPreco(): void {
    this.precoInputVal = String(this.svc.config()?.valor_por_litro ?? 1);
    this.editandoPreco.set(true);
  }

  protected async salvarPreco(): Promise<void> {
    const val = Number(this.precoInputVal);
    if (isNaN(val) || val <= 0) return;
    this.salvandoPreco.set(true);
    try {
      await this.svc.atualizarConfig(val);
      this.editandoPreco.set(false);
    } finally {
      this.salvandoPreco.set(false);
    }
  }

  protected async onMesRefChange(mes: string): Promise<void> {
    if (!mes) return;
    this.mesRef = mes;
    this.mesVenc = mesProximo(mes);
    await this.svc.carregarMes(mes);
    this.initInputs();
    this.cdr.markForCheck();
  }

  // ── Cálculos por linha ───────────────────────────────────

  protected leituraAnterior(moradorId: string): number {
    const saved = this.svc.leituras().find((l) => l.morador_id === moradorId);
    if (saved) return saved.leitura_anterior;
    return this.svc.leituraAnteriorDe(moradorId);
  }

  protected consumo(m: Morador): number | null {
    const atual = this.leituraValores[m.id];
    if (atual == null) return null;
    const c = Number(atual) - this.leituraAnterior(m.id);
    return c < 0 ? 0 : c;
  }

  protected valorTotal(m: Morador): number | null {
    const c = this.consumo(m);
    if (c === null) return null;
    return c * (this.svc.config()?.valor_por_litro ?? 1);
  }

  protected leituraValida(m: Morador): boolean {
    const v = this.leituraValores[m.id];
    return v != null && Number(v) >= 0;
  }

  // ── Status ───────────────────────────────────────────────

  protected temLeituraSalva(moradorId: string): boolean {
    return this.svc.leituras().some((l) => l.morador_id === moradorId);
  }

  protected temDespesaLancada(moradorId: string): boolean {
    return this.svc.leituras().some((l) => l.morador_id === moradorId && !!l.despesa_id);
  }

  protected leiturasLancadas(): number {
    return this.svc.leituras().filter((l) => !!l.despesa_id).length;
  }

  protected leiturasSemDespesa(): number {
    return this.svc.leituras().filter((l) => !l.despesa_id).length;
  }

  protected totalACobrar(): number {
    return this.svc.leituras().reduce((sum, l) => sum + l.valor_total, 0);
  }

  // ── Ações ────────────────────────────────────────────────

  protected async salvarLinha(m: Morador): Promise<void> {
    const leituraAtual = Number(this.leituraValores[m.id]);
    if (isNaN(leituraAtual) || leituraAtual < 0) return;

    const ant = this.leituraAnterior(m.id);
    const consumoLitros = Math.max(0, leituraAtual - ant);
    const valorUnitario = this.svc.config()?.valor_por_litro ?? 1;
    const valorTotalCalc = consumoLitros * valorUnitario;

    this.salvandoLinha.update((s) => ({ ...s, [m.id]: true }));
    try {
      await this.svc.salvarLeitura({
        morador_id: m.id,
        mes_referencia: this.mesRef,
        mes_vencimento: this.mesVenc,
        leitura_atual: leituraAtual,
        leitura_anterior: ant,
        consumo_litros: consumoLitros,
        valor_unitario: valorUnitario,
        valor_total: valorTotalCalc,
      });
    } finally {
      this.salvandoLinha.update((s) => ({ ...s, [m.id]: false }));
    }
  }

  protected async lancarTodasDespesas(): Promise<void> {
    this.lancando.set(true);
    this.erroLancamento.set('');

    try {
      // 1. Salva leituras que ainda não foram salvas mas têm valor informado
      const moradores = this.moradoresSvc.moradores();
      for (const m of moradores) {
        if (this.leituraValida(m) && !this.temLeituraSalva(m.id)) {
          await this.salvarLinha(m);
        }
      }

      // 2. Busca categoria "Água" se existir
      await this.despesasSvc.carregarCategorias();
      const catAgua = this.despesasSvc.categorias().find(
        (c) => c.nome.toLowerCase().includes('água') || c.nome.toLowerCase().includes('agua'),
      );

      // 3. Lança despesas para leituras sem despesa_id
      const pendentes = this.svc.leituras().filter((l) => !l.despesa_id);
      let erros = 0;

      for (const leitura of pendentes) {
        try {
          const morador = moradores.find((m) => m.id === leitura.morador_id);
          const unidade = morador?.unidade ?? leitura.moradores?.unidade ?? '';
          const descricao = `Água – ${unidade} (${formatMesLabel(leitura.mes_referencia)})`;

          const [ano, mes] = leitura.mes_vencimento.split('-');
          const dataVencimento = `${ano}-${mes}-10`;

          const despesa = await this.despesasSvc.criar({
            descricao,
            categoria_id: catAgua?.id,
            valor: leitura.valor_total,
            mes_referencia: leitura.mes_referencia,
            data_vencimento: dataVencimento,
            status: 'pendente',
            observacao:
              `Leitura: ${leitura.leitura_anterior} → ${leitura.leitura_atual} ` +
              `= ${leitura.consumo_litros}L × R$${leitura.valor_unitario.toFixed(4)}/L`,
          });

          await this.svc.vincularDespesa(leitura.id, despesa.id);
        } catch {
          erros++;
        }
      }

      if (erros > 0) {
        this.erroLancamento.set(`${erros} lançamento(s) falharam. Verifique a conexão e tente novamente.`);
      }
    } finally {
      this.lancando.set(false);
    }
  }

  protected formatMes(mes: string): string {
    return formatMesLabel(mes);
  }

  protected initials(nome: string): string {
    return nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }
}
