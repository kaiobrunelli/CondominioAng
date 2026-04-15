import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    try {
      this.client = createClient(
        environment.supabaseUrl,
        environment.supabaseKey,
      );
    } catch (err) {
      console.error('[SupabaseService] Falha ao inicializar cliente:', err);
      // Cria client com valores dummy para não travar o bootstrap
      // O app irá mostrar a tela de auth normalmente
      this.client = createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
  }
}
