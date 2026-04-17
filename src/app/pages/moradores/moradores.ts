import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MoradoresService } from '../../services/moradores.service';
import type { Morador } from '../../models/types';

@Component({
  selector: 'app-moradores',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-semibold text-slate-900">Moradores</h1>
        <p class="text-slate-500 text-sm mt-0.5" aria-live="polite">
          {{ svc.moradores().length }} cadastrados ·
          {{ qtdCobertura() }} cobertura · {{ qtdNormal() }} normal
        </p>
      </div>
      <button
        type="button"
        (click)="abrirModal()"
        class="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span class="material-symbols-rounded text-[18px]" aria-hidden="true">person_add</span>
        Novo Morador
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4" role="list" aria-label="Resumo de moradores">
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center" role="listitem">
        <p class="text-3xl font-display font-bold text-slate-900">{{ svc.moradores().length }}</p>
        <p class="text-sm text-slate-500 mt-1">Total de Moradores</p>
      </article>
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center" role="listitem">
        <p class="text-3xl font-display font-bold text-primary-600">{{ qtdNormal() }}</p>
        <p class="text-sm text-slate-500 mt-1">Unidades Normais</p>
      </article>
      <article class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-center col-span-2 sm:col-span-1" role="listitem">
        <p class="text-3xl font-display font-bold text-amber-600">{{ qtdCobertura() }}</p>
        <p class="text-sm text-slate-500 mt-1">Coberturas</p>
      </article>
    </div>

    <!-- Lista -->
    @if (svc.loading()) {
      <p class="text-center py-12 text-slate-400 text-sm" aria-live="polite">Carregando...</p>
    } @else if (svc.moradores().length === 0) {
      <div class="text-center py-16">
        <span class="material-symbols-rounded text-5xl text-slate-200 block mb-3" aria-hidden="true">groups</span>
        <p class="text-slate-400 text-sm mb-4">Nenhum morador cadastrado</p>
        <button
          type="button"
          (click)="abrirModal()"
          class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Cadastrar primeiro morador
        </button>
      </div>
    } @else {
      <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Lista de moradores">
        @for (m of svc.moradores(); track m.id) {
          <li class="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex flex-col gap-4 hover:shadow-card-hover transition-shadow">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                  [class]="m.tipo === 'cobertura'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-primary-100 text-primary-700'"
                  aria-hidden="true"
                >
                  {{ initials(m.nome) }}
                </div>
                <div>
                  <p class="font-semibold text-slate-800 text-sm">{{ m.nome }}</p>
                  <p class="text-xs text-slate-500">{{ m.unidade }}</p>
                </div>
              </div>
              <span
                [class]="m.tipo === 'cobertura'
                  ? 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'
                  : 'text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700'"
              >
                {{ m.tipo === 'cobertura' ? 'Cobertura' : 'Normal' }}
              </span>
            </div>

            @if (m.email || m.telefone) {
              <dl class="space-y-1 border-t border-slate-50 pt-3">
                @if (m.email) {
                  <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span class="material-symbols-rounded text-[14px]" aria-hidden="true">mail</span>
                    <dt class="sr-only">E-mail</dt>
                    <dd>{{ m.email }}</dd>
                  </div>
                }
                @if (m.telefone) {
                  <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span class="material-symbols-rounded text-[14px]" aria-hidden="true">phone</span>
                    <dt class="sr-only">Telefone</dt>
                    <dd>{{ m.telefone }}</dd>
                  </div>
                }
              </dl>
            }

            <div class="flex gap-2 mt-auto">
              <button
                type="button"
                (click)="abrirModal(m)"
                class="flex-1 text-xs font-medium py-1.5 rounded-lg bg-slate-100 hover:bg-primary-50 hover:text-primary-700 transition-colors flex items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                [attr.aria-label]="'Editar ' + m.nome"
              >
                <span class="material-symbols-rounded text-[14px]" aria-hidden="true">edit</span>
                Editar
              </button>
              <button
                type="button"
                (click)="remover(m)"
                class="text-xs font-medium py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                [attr.aria-label]="'Remover ' + m.nome"
              >
                <span class="material-symbols-rounded text-[14px]" aria-hidden="true">delete</span>
              </button>
            </div>
          </li>
        }
      </ul>
    }
  </div>

  <!-- Modal -->
  @if (modalAberto()) {
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      [attr.aria-modal]="true"
      aria-labelledby="modal-morador-title"
      (keydown.escape)="fecharModal()"
    >
      <div
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        (click)="fecharModal()"
        aria-hidden="true"
      ></div>
      <div
        class="relative bg-white rounded-3xl shadow-modal w-full max-w-md animate-scale-in"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 id="modal-morador-title" class="font-display font-semibold text-slate-900">
            {{ editando() ? 'Editar Morador' : 'Novo Morador' }}
          </h2>
          <button
            type="button"
            (click)="fecharModal()"
            class="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Fechar modal"
          >
            <span class="material-symbols-rounded text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="salvar()" novalidate class="p-6 space-y-4">

          <div>
            <label for="m-nome" class="label">Nome <span aria-hidden="true">*</span></label>
            <input
              id="m-nome"
              formControlName="nome"
              placeholder="Nome completo"
              class="input-field"
              autocomplete="name"
              [attr.aria-required]="true"
              [attr.aria-invalid]="form.get('nome')?.invalid && form.get('nome')?.touched"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="m-unidade" class="label">Unidade <span aria-hidden="true">*</span></label>
              <input
                id="m-unidade"
                formControlName="unidade"
                placeholder="Ex: Apto 101"
                class="input-field"
                [attr.aria-required]="true"
              />
            </div>
            <div>
              <label for="m-tipo" class="label">Tipo <span aria-hidden="true">*</span></label>
              <select id="m-tipo" formControlName="tipo" class="input-field">
                <option value="normal">Normal</option>
                <option value="cobertura">Cobertura</option>
              </select>
            </div>
          </div>

          <div>
            <label for="m-email" class="label">E-mail</label>
            <input
              id="m-email"
              formControlName="email"
              type="email"
              placeholder="email@exemplo.com"
              class="input-field"
              autocomplete="email"
            />
          </div>

          <div>
            <label for="m-tel" class="label">Telefone</label>
            <input
              id="m-tel"
              formControlName="telefone"
              type="tel"
              placeholder="(11) 99999-9999"
              class="input-field"
              autocomplete="tel"
            />
          </div>


          <div class="flex gap-3 pt-2">
            <button
              type="button"
              (click)="fecharModal()"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || salvando()"
              class="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {{ salvando() ? 'Salvando...' : (editando() ? 'Atualizar' : 'Cadastrar') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  }
  `,
  
})
export class MoradoresPage implements OnInit {
  protected readonly svc = inject(MoradoresService);
  private readonly fb = inject(FormBuilder);

  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<Morador | null>(null);
  protected readonly salvando = signal(false);

  protected readonly qtdCobertura = computed(() =>
    this.svc.moradores().filter((m) => m.tipo === 'cobertura').length,
  );
  protected readonly qtdNormal = computed(() =>
    this.svc.moradores().filter((m) => m.tipo === 'normal').length,
  );

  protected readonly form = this.fb.group({
    nome:     ['', Validators.required],
    unidade:  ['', Validators.required],
    tipo:     ['normal', Validators.required],
    email:    ['', Validators.email],
    telefone: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.svc.carregar();
  }

  protected initials(nome: string): string {
    return nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }

  protected abrirModal(m?: Morador): void {
    this.editando.set(m ?? null);
    this.form.reset({
      nome: m?.nome ?? '',
      unidade: m?.unidade ?? '',
      tipo: m?.tipo ?? 'normal',
      email: m?.email ?? '',
      telefone: m?.telefone ?? '',
    });
    this.modalAberto.set(true);
  }

  protected fecharModal(): void {
    this.modalAberto.set(false);
    this.editando.set(null);
    this.form.reset();
  }

  protected async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const raw = this.form.getRawValue();
      const payload = {
        nome:     raw.nome!,
        unidade:  raw.unidade!,
        tipo:     (raw.tipo ?? 'normal') as Morador['tipo'],
        email:    raw.email ?? undefined,
        telefone: raw.telefone ?? undefined,
        ativo:    true,
      };

      if (this.editando()) {
        await this.svc.atualizar(this.editando()!.id, payload);
      } else {
        await this.svc.criar(payload);
      }
      this.fecharModal();
    } finally {
      this.salvando.set(false);
    }
  }

  protected async remover(m: Morador): Promise<void> {
    if (!confirm(`Remover "${m.nome}" (${m.unidade})?`)) return;
    await this.svc.remover(m.id);
  }
}
