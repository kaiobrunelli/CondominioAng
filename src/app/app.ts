<<<<<<< HEAD
import { ChangeDetectionStrategy, Component } from '@angular/core';
=======
import { Component, signal } from '@angular/core';
>>>>>>> fcb52f3f8f289efa620a2dd74173bc97e9793ef5
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
<<<<<<< HEAD
  template: `<router-outlet />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
=======
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('CondominioAng');
}
>>>>>>> fcb52f3f8f289efa620a2dd74173bc97e9793ef5
