import { Component, signal } from "@angular/core";
import { CardSaborComponent, Sabor } from "./sabor-item-component2";
@Component({
  selector: 'app-cardapio2',
  standalone: true,
  imports: [CardSaborComponent],
  template: `
    <div class="grid grid-cols-3 gap-4 p-6">
      @for (sabor of sabores(); track sabor.id) {
        <app-card-sabor2
          [sabor]="sabor"
          [quantidadeSsabores]="2"
          (saborEscolhido)="adicionarAoPedido($event)"
         
        />
      
      }
    </div>
      <div>
        @for(item of pedido(); track item.id) {
            <p>Nome {{item.nome}} - Total Pedido: {{item.totalPedido }} </p>
        }
      </div>
     >

  `,
})

export class CadapioSabores2 {
    sabores = signal<Sabor[]>([
        { id: 1, nome: 'Morango', preco: 8.5, disponivel: true, totalPedido: 0 },
        { id: 2, nome: 'Chocolate', preco: 9, disponivel: true, totalPedido: 0 },
        { id: 3, nome: 'Creme', preco: 4, disponivel: true, totalPedido: 0 },
        { id: 3, nome: 'Abacaxi', preco: 2, disponivel: true, totalPedido: 0 },
        { id: 3, nome: 'Uva', preco: 5, disponivel: false, totalPedido: 0 },
        { id: 3, nome: 'Pipoca', preco: 4, disponivel: true, totalPedido: 0 }
    ]);


    pedido = signal<Sabor[]> ([]);

    adicionarAoPedido(sabor: Sabor){
        this.pedido.update(atual => [...atual, sabor]);
    }
}