/**
 * @deprecated Página de Rateio removida.
 * A taxa do condomínio é fixa e lançada diretamente em /despesas.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-rateio',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 text-center">
      <p class="text-slate-500">Esta página não está mais disponível.</p>
      <a routerLink="/despesas" class="text-primary-600 hover:underline mt-2 inline-block">
        Ir para Despesas
      </a>
    </div>
  `,
})
export class RateioPage {}
