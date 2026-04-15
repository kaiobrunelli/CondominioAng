import { Component, input, output } from "@angular/core";

@Component({
    selector: 'app-sabor-item',
    template: `<button  (click)="selecionar()">Escolher {{ nome() }}</button>`
})

export class SaborItemComponent {
    nome = input.required<string>();
    saborEscolhido = output<string>();
    selecionar() {
        this.saborEscolhido.emit(this.nome());
    }
}