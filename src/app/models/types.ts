export interface Condominio {
  id: string;
  nome: string;
  endereco?: string;
  cnpj?: string;
  codigo: string;
  percentual_cobertura: number;
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

export interface Rateio {
  id: string;
  condominio_id: string;
  mes_referencia: string;
  morador_id: string;
  valor_base: number;
  valor_adicional: number;
  valor_total: number;
  status_pagamento: 'pendente' | 'pago' | 'atrasado';
  data_pagamento?: string;
  calculado_em?: string;
  // joined
  moradores?: Pick<Morador, 'nome' | 'unidade' | 'tipo'>;
}

export interface RateioCalculo {
  morador: Morador;
  valorBase: number;
  valorAdicional: number;
  valorTotal: number;
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
  despesas_pagas: number;
  despesas_pendentes: number;
  despesas_atrasadas: number;
}
