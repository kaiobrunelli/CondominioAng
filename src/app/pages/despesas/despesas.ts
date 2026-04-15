import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DespesasService } from '../../services/despesas.service';
import type { Despesa } from '../../models/types';

type StatusKey = 'pago' | 'pendente' | 'atrasado';

const STATUS_LABEL: Record<StatusKey, string> = {
  pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado',
};

const STATUS_CLASS: Record<StatusKey, string> = {
  pago: 'text-xs font-medium rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500',
  pendente: 'text-xs font-medium rounded-full px-2 py-0.5 bg-amber-100  text-amber-700  border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500',
  atrasado: 'text-xs font-medium rounded-full px-2 py-0.5 bg-red-100    text-red-700    border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500',
};

@Component({
  selector: 'app-despesas',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-slate-900">Despesas</h1>
        <p class="text-slate-500 text-sm mt-0.5">Gerencie as contas e gastos do condomínio</p>
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

    <!-- Filtros -->
    <div class="flex flex-wrap gap-3 items-center">
      <div class="relative">
        <span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none" aria-hidden="true">calendar_month</span>
        <label for="mes-filtro" class="sr-only">Filtrar por mês</label>
        <input
          id="mes-filtro"
          type="month"
          [value]="mesFiltro()"
          (change)="onMesChange($event)"
          class="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div class="flex gap-1 bg-white border border-slate-200 rounded-xl p-1" role="group" aria-label="Filtrar por status">
        @for (s of statusFiltros; track s.value) {
          <button
            type="button"
            (click)="filtroStatus.set(s.value)"
            [class]="filtroStatus() === s.value
              ? 'text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-600 text-white transition-colors'
              : 'text-xs font-medium px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors'"
            [attr.aria-pressed]="filtroStatus() === s.value"
          >
            {{ s.label }}
          </button>
        }
      </div>

      <p class="ml-auto text-sm text-slate-500 font-medium" aria-live="polite">
        Total: <span class="text-slate-900 font-semibold">{{ totalFiltrado() | currency:'BRL':'symbol':'1.2-2' }}</span>
      </p>
    </div>

    <!-- Tabela -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full" aria-label="Lista de despesas">
          <thead>
            <tr class="border-b border-slate-100">
              <th scope="col" class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Descrição</th>
              <th scope="col" class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Categoria</th>
              <th scope="col" class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Mês Ref.</th>
              <th scope="col" class="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Vencimento</th>
              <th scope="col" class="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Valor</th>
              <th scope="col" class="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            @if (svc.loading()) {
              <tr>
                <td colspan="7" class="text-center py-12 text-slate-400 text-sm" aria-live="polite">
                  Carregando...
                </td>
              </tr>
            } @else if (despesasFiltradas().length === 0) {
              <tr>
                <td colspan="7" class="text-center py-12">
                  <span class="material-symbols-rounded text-4xl text-slate-200 block mb-2" aria-hidden="true">receipt_long</span>
                  <p class="text-slate-400 text-sm">Nenhuma despesa encontrada</p>
                  <button
                    type="button"
                    (click)="abrirModal()"
                    class="mt-3 text-sm text-primary-600 font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  >
                    + Adicionar despesa
                  </button>
                </td>
              </tr>
            } @else {
              @for (d of despesasFiltradas(); track d.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group">
                  <td class="px-5 py-3.5">
                    <p class="text-sm font-medium text-slate-800">{{ d.descricao }}</p>
                    @if (d.observacao) {
                      <p class="text-xs text-slate-400 truncate max-w-[200px]">{{ d.observacao }}</p>
                    }
                  </td>
                  <td class="px-4 py-3.5">
                    <div class="flex items-center gap-2">
                      <span
                        class="material-symbols-rounded text-[16px]"
                        [style.color]="d.categorias_despesa?.cor ?? '#6B7280'"
                        aria-hidden="true"
                      >{{ d.categorias_despesa?.icone ?? 'receipt' }}</span>
                      <span class="text-sm text-slate-600">{{ d.categorias_despesa?.nome ?? '—' }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3.5 text-sm text-slate-600">{{ formatMes(d.mes_referencia) }}</td>
                  <td class="px-4 py-3.5 text-sm text-slate-600">{{ d.data_vencimento | date:'dd/MM/yyyy' }}</td>
                  <td class="px-4 py-3.5 text-right text-sm font-semibold text-slate-900">
                    {{ d.valor | currency:'BRL':'symbol':'1.2-2' }}
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <label [attr.aria-label]="'Status de ' + d.descricao" class="sr-only">Status</label>
                    <select
                      (change)="alterarStatus(d.id, $event)"
                      [value]="d.status"
                      [class]="statusSelectClass(d.status)"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                      <option value="atrasado">Atrasado</option>
                    </select>
                  </td>
                  <td class="px-4 py-3.5">
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        (click)="abrirModal(d)"
                        class="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        [attr.aria-label]="'Editar ' + d.descricao"
                      >
                        <span class="material-symbols-rounded text-[16px]" aria-hidden="true">edit</span>
                      </button>
                      <button
                        type="button"
                        (click)="remover(d)"
                        class="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        [attr.aria-label]="'Remover ' + d.descricao"
                      >
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
                <th scope="row" colspan="4" class="px-5 py-3 text-sm font-semibold text-slate-600 text-left">
                  Total do período
                </th>
                <td class="px-4 py-3 text-right text-sm font-bold text-slate-900">
                  {{ totalFiltrado() | currency:'BRL':'symbol':'1.2-2' }}
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          }
        </table>
      </div>
    </div>
  </div>

  <!-- Modal -->
  @if (modalAberto()) {
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      [attr.aria-modal]="true"
      [attr.aria-labelledby]="'modal-title'"
      (keydown.escape)="fecharModal()"
    >
      <div
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        (click)="fecharModal()"
        aria-hidden="true"
      ></div>
      <div
        class="relative bg-white rounded-3xl shadow-modal w-full max-w-lg animate-scale-in"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 id="modal-title" class="font-display font-semibold text-slate-900">
            {{ editando() ? 'Editar Despesa' : 'Nova Despesa' }}
          </h2>
          <button
            type="button"
            (click)="fecharModal()"
            class="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Fechar modal"
          >
            <span class="material-symbols-rounded text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="salvar()" novalidate class="p-6 space-y-4">

          <div>
            <label for="f-descricao" class="label">Descrição <span aria-hidden="true">*</span></label>
            <input
              id="f-descricao"
              formControlName="descricao"
              placeholder="Ex: Conta de água"
              class="input-field"
              autocomplete="off"
              [attr.aria-required]="true"
              [attr.aria-invalid]="form.get('descricao')?.invalid && form.get('descricao')?.touched"
            />
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
              <input
                id="f-valor"
                formControlName="valor"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                class="input-field"
                [attr.aria-required]="true"
                [attr.aria-invalid]="form.get('valor')?.invalid && form.get('valor')?.touched"
              />
            </div>

            <div>
              <label for="f-mes" class="label">Mês de Referência <span aria-hidden="true">*</span></label>
              <input id="f-mes" formControlName="mes_referencia" type="month" class="input-field" [attr.aria-required]="true" />
            </div>

            <div>
              <label for="f-vencimento" class="label">Vencimento <span aria-hidden="true">*</span></label>
              <input id="f-vencimento" formControlName="data_vencimento" type="date" class="input-field" [attr.aria-required]="true" />
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
            <textarea
              id="f-obs"
              formControlName="observacao"
              rows="2"
              placeholder="Observações opcionais..."
              class="input-field resize-none"
            ></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="button"
              (click)="fecharModal()"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || salvando()"
              class="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {{ salvando() ? 'Salvando...' : (editando() ? 'Atualizar' : 'Cadastrar') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  }
  `,

})
export class DespesasPage implements OnInit {
  protected readonly svc = inject(DespesasService);
  private readonly fb = inject(FormBuilder);

  protected readonly mesFiltro = signal(new Date().toISOString().substring(0, 7));
  protected readonly filtroStatus = signal<string>('todos');
  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<Despesa | null>(null);
  protected readonly salvando = signal(false);

  protected readonly statusFiltros = [
    { label: 'Todos', value: 'todos' },
    { label: 'Pendentes', value: 'pendente' },
    { label: 'Pagas', value: 'pago' },
    { label: 'Atrasadas', value: 'atrasado' },
  ] as const;

  protected readonly form = this.fb.group({
    descricao: ['', Validators.required],
    categoria_id: [''],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
    mes_referencia: [new Date().toISOString().substring(0, 7), Validators.required],
    data_vencimento: ['', Validators.required],
    status: ['pendente'],
    observacao: [''],
  });

  protected readonly despesasFiltradas = computed(() => {
    const status = this.filtroStatus();
    const list = this.svc.despesas();
    return status === 'todos' ? list : list.filter((d) => d.status === status);
  });

  protected readonly totalFiltrado = computed(() =>
    this.despesasFiltradas().reduce((sum, d) => sum + d.valor, 0),
  );

  async ngOnInit(): Promise<void> {
    await this.svc.carregarCategorias();
    await this.svc.carregar(this.mesFiltro());
  }

  protected async onMesChange(event: Event): Promise<void> {
    const mes = (event.target as HTMLInputElement).value;
    this.mesFiltro.set(mes);
    await this.svc.carregar(mes);
  }

  protected abrirModal(despesa?: Despesa): void {
    if (despesa) {
      this.editando.set(despesa);
      this.form.patchValue({
        descricao: despesa.descricao,
        categoria_id: despesa.categoria_id ?? '',
        valor: despesa.valor,
        mes_referencia: despesa.mes_referencia,
        data_vencimento: despesa.data_vencimento,
        status: despesa.status,
        observacao: despesa.observacao ?? '',
      });
    } else {
      this.editando.set(null);
      this.form.reset({
        status: 'pendente',
        mes_referencia: this.mesFiltro(),
        categoria_id: '',
        observacao: '',
      });
    }
    this.modalAberto.set(true);
  }

  protected fecharModal(): void {
    this.modalAberto.set(false);
    this.editando.set(null);
    this.form.reset();
  }

  protected async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const raw = this.form.getRawValue();
      const payload = {
        descricao: raw.descricao!,
        categoria_id: raw.categoria_id || undefined,
        valor: Number(raw.valor),
        mes_referencia: raw.mes_referencia!,
        data_vencimento: raw.data_vencimento!,
        status: (raw.status ?? 'pendente') as Despesa['status'],
        observacao: raw.observacao ?? '',
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

  protected formatMes(mes: string): string {
    const [y, m] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(m, 10) - 1]}/${y}`;
  }

  protected statusSelectClass(status: string): string {
    return STATUS_CLASS[status as StatusKey] ?? STATUS_CLASS['pendente'];
  }
}
