import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
<<<<<<< HEAD
import { AppComponent } from './app/app';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
=======
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
>>>>>>> fcb52f3f8f289efa620a2dd74173bc97e9793ef5
