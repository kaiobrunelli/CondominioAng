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
import { MesReferenciaService } from '../../services/mes-referencia.service';
import { MoradoresService } from '../../services/moradores.service';
import { DespesasService } from '../../services/despesas.service';
import { MonthPickerComponent } from '../../shared/month-picker/month-picker';

@Component({
  selector: 'app-agua',
  imports: [CurrencyPipe, DecimalPipe, FormsModule, MonthPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* Remove setas/spinners dos inputs numéricos */
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; appearance: textfield; }
  `],
  template: `
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-slate-900">Leituras de Água</h1>
        <p class="text-slate-500 text-sm mt-0.5">Informe as leituras e lance as despesas automaticamente</p>
      </div>
      <button
        type="button"
        (click)="lancarDespesas()"
        [disabled]="lancando() || pendentes() === 0"
        class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span class="material-symbols-rounded text-[18px]" aria-hidden="true">water_drop</span>
        {{ lancando() ? 'Lançando...' : 'Lançar Despesas' + (pendentes() > 0 ? ' (' + pendentes() + ')' : '') }}
      </button>
    </div>

    <!-- Config card -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-card p-5 space-y-4">
      <div class="flex flex-wrap gap-6 items-end">

        <!-- Mês de Referência — seletor por clique -->
        <app-month-picker
          label="Mês de Referência"
          [value]="mesRef"
          (valueChange)="onMesRefChange($event)"
        />

        <!-- Mês de Vencimento — seletor por clique -->
        <app-month-picker
          label="Vencimento em"
          [value]="mesVenc"
          (valueChange)="mesVenc = $event"
        />

        <!-- Valor por Litro — inline edit -->
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Valor por Litro</p>
          @if (!editandoPreco) {
            <button
              type="button"
              (click)="iniciarEditarPreco()"
              class="group flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Clique para editar"
            >
              <span class="material-symbols-rounded text-[16px] text-primary-500" aria-hidden="true">water_drop</span>
              <span class="text-sm font-semibold text-slate-800">
                R$&nbsp;{{ svc.valorPorLitro() | number:'1.4-4' }}
              </span>
              <span class="material-symbols-rounded text-[14px] text-slate-400 group-hover:text-primary-600 transition-colors" aria-hidden="true">edit</span>
            </button>
          } @else {
            <div class="flex items-center gap-1">
              <span class="text-sm text-slate-500 px-1">R$</span>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                [(ngModel)]="precoTemp"
                (keydown.enter)="confirmarPreco()"
                (keydown.escape)="cancelarPreco()"
                autofocus
                class="w-28 text-sm text-right border border-primary-400 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Novo valor por litro"
              />
              <button type="button" (click)="confirmarPreco()"
                class="p-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Confirmar preço">
                <span class="material-symbols-rounded text-[16px]" aria-hidden="true">check</span>
              </button>
              <button type="button" (click)="cancelarPreco()"
                class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors focus:outline-none"
                aria-label="Cancelar edição">
                <span class="material-symbols-rounded text-[16px]" aria-hidden="true">close</span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Banner informativo -->
      <div class="rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 flex items-center gap-2">
        <span class="material-symbols-rounded text-blue-400 text-[16px] shrink-0" aria-hidden="true">info</span>
        <p class="text-xs text-blue-700">
          Leituras de <strong>{{ formatMes(mesRef) }}</strong> · vencimento dia&nbsp;10 de
          <strong>{{ formatMes(mesVenc) }}</strong> · R$&nbsp;{{ svc.valorPorLitro() | number:'1.4-4' }}/L
          @if (carregandoAnteriores()) {
            · <span class="text-blue-500 italic">carregando leituras anteriores...</span>
          }
        </p>
      </div>
    </div>

    <!-- Resumo -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
        <p class="text-2xl font-display font-bold text-slate-900">{{ moradoresSvc.moradores().length }}</p>
        <p class="text-xs text-slate-500 mt-1">Moradores</p>
      </article>
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
        <p class="text-2xl font-display font-bold text-primary-600">{{ preenchidos() }}</p>
        <p class="text-xs text-slate-500 mt-1">Com Leitura</p>
      </article>
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
        <p class="text-2xl font-display font-bold text-emerald-600">{{ lancadosCount() }}</p>
        <p class="text-xs text-slate-500 mt-1">Despesas Lançadas</p>
      </article>
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center">
        <p class="text-lg font-display font-bold text-amber-600">{{ totalACobrar() | currency:'BRL':'symbol':'1.2-2' }}</p>
        <p class="text-xs text-slate-500 mt-1">Total do Mês</p>
      </article>
    </div>

    @if (erroLancamento()) {
      <div class="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-2" role="alert">
        <span class="material-symbols-rounded text-red-500 text-[18px] shrink-0" aria-hidden="true">error</span>
        <p class="text-sm text-red-700 flex-1">{{ erroLancamento() }}</p>
        <button type="button" (click)="erroLancamento.set('')" class="text-red-400 hover:text-red-600 focus:outline-none">
          <span class="material-symbols-rounded text-[16px]" aria-hidden="true">close</span>
        </button>
      </div>
    }

    <!-- Tabela -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full" aria-label="Leituras de água por morador">
          <thead>
            <tr class="border-b border-slate-100">
              <th scope="col" class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Morador / Unidade</th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Leit. Anterior
                <span class="block text-[10px] font-normal normal-case tracking-normal text-slate-300">auto do mês anterior</span>
              </th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Leit. Atual</th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Consumo (L)</th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Valor</th>
              <th scope="col" class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            @if (moradoresSvc.loading() || carregandoAnteriores()) {
              <tr>
                <td colspan="6" class="text-center py-12 text-slate-400 text-sm">Carregando...</td>
              </tr>
            } @else if (moradoresSvc.moradores().length === 0) {
              <tr>
                <td colspan="6" class="text-center py-12">
                  <span class="material-symbols-rounded text-4xl text-slate-200 block mb-2" aria-hidden="true">groups</span>
                  <p class="text-slate-400 text-sm">Nenhum morador cadastrado</p>
                </td>
              </tr>
            } @else {
              @for (m of moradoresSvc.moradores(); track m.id) {
                <tr
                  class="hover:bg-slate-50/50 transition-colors"
                  [class.opacity-60]="lancados().has(m.id)"
                >
                  <!-- Morador -->
                  <td class="px-5 py-3">
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

                  <!-- Leitura anterior (auto-preenchida do Supabase) -->
                  <td class="px-4 py-3">
                    <div class="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        [(ngModel)]="anteriorValores[m.id]"
                        [disabled]="lancados().has(m.id)"
                        placeholder="0"
                        [attr.aria-label]="'Leitura anterior de ' + m.nome"
                        class="w-28 text-sm text-right border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed tabular-nums"
                        [class]="anteriorDeSuapbase[m.id] ? 'border-blue-200 bg-blue-50' : 'border-slate-200'"
                      />
                      @if (anteriorDeSuapbase[m.id]) {
                        <span
                          class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400"
                          title="Preenchido automaticamente do registro anterior"
                          aria-hidden="true"
                        ></span>
                      }
                    </div>
                  </td>

                  <!-- Leitura atual -->
                  <td class="px-4 py-3">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      [(ngModel)]="atualValores[m.id]"
                      [disabled]="lancados().has(m.id)"
                      placeholder="0"
                      [attr.aria-label]="'Leitura atual de ' + m.nome"
                      class="w-28 text-sm text-right border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed tabular-nums"
                    />
                  </td>

                  <!-- Consumo calculado -->
                  <td class="px-4 py-3 text-right">
                    @if (consumo(m.id) !== null) {
                      <span class="text-sm font-medium text-slate-700 tabular-nums">
                        {{ consumo(m.id) | number:'1.0-3' }} L
                      </span>
                    } @else {
                      <span class="text-slate-300">—</span>
                    }
                  </td>

                  <!-- Valor calculado -->
                  <td class="px-4 py-3 text-right">
                    @if (valorTotal(m.id) !== null) {
                      <span class="text-sm font-semibold text-slate-900 tabular-nums">
                        {{ valorTotal(m.id) | currency:'BRL':'symbol':'1.2-2' }}
                      </span>
                    } @else {
                      <span class="text-slate-300">—</span>
                    }
                  </td>

                  <!-- Status -->
                  <td class="px-4 py-3 text-center">
                    @if (lancados().has(m.id)) {
                      <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <span class="material-symbols-rounded text-[12px]" aria-hidden="true">check_circle</span>
                        Lançado
                      </span>
                    } @else if (atualValores[m.id] != null) {
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Aguardando
                      </span>
                    } @else {
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                        Pendente
                      </span>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
          @if (preenchidos() > 0) {
            <tfoot>
              <tr class="bg-slate-50 border-t border-slate-200">
                <th scope="row" colspan="4" class="px-5 py-3 text-sm font-semibold text-slate-600 text-left">
                  Total do período
                </th>
                <td class="px-4 py-3 text-right text-sm font-bold text-slate-900">
                  {{ totalACobrar() | currency:'BRL':'symbol':'1.2-2' }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>

      <!-- Legenda -->
      @if (!carregandoAnteriores() && moradoresSvc.moradores().length > 0) {
        <div class="px-5 py-3 border-t border-slate-50 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" aria-hidden="true"></span>
          <p class="text-xs text-slate-400">Campo com ponto azul = leitura anterior preenchida automaticamente do registro do mês anterior no banco de dados</p>
        </div>
      }
    </div>
  </div>
  `,
})
export class AguaPage implements OnInit {
  protected readonly svc          = inject(LeituraAguaService);
  protected readonly mesRefSvc    = inject(MesReferenciaService);
  protected readonly moradoresSvc = inject(MoradoresService);
  protected readonly despesasSvc  = inject(DespesasService);
  private   readonly cdr          = inject(ChangeDetectorRef);

  // Meses
  protected mesRef  = this.mesRefSvc.mes();
  protected mesVenc = mesProximo(this.mesRefSvc.mes());

  // Estado edição de preço
  protected editandoPreco = false;
  protected precoTemp = '';

  // Valores por morador
  protected anteriorValores:    Record<string, number | null> = {};
  protected atualValores:       Record<string, number | null> = {};
  protected anteriorDeSuapbase: Record<string, boolean>       = {};

  // Signals
  protected readonly lancados          = signal<Set<string>>(new Set());
  protected readonly lancando          = signal(false);
  protected readonly erroLancamento    = signal('');
  protected readonly carregandoAnteriores = signal(false);

  async ngOnInit(): Promise<void> {
    await this.moradoresSvc.carregar();
    this.initInputs();
    await this.carregarLeiturasMes();
    this.cdr.markForCheck();
  }

  // ── Carregamento ─────────────────────────────────────────
  /** Carrega leituras já salvas para o mês atual e pré-preenche as "anteriores" */
  private async carregarLeiturasMes(): Promise<void> {
    this.carregandoAnteriores.set(true);
    try {
      // Leituras salvas para o mês de referência atual (edição de registros existentes)
      await this.svc.carregarPorMes(this.mesRef);
      const leiturasMes = this.svc.leituras();

      for (const m of this.moradoresSvc.moradores()) {
        // Se já tem leitura salva para este mês, preenche os campos
        const leituraSalva = leiturasMes.find((l) => l.morador_id === m.id);
        if (leituraSalva) {
          this.anteriorValores[m.id] = leituraSalva.leitura_anterior;
          this.atualValores[m.id]    = leituraSalva.leitura_atual;
          this.anteriorDeSuapbase[m.id] = false;
          if (leituraSalva.despesa_id) {
            this.lancados.update((s) => { const ns = new Set(s); ns.add(m.id); return ns; });
          }
          continue;
        }

        // Caso contrário, busca a leitura do mês anterior para pré-preencher "anterior"
        const ultima = await this.svc.buscarUltimaLeitura(m.id, this.mesRef);
        if (ultima) {
          this.anteriorValores[m.id]    = ultima.leitura_atual;
          this.anteriorDeSuapbase[m.id] = true;
        } else {
          this.anteriorDeSuapbase[m.id] = false;
        }
      }
    } finally {
      this.carregandoAnteriores.set(false);
      this.cdr.markForCheck();
    }
  }

  private initInputs(): void {
    for (const m of this.moradoresSvc.moradores()) {
      if (!(m.id in this.anteriorValores)) this.anteriorValores[m.id] = null;
      if (!(m.id in this.atualValores))    this.atualValores[m.id]    = null;
    }
  }

  protected async onMesRefChange(mes: string): Promise<void> {
    if (!mes) return;
    this.mesRef  = mes;
    this.mesVenc = mesProximo(mes);
    this.mesRefSvc.setMes(mes);

    // Reset
    this.lancados.set(new Set());
    this.anteriorValores    = {};
    this.atualValores       = {};
    this.anteriorDeSuapbase = {};
    this.initInputs();

    await this.carregarLeiturasMes();
    this.cdr.markForCheck();
  }

  // ── Preço ────────────────────────────────────────────────
  protected iniciarEditarPreco(): void {
    this.precoTemp    = String(this.svc.valorPorLitro());
    this.editandoPreco = true;
  }

  protected confirmarPreco(): void {
    const val = Number(this.precoTemp);
    if (isFinite(val) && val > 0) this.svc.salvarPreco(val);
    this.editandoPreco = false;
  }

  protected cancelarPreco(): void { this.editandoPreco = false; }

  // ── Cálculos ─────────────────────────────────────────────
  protected consumo(moradorId: string): number | null {
    const ant = this.anteriorValores[moradorId];
    const atu = this.atualValores[moradorId];
    if (atu == null) return null;
    return Math.max(0, Number(atu) - Number(ant ?? 0));
  }

  protected valorTotal(moradorId: string): number | null {
    const c = this.consumo(moradorId);
    return c === null ? null : c * this.svc.valorPorLitro();
  }

  // ── Contadores ───────────────────────────────────────────
  protected preenchidos(): number {
    return this.moradoresSvc.moradores().filter((m) => this.atualValores[m.id] != null).length;
  }

  protected pendentes(): number {
    return this.moradoresSvc.moradores().filter(
      (m) => this.atualValores[m.id] != null && !this.lancados().has(m.id),
    ).length;
  }

  protected lancadosCount(): number { return this.lancados().size; }

  protected totalACobrar(): number {
    return this.moradoresSvc.moradores().reduce((sum, m) => sum + (this.valorTotal(m.id) ?? 0), 0);
  }

  // ── Lançamento ───────────────────────────────────────────
  protected async lancarDespesas(): Promise<void> {
    this.lancando.set(true);
    this.erroLancamento.set('');

    const moradores = this.moradoresSvc.moradores();
    const pendentes = moradores.filter(
      (m) => this.atualValores[m.id] != null && !this.lancados().has(m.id),
    );

    await this.despesasSvc.carregarCategorias();
    const catAgua = this.despesasSvc.categorias().find(
      (c) => c.nome.toLowerCase().includes('água') || c.nome.toLowerCase().includes('agua'),
    );

    const [ano, mes] = this.mesVenc.split('-');
    const dataVencimento = `${ano}-${mes}-10`;
    const preco = this.svc.valorPorLitro();

    let erros = 0;
    const novosLancados = new Set(this.lancados());

    for (const m of pendentes) {
      try {
        const ant          = Number(this.anteriorValores[m.id] ?? 0);
        const atu          = Number(this.atualValores[m.id]);
        const consumoLitros = Math.max(0, atu - ant);
        const valor         = consumoLitros * preco;

        // 1. Cria a despesa
        const despesa = await this.despesasSvc.criar({
          descricao:       `Água – ${m.unidade} (${formatMesLabel(this.mesRef)})`,
          categoria_id:    catAgua?.id,
          valor,
          mes_referencia:  this.mesRef,
          data_vencimento: dataVencimento,
          status:          'pendente',
          observacao:      `Leitura: ${ant} → ${atu} = ${consumoLitros.toFixed(3)}L × R$${preco.toFixed(4)}/L`,
        });

        // 2. Salva a leitura no Supabase
        await this.svc.salvar({
          morador_id:       m.id,
          mes_referencia:   this.mesRef,
          mes_vencimento:   this.mesVenc,
          leitura_anterior: ant,
          leitura_atual:    atu,
          consumo_litros:   consumoLitros,
          valor_unitario:   preco,
          valor_total:      valor,
          despesa_id:       despesa.id,
          observacao:       `Lançado em ${new Date().toLocaleDateString('pt-BR')}`,
        });

        novosLancados.add(m.id);
      } catch {
        erros++;
      }
    }

    this.lancados.set(novosLancados);
    this.lancando.set(false);

    if (erros > 0) {
      this.erroLancamento.set(
        `${erros} lançamento(s) falharam. Verifique a conexão e tente novamente.`,
      );
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  protected formatMes(mes: string): string { return formatMesLabel(mes); }

  protected initials(nome: string): string {
    return nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }
}
