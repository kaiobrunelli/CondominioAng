import { Component, signal } from '@angular/core';
import { CardSaborComponent, Sabor } from './sabor-item-component2';

@Component({
  selector: 'app-cardapio',
  standalone: true,
  imports: [CardSaborComponent],
  template: `
    <div class="grid grid-cols-3 gap-4 p-6">
      @for (sabor of sabores(); track sabor.id) {
        <app-card-sabor2
          [sabor]="sabor"
          (saborEscolhido)="adicionarAoPedido($event)"
        
        />
      }
    </div>

    <p class="p-6 font-semibold">
      Itens no pedido: {{ pedido().length }}
    </p>
  `,
})
export class CardapioComponent {
  sabores = signal<Sabor[]>([
    { id: 1, nome: 'Morango', preco: 8.5,  disponivel: true , totalPedido: 0},
    { id: 2, nome: 'Chocolate', preco: 9,  disponivel: true , totalPedido: 0},
    { id: 3, nome: 'Creme',   preco: 8,    disponivel: false, totalPedido: 0 },
  ]);

  pedido = signal<Sabor[]>([]);

  adicionarAoPedido(sabor: Sabor) {
    // imutabilidade com spread — padrão sênior
    this.pedido.update(atual => [...atual, sabor]);
  }



}