import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
} from '@angular/core';

const MESES = [
  { num: 1,  abr: 'Jan' }, { num: 2,  abr: 'Fev' }, { num: 3,  abr: 'Mar' },
  { num: 4,  abr: 'Abr' }, { num: 5,  abr: 'Mai' }, { num: 6,  abr: 'Jun' },
  { num: 7,  abr: 'Jul' }, { num: 8,  abr: 'Ago' }, { num: 9,  abr: 'Set' },
  { num: 10, abr: 'Out' }, { num: 11, abr: 'Nov' }, { num: 12, abr: 'Dez' },
];

/**
 * Seletor de mês com interface visual por clique.
 *
 * Uso:
 *   <app-month-picker label="Mês de Referência" [value]="mes" (valueChange)="mes = $event" />
 *
 * O `value` e o evento `valueChange` usam formato YYYY-MM.
 */
@Component({
  selector: 'app-month-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="relative">
    @if (label) {
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{{ label }}</p>
    }

    <!-- Botão de disparo -->
    <button
      type="button"
      (click)="toggleOpen()"
      class="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-white transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      [class]="open() ? 'border-primary-400 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="'Selecionar mês: ' + labelAtual()"
    >
      <span class="material-symbols-rounded text-[16px] text-primary-500 shrink-0" aria-hidden="true">calendar_month</span>
      <span class="text-sm font-semibold text-slate-800 min-w-[74px]">{{ labelAtual() }}</span>
      <span
        class="material-symbols-rounded text-[14px] text-slate-400 transition-transform duration-200 shrink-0"
        [class]="open() ? 'rotate-180' : ''"
        aria-hidden="true"
      >expand_more</span>
    </button>

    <!-- Painel dropdown -->
    @if (open()) {
      <div
        class="absolute top-full left-0 mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 w-[216px]"
        role="dialog"
        aria-label="Seletor de mês e ano"
      >
        <!-- Navegação de ano -->
        <div class="flex items-center justify-between mb-2.5 px-0.5">
          <button
            type="button"
            (click)="anoAnterior(); $event.stopPropagation()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
            aria-label="Ano anterior"
          >
            <span class="material-symbols-rounded text-[20px]" aria-hidden="true">chevron_left</span>
          </button>
          <span class="text-sm font-bold text-slate-800 select-none">{{ viewAno() }}</span>
          <button
            type="button"
            (click)="anoProximo(); $event.stopPropagation()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
            aria-label="Próximo ano"
          >
            <span class="material-symbols-rounded text-[20px]" aria-hidden="true">chevron_right</span>
          </button>
        </div>

        <!-- Grade de meses -->
        <div class="grid grid-cols-3 gap-1" role="listbox" [attr.aria-label]="'Meses de ' + viewAno()">
          @for (m of MESES; track m.num) {
            <button
              type="button"
              (click)="selecionarMes(m.num); $event.stopPropagation()"
              [class]="getMesClass(m.num)"
              [attr.aria-selected]="isSelected(m.num)"
              [attr.aria-label]="m.abr + ' ' + viewAno()"
              role="option"
            >{{ m.abr }}</button>
          }
        </div>

        <!-- Atalho para mês atual -->
        <div class="mt-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            (click)="irParaHoje(); $event.stopPropagation()"
            class="w-full text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg py-1 transition-colors focus:outline-none"
          >Mês atual</button>
        </div>
      </div>
    }
  </div>
  `,
})
export class MonthPickerComponent implements OnChanges {
  private readonly el = inject(ElementRef);

  @Input() value = '';
  @Input() label = '';
  @Output() valueChange = new EventEmitter<string>();

  protected readonly open    = signal(false);
  protected readonly viewAno = signal(new Date().getFullYear());
  protected readonly MESES   = MESES;

  private selAno = new Date().getFullYear();
  private selMes = new Date().getMonth() + 1;

  ngOnChanges(): void {
    if (this.value && /^\d{4}-\d{2}$/.test(this.value)) {
      this.selAno = parseInt(this.value.split('-')[0], 10);
      this.selMes = parseInt(this.value.split('-')[1], 10);
    }
  }

  protected labelAtual(): string {
    if (!this.value || !/^\d{4}-\d{2}$/.test(this.value)) return 'Selecionar...';
    const abr = MESES.find((m) => m.num === this.selMes)?.abr ?? '';
    return `${abr}/${this.selAno}`;
  }

  protected toggleOpen(): void {
    if (!this.open()) this.viewAno.set(this.selAno || new Date().getFullYear());
    this.open.update((v) => !v);
  }

  protected anoAnterior(): void { this.viewAno.update((y) => y - 1); }
  protected anoProximo():  void { this.viewAno.update((y) => y + 1); }

  protected selecionarMes(mes: number): void {
    const val = `${this.viewAno()}-${String(mes).padStart(2, '0')}`;
    this.selAno = this.viewAno();
    this.selMes = mes;
    this.valueChange.emit(val);
    this.open.set(false);
  }

  protected irParaHoje(): void {
    const hoje = new Date();
    this.viewAno.set(hoje.getFullYear());
    this.selecionarMes(hoje.getMonth() + 1);
  }

  protected isSelected(mes: number): boolean {
    return this.viewAno() === this.selAno && mes === this.selMes;
  }

  protected getMesClass(mes: number): string {
    const base = 'text-xs font-semibold py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 ';
    if (this.isSelected(mes)) return base + 'bg-primary-600 text-white shadow-sm';
    const hoje = new Date();
    if (this.viewAno() === hoje.getFullYear() && mes === hoje.getMonth() + 1) {
      return base + 'text-primary-600 bg-primary-50 ring-1 ring-primary-200';
    }
    return base + 'text-slate-700 hover:bg-slate-100';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
