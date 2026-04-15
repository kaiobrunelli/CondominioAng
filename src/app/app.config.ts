
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './services/auth.service';
import { CondominioService } from './services/condominio.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),

    // 1) Aguarda o AuthService resolver a sessão antes de qualquer rota ser avaliada
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return auth.ready;
    }),

    // 2) Após auth resolver, carrega o condomínio ativo
    provideAppInitializer(async () => {
      const auth = inject(AuthService);
      const condominioSvc = inject(CondominioService);
      await auth.ready;
      try { await condominioSvc.carregar(); } catch { /* silencia erro de rede */ }
    }),
  ],
}
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]

};
