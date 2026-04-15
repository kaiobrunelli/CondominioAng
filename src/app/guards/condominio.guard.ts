import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CondominioService } from '../services/condominio.service';

// APP_INITIALIZER já tentou carregar, mas se o usuário acabou de fazer login
// os condomínios ainda podem estar vazios — tenta novamente antes de redirecionar.
export const condominioGuard: CanActivateFn = async () => {
  const condominioSvc = inject(CondominioService);
  const router        = inject(Router);

  if (condominioSvc.condominios().length === 0) {
    try { await condominioSvc.carregar(); } catch { /* ignora erro de rede */ }
  }

  if (condominioSvc.condominios().length === 0) {
    return router.createUrlTree(['/onboarding']);
  }

  return true;
};
