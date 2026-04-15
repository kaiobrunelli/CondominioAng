import { Component, input, output, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
export interface Sabor {
  id: number;
  nome: string;
  preco: number;
  disponivel: boolean;
  totalPedido: number;
}

@Component({
  selector: 'app-card-sabor2',
  standalone: true,
  template: `

    <div class="border rounded-2xl p-4 flex flex-col gap-2 bg-white"
         [class.opacity-40]="!sabor().disponivel">

    <h3 class="text-slate-900 text-md font-semibold">{{ sabor().nome }}</h3>
    <h5 class="text-slate-500"> {{ sabor().preco }}</h5>

<div class="flex items-center gap-2">
  <button (click)="diminuir()" class="font-bold">−</button>
  <span class="font-bold">{{ quantidade() }}</span>
  <button (click)="aumentar()" class="font-bold">+</button>
</div>
<p> A quantidade total de : {{ quantidade() }}</p>
<p class="border-t font-semibold text-blue-600" >Subtotal: {{ precoFormatado() }}</p>
</div>

  `,
})
export class CardSaborComponent {
  sabor = input.required<Sabor>();
  quantidadeSsabores = input<number>();
  // signal LOCAL — o usuário controla dentro do card
  quantidade = signal(0);

  saborEscolhido = output<Sabor>();

  // computed faz sentido: depende de sabor() E quantidade()
  // recalcula sempre que qualquer um dos dois mudar
  precoFormatado = computed(() =>
    (this.sabor().preco * this.quantidade())
      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  );

  aumentar() { this.quantidade.update(q => q + 1); }
  diminuir() { this.quantidade.update(q => Math.max(0, q - 1)); }

  adicionar() {
    this.saborEscolhido.emit(this.sabor());
  }
}