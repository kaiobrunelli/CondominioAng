import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CondominioService } from '../../services/condominio.service';
import type { Condominio } from '../../models/types';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen bg-slate-50 overflow-hidden">

      <!-- Sidebar -->
      <aside
        id="sidebar"
        class="flex flex-col w-64 bg-white border-r border-slate-100 shrink-0 shadow-card"
        [class.hidden]="!sidebarOpen()"
        aria-label="Navegação principal"
      >
        <!-- Logo -->
        <div class="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div
            class="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <span class="material-symbols-rounded text-white text-xl">apartment</span>
          </div>
          <div class="min-w-0">
            <span class="font-display text-lg font-semibold text-slate-900 leading-tight block">
              CondoGest
            </span>
            <p class="text-xs text-slate-400 leading-tight truncate">
              {{ condominioSvc.ativo()?.nome ?? 'Selecionar...' }}
            </p>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Menu principal">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary-50 text-primary-700"
              [routerLinkActiveOptions]="{ exact: item.path === 'dashboard' }"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span class="material-symbols-rounded text-[20px]" aria-hidden="true">{{ item.icon }}</span>
              <span class="text-sm font-medium">{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- Seletor de condomínio -->
        @if (condominioSvc.condominios().length > 1) {
          <div class="px-3 pb-3">
            <div class="rounded-xl bg-slate-50 p-3">
              <label
                for="condo-select"
                class="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider"
              >
                Condomínio
              </label>
              <select
                id="condo-select"
                class="w-full text-sm bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                (change)="mudarCondominio($event)"
              >
                @for (condo of condominioSvc.condominios(); track condo.id) {
                  <option
                    [value]="condo.id"
                    [selected]="condo.id === condominioSvc.ativo()?.id"
                  >{{ condo.nome }}</option>
                }
              </select>
            </div>
          </div>
        }

        <!-- Usuário -->
        <div class="px-3 pb-4">
          <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 group">
            <div
              class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm shrink-0"
              aria-hidden="true"
            >
              {{ userInitials() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">{{ userEmail() }}</p>
              <p class="text-xs text-slate-400">Síndico</p>
            </div>
            <button
              (click)="auth.signOut()"
              class="opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded p-0.5"
              aria-label="Sair da conta"
              type="button"
            >
              <span class="material-symbols-rounded text-slate-400 text-[18px]" aria-hidden="true">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <header class="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
          <button
            type="button"
            (click)="sidebarOpen.set(!sidebarOpen())"
            class="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            [attr.aria-expanded]="sidebarOpen()"
            aria-controls="sidebar"
            aria-label="Alternar menu lateral"
          >
            <span class="material-symbols-rounded text-slate-600" aria-hidden="true">menu</span>
          </button>
          <span class="font-display font-semibold text-slate-800">CondoGest</span>
        </header>

        <main class="flex-1 overflow-y-auto" id="main-content" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellLayout {
  protected readonly auth = inject(AuthService);
  protected readonly condominioSvc = inject(CondominioService);

  protected readonly sidebarOpen = signal(true);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard',     path: 'dashboard',     icon: 'space_dashboard' },
    { label: 'Despesas',      path: 'despesas',      icon: 'receipt_long'    },
    { label: 'Moradores',     path: 'moradores',     icon: 'groups'          },
    { label: 'Rateio',        path: 'rateio',        icon: 'calculate'       },
    { label: 'Relatório',     path: 'relatorio',     icon: 'bar_chart'       },
    { label: 'Configurações', path: 'configuracoes', icon: 'settings'        },
  ];

  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  protected readonly userInitials = computed(() =>
    (this.auth.user()?.email ?? '').substring(0, 2).toUpperCase(),
  );

  protected mudarCondominio(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const condo = this.condominioSvc.condominios().find((c: Condominio) => c.id === id);
    if (condo) this.condominioSvc.setAtivo(condo);
  }
}
