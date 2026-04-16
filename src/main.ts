import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

// Registra locale pt-BR: milhar com ponto, decimal com vírgula (ex: 1.234,56)
registerLocaleData(localePtBr, 'pt-BR');

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);

