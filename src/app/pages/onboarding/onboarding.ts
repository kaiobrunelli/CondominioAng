import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CondominioService } from '../../services/condominio.service';

@Component({
  selector: 'app-onboarding',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; appearance: textfield; }
  `],
  template: `
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">

      <div class="text-center mb-8">
        <div class="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span class="material-symbols-rounded text-white text-3xl" aria-hidden="true">apartment</span>
        </div>
        <h1 class="font-display text-2xl font-bold text-slate-900">Bem-vindo ao CondoGest!</h1>
        <p class="text-slate-500 text-sm mt-1">Cadastre seu primeiro condomínio para começar</p>
      </div>

      <div class="bg-white rounded-3xl shadow-modal p-8">
        <form [formGroup]="form" (ngSubmit)="criar()" novalidate class="space-y-4">

          <div>
            <label for="o-nome" class="label">Nome do Condomínio <span aria-hidden="true">*</span></label>
            <input
              id="o-nome"
              formControlName="nome"
              placeholder="Ex: Edifício Aurora"
              class="input-field"
              [attr.aria-required]="true"
              [attr.aria-invalid]="form.get('nome')?.invalid && form.get('nome')?.touched"
            />
          </div>

          <div>
            <label for="o-endereco" class="label">Endereço</label>
            <input
              id="o-endereco"
              formControlName="endereco"
              placeholder="Rua, número, cidade"
              class="input-field"
              autocomplete="street-address"
            />
          </div>

          <div>
            <label for="o-taxa" class="label">Taxa Mensal do Condomínio (R$)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">R$</span>
              <input
                id="o-taxa"
                formControlName="valor_condominio"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                class="input-field pl-9"
                aria-describedby="o-taxa-desc"
              />
            </div>
            <p id="o-taxa-desc" class="text-xs text-slate-400 mt-1">
              Valor fixo cobrado mensalmente de todos os moradores. Pode ser alterado depois em Configurações.
            </p>
          </div>

          @if (erro()) {
            <p class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2" role="alert">
              {{ erro() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="form.invalid || criando()"
            class="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {{ criando() ? 'Criando...' : 'Criar Condomínio' }}
          </button>
        </form>
      </div>
    </div>
  </div>
  `,

})
export class OnboardingPage {
  private readonly condominioSvc = inject(CondominioService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly criando = signal(false);
  protected readonly erro = signal('');

  protected readonly form = this.fb.group({
    nome:             ['', Validators.required],
    endereco:         [''],
    valor_condominio: [0, [Validators.required, Validators.min(0)]],
  });

  protected async criar(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.criando.set(true);
    this.erro.set('');
    try {
      const raw = this.form.getRawValue();
      await this.condominioSvc.criar({
        nome:             raw.nome!,
        endereco:         raw.endereco ?? undefined,
        valor_condominio: Number(raw.valor_condominio ?? 0),
      });
      this.router.navigate(['/dashboard']);
    } catch (e: unknown) {
      this.erro.set(e instanceof Error ? e.message : 'Erro ao criar condomínio');
    } finally {
      this.criando.set(false);
    }
  }
}
