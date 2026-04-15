import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// APP_INITIALIZER em app.config.ts garante que auth.ready já resolveu
// quando qualquer rota é avaliada — guard pode ser síncrono
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? true : router.createUrlTree(['/auth']);
};
