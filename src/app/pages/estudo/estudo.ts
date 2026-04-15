import { Component, signal } from '@angular/core';
import { SaborItemComponent } from "./sabor-item.component";

import { CardapioComponent } from "./cardapio";
import { CadapioSabores2 } from './cardapio2';
import { Sabor } from './sabor-item-component2';


@Component({
  selector: 'app-estudo',
  imports: [SaborItemComponent,  CardapioComponent, CadapioSabores2],
  templateUrl: './estudo.html',
  styleUrl: './estudo.css',
})
export class Estudo {
  contador = signal(0);
  contador2 = signal(0);
  adicionarAoCopinho(sabor: string) {
    console.log(`Adicionado ao copinho: ${sabor}`);
    this.contador.update((c) => c + 1);
  }
  adicionarAoCopinho2(id: number, nome: string) {
    console.log(`Adicionado ao copinho: ${id} - ${nome}`);
    this.contador2.update((c) => c + 1);


  }
}