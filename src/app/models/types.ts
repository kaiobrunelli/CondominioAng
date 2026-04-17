export interface Condominio {
  id: string;
  nome: string;
  endereco?: string;
  cnpj?: string;
  codigo: string;
  valor_condominio: number;   // taxa mensal fixa (R$)
  created_at?: string;
  updated_at?: string;
  // joined
  usuarios_condominios?: { role: string }[];
}

export interface Morador {
  id: string;
  condominio_id: string;
  nome: string;
  unidade: string;
  tipo: 'normal' | 'cobertura';
  email?: string;
  telefone?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CategoriaDespesa {
  id: string;
  condominio_id: string;
  nome: string;
  icone: string;
  cor: string;
}

export interface Despesa {
  id: string;
  condominio_id: string;
  categoria_id?: string;
  descricao: string;
  valor: number;
  mes_referencia: string; // YYYY-MM
  data_vencimento: string;
  status: 'pendente' | 'pago' | 'atrasado';
  observacao?: string;
  created_at?: string;
  updated_at?: string;
  // joined
  categorias_despesa?: Pick<CategoriaDespesa, 'nome' | 'icone' | 'cor'>;
}


export interface ConfigAgua {
  id: string;
  condominio_id: string;
  valor_por_litro: number;
  updated_at?: string;
}

export interface LeituraAgua {
  id: string;
  condominio_id: string;
  morador_id: string;
  mes_referencia: string;   // YYYY-MM — mês da leitura
  mes_vencimento: string;   // YYYY-MM — mês do vencimento da cobrança
  leitura_atual: number;
  leitura_anterior: number;
  consumo_litros: number;
  valor_unitario: number;
  valor_total: number;
  despesa_id?: string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
  // joined
  moradores?: Pick<Morador, 'nome' | 'unidade' | 'tipo'>;
}

export interface RelatorioMensal {
  condominio_id: string;
  mes_referencia: string;
  total_despesas: number;
  total_receitas: number;
  saldo: number;
  qtd_despesas: number;
  qtd_pagamentos: number;
  despesas_pagas: number;
  despesas_pendentes: number;
  despesas_atrasadas: number;
}

export type FormaPagamento = 'dinheiro' | 'pix' | 'transferencia' | 'boleto' | 'cheque' | 'cartao';

export interface Pagamento {
  id: string;
  condominio_id: string;
  despesa_id?: string;
  morador_id?: string;
  valor: number;
  data_pagamento: string;        // DATE ISO
  mes_referencia: string;        // YYYY-MM
  forma_pagamento: FormaPagamento;
  descricao?: string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
  // joined
  despesas?: Pick<Despesa, 'descricao' | 'valor'>;
  moradores?: Pick<Morador, 'nome' | 'unidade'>;
}

export interface LogSistema {
  id: string;
  condominio_id?: string;
  usuario_id?: string;
  tabela: string;
  acao: string;
  registro_id?: string;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  descricao: string;
  created_at?: string;
}

/** Item unificado para o ledger financeiro (despesa ou pagamento) */
export interface LancamentoLedger {
  id: string;
  tipo: 'despesa' | 'pagamento';
  data: string;
  descricao: string;
  categoria?: string;
  categoriaIcone?: string;
  categoriaCor?: string;
  valor: number;
  status?: Despesa['status'];
  forma_pagamento?: FormaPagamento;
  saldoAcumulado?: number;
  mes_referencia: string;
}

/** Saldo financeiro global (todos os meses) do condomínio */
export interface SaldoGlobal {
  condominio_id: string;
  total_recebido: number;
  total_despesas: number;
  total_pago: number;
  total_em_aberto: number;
  total_atrasado: number;
  saldo_caixa: number;   // recebido - pago efetivo
  saldo_geral: number;   // recebido - todas as despesas
}
