import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">

      <div class="text-center mb-8">
        <div class="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span class="material-symbols-rounded text-white text-3xl" aria-hidden="true">apartment</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-900">GesCon - Gestão Condomínio</h1>
        <p class="text-slate-500 text-sm mt-1">Gestão inteligente de condomínios</p>
      </div>

      <div class="bg-white rounded-3xl shadow-lg p-8">
        <div class="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6" role="group" aria-label="Modo de acesso">
          <button
            type="button"
            (click)="modo.set('login')"
            [class]="modo() === 'login'
              ? 'flex-1 text-sm font-medium py-2 rounded-lg bg-white shadow text-slate-900 transition-all'
              : 'flex-1 text-sm font-medium py-2 rounded-lg text-slate-500 hover:text-slate-700 transition-all'"
            [attr.aria-pressed]="modo() === 'login'"
          >
            Entrar
          </button>
          <button
            type="button"
            (click)="modo.set('cadastro')"
            [class]="modo() === 'cadastro'
              ? 'flex-1 text-sm font-medium py-2 rounded-lg bg-white shadow text-slate-900 transition-all'
              : 'flex-1 text-sm font-medium py-2 rounded-lg text-slate-500 hover:text-slate-700 transition-all'"
            [attr.aria-pressed]="modo() === 'cadastro'"
          >
            Cadastrar
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submeter()" novalidate class="space-y-4">
          <div>
            <label for="a-email" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <input
              id="a-email"
              formControlName="email"
              type="email"
              placeholder="seu@email.com"
              class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              autocomplete="email"
              [attr.aria-required]="true"
            />
          </div>

          <div>
            <label for="a-senha" class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Senha
            </label>
            <input
              id="a-senha"
              formControlName="senha"
              type="password"
              placeholder="••••••••"
              class="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              [attr.autocomplete]="modo() === 'login' ? 'current-password' : 'new-password'"
              [attr.aria-required]="true"
            />
          </div>

          @if (erro()) {
            <p class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2" role="alert">
              {{ erro() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="form.invalid || carregando()"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 mt-2"
          >
            {{ carregando() ? 'Aguarde...' : (modo() === 'login' ? 'Entrar' : 'Criar conta') }}
          </button>
        </form>
      </div>
    </div>
  </div>
  `,
  styles: [],
})
export class AuthPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  constructor() {
    // Se já autenticado (ex: refresh na página), redireciona para dashboard
    effect(() => {
      if (!this.auth.loading() && this.auth.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  protected readonly modo = signal<'login' | 'cadastro'>('login');
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected async submeter(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.carregando.set(true);
    this.erro.set('');
    try {
      const { email, senha } = this.form.getRawValue();
      if (this.modo() === 'login') {
        await this.auth.signInWithEmail(email!, senha!);
      } else {
        await this.auth.signUpWithEmail(email!, senha!);
      }
      this.router.navigate(['/dashboard']);
    } catch (e: unknown) {
      this.erro.set(e instanceof Error ? e.message : 'Erro ao autenticar');
    } finally {
      this.carregando.set(false);
    }
  }
}