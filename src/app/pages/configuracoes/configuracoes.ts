import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CondominioService } from '../../services/condominio.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-configuracoes',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">

    <div>
      <h1 class="font-display text-2xl font-semibold text-slate-900">Configurações</h1>
      <p class="text-slate-500 text-sm mt-0.5">Dados e preferências do condomínio</p>
    </div>

    <!-- Info code -->
    <div class="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex items-center gap-3" role="note">
      <span class="material-symbols-rounded text-primary-500 text-[20px] shrink-0" aria-hidden="true">key</span>
      <div>
        <p class="text-sm font-semibold text-primary-800">Código de Acesso</p>
        <p class="text-xs text-primary-600 mt-0.5">
          Compartilhe este código com outros síndicos:
          <strong class="font-mono ml-1">{{ condominioSvc.ativo()?.codigo }}</strong>
        </p>
      </div>
    </div>

    <!-- Form -->
    <section class="bg-white rounded-2xl border border-slate-100 shadow-card p-6" aria-labelledby="config-title">
      <h2 id="config-title" class="font-semibold text-slate-800 mb-5">Dados do Condomínio</h2>

      <form [formGroup]="form" (ngSubmit)="salvar()" novalidate class="space-y-4">

        <div>
          <label for="c-nome" class="label">Nome do Condomínio <span aria-hidden="true">*</span></label>
          <input
            id="c-nome"
            formControlName="nome"
            placeholder="Ex: Edifício Aurora"
            class="input-field"
            [attr.aria-required]="true"
            [attr.aria-invalid]="form.get('nome')?.invalid && form.get('nome')?.touched"
          />
        </div>

        <div>
          <label for="c-endereco" class="label">Endereço</label>
          <input
            id="c-endereco"
            formControlName="endereco"
            placeholder="Rua, número, cidade"
            class="input-field"
            autocomplete="street-address"
          />
        </div>

        <div>
          <label for="c-cnpj" class="label">CNPJ</label>
          <input
            id="c-cnpj"
            formControlName="cnpj"
            placeholder="00.000.000/0000-00"
            class="input-field"
          />
        </div>

        <div>
          <label for="c-pct" class="label">
            Percentual extra para Cobertura (%)
            <span aria-hidden="true">*</span>
          </label>
          <input
            id="c-pct"
            formControlName="percentual_cobertura"
            type="number"
            min="0"
            max="100"
            step="0.5"
            class="input-field"
            aria-describedby="c-pct-hint"
            [attr.aria-required]="true"
          />
          <p id="c-pct-hint" class="text-xs text-slate-400 mt-1">
            Percentual adicional que moradores de cobertura pagam sobre a cota normal.
            Exemplo: 20 = cobertura paga 20% a mais que uma unidade normal.
          </p>
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="submit"
            [disabled]="form.invalid || salvando() || form.pristine"
            class="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {{ salvando() ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </div>

        @if (sucesso()) {
          <p class="text-sm text-emerald-600 flex items-center gap-1" role="status" aria-live="polite">
            <span class="material-symbols-rounded text-[16px]" aria-hidden="true">check_circle</span>
            Configurações salvas com sucesso!
          </p>
        }
      </form>
    </section>

    <!-- Conta -->
    <section class="bg-white rounded-2xl border border-slate-100 shadow-card p-6" aria-labelledby="conta-title">
      <h2 id="conta-title" class="font-semibold text-slate-800 mb-4">Conta</h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-slate-700">{{ authSvc.user()?.email }}</p>
          <p class="text-xs text-slate-400 mt-0.5">Síndico administrador</p>
        </div>
        <button
          type="button"
          (click)="authSvc.signOut()"
          class="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 hover:border-red-300 px-3 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <span class="material-symbols-rounded text-[16px]" aria-hidden="true">logout</span>
          Sair
        </button>
      </div>
    </section>

  </div>
  `,

})
export class ConfiguracoesPage implements OnInit {
  protected readonly condominioSvc = inject(CondominioService);
  protected readonly authSvc = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly salvando = signal(false);
  protected readonly sucesso = signal(false);

  protected readonly form = this.fb.group({
    nome:                  ['', Validators.required],
    endereco:              [''],
    cnpj:                  [''],
    percentual_cobertura:  [20, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  ngOnInit(): void {
    const condo = this.condominioSvc.ativo();
    if (condo) {
      this.form.patchValue({
        nome: condo.nome,
        endereco: condo.endereco ?? '',
        cnpj: condo.cnpj ?? '',
        percentual_cobertura: condo.percentual_cobertura,
      });
    }
  }

  protected async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.condominioSvc.ativo()?.id;
    if (!id) return;

    this.salvando.set(true);
    this.sucesso.set(false);
    try {
      const raw = this.form.getRawValue();
      await this.condominioSvc.atualizar(id, {
        nome: raw.nome!,
        endereco: raw.endereco ?? undefined,
        cnpj: raw.cnpj ?? undefined,
        percentual_cobertura: Number(raw.percentual_cobertura),
      });
      this.form.markAsPristine();
      this.sucesso.set(true);
      setTimeout(() => this.sucesso.set(false), 3000);
    } finally {
      this.salvando.set(false);
    }
  }
}
