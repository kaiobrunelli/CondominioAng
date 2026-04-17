import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { condominioGuard } from './guards/condominio.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./pages/auth/auth').then((m) => m.AuthPage),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./pages/onboarding/onboarding').then((m) => m.OnboardingPage),
  },
  {
    path: 'estudo',
    loadComponent: () =>
      import('./pages/estudo/estudo').then((m) => m.Estudo),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell').then((m) => m.ShellLayout),
    canActivate: [authGuard, condominioGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
        title: 'Dashboard – CondoGest',
      },
      {
        path: 'despesas',
        loadComponent: () =>
          import('./pages/despesas/despesas').then((m) => m.DespesasPage),
        title: 'Despesas – CondoGest',
      },
      {
        path: 'moradores',
        loadComponent: () =>
          import('./pages/moradores/moradores').then((m) => m.MoradoresPage),
        title: 'Moradores – CondoGest',
      },
      {
        path: 'relatorio',
        loadComponent: () =>
          import('./pages/relatorio/relatorio').then((m) => m.RelatorioPage),
        title: 'Relatório – CondoGest',
      },
      {
        path: 'agua',
        loadComponent: () =>
          import('./pages/agua/agua').then((m) => m.AguaPage),
        title: 'Leituras de Água – CondoGest',
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./pages/configuracoes/configuracoes').then((m) => m.ConfiguracoesPage),
        title: 'Configurações – CondoGest',
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
