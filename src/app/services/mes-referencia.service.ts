import { Injectable, signal } from '@angular/core';

/** Serviço global de mês de referência.
 *  Compartilhado entre Água, Despesas e Relatório
 *  para manter navegação de mês consistente na aplicação. */
@Injectable({ providedIn: 'root' })
export class MesReferenciaService {
  private readonly _mes = signal(this.mesAtual());
  readonly mes = this._mes.asReadonly();

  private mesAtual(): string {
    return new Date().toISOString().substring(0, 7);
  }

  setMes(mes: string): void {
    if (/^\d{4}-\d{2}$/.test(mes)) {
      this._mes.set(mes);
    }
  }

  anterior(): void {
    const [y, m] = this._mes().split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    this._mes.set(this.toYYYYMM(d));
  }

  proximo(): void {
    const [y, m] = this._mes().split('-').map(Number);
    const d = new Date(y, m, 1);
    this._mes.set(this.toYYYYMM(d));
  }

  labelCurto(): string {
    return formatMesLabel(this._mes());
  }

  labelLongo(): string {
    return formatMesLongo(this._mes());
  }

  private toYYYYMM(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

// ── Helpers exportados para uso nos componentes ──────────────
export function formatMesLabel(mes: string): string {
  const [y, m] = mes.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
}

export function formatMesLongo(mes: string): string {
  const [y, m] = mes.split('-');
  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  return `${meses[parseInt(m, 10) - 1]} de ${y}`;
}

export function mesProximo(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
