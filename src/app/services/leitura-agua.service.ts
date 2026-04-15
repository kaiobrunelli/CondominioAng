import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'condogest_agua_preco';

@Injectable({ providedIn: 'root' })
export class LeituraAguaService {
  private readonly _valorPorLitro = signal(this.loadPrice());
  readonly valorPorLitro = this._valorPorLitro.asReadonly();

  private loadPrice(): number {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      const n = v ? Number(v) : 1.0;
      return isFinite(n) && n > 0 ? n : 1.0;
    } catch {
      return 1.0;
    }
  }

  salvarPreco(valor: number): void {
    if (!isFinite(valor) || valor <= 0) return;
    this._valorPorLitro.set(valor);
    try { localStorage.setItem(STORAGE_KEY, String(valor)); } catch { /* ignore */ }
  }
}

// ── helpers de data/formato exportados ──────────────────────
export function mesProximo(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMesLabel(mes: string): string {
  const [y, m] = mes.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
}
