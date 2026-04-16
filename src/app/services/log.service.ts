import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CondominioService } from './condominio.service';
import { AuthService } from './auth.service';

export type LogAcao =
  | 'CRIAR'
  | 'ATUALIZAR'
  | 'REMOVER'
  | 'PAGAR'
  | 'STATUS'
  | 'LANCAMENTO'
  | 'LEITURA_AGUA';

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly supabase    = inject(SupabaseService);
  private readonly condSvc     = inject(CondominioService);
  private readonly authSvc     = inject(AuthService);

  /** Registra um evento no log_sistema.
   *  Falha silenciosa — nunca interrompe o fluxo principal. */
  async registrar(params: {
    tabela: string;
    acao: LogAcao;
    descricao: string;
    registro_id?: string;
    dados_anteriores?: Record<string, unknown>;
    dados_novos?: Record<string, unknown>;
  }): Promise<void> {
    const condominioId = this.condSvc.ativo()?.id;
    if (!condominioId) return;

    try {
      await this.supabase.client.from('logs_sistema').insert({
        condominio_id:    condominioId,
        usuario_id:       this.authSvc.user()?.id ?? null,
        tabela:           params.tabela,
        acao:             params.acao,
        descricao:        params.descricao,
        registro_id:      params.registro_id ?? null,
        dados_anteriores: params.dados_anteriores ?? null,
        dados_novos:      params.dados_novos ?? null,
      });
    } catch {
      // Logs nunca devem interromper o fluxo
    }
  }
}
