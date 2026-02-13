import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InsuranceWizardModule } from './insurance/insurance-wizard.module';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,

    // NgRx root — el feature store se registra dentro de InsuranceWizardModule
    StoreModule.forRoot({}),
    EffectsModule.forRoot([]),
    !environment.production ? StoreDevtoolsModule.instrument({ maxAge: 25 }) : [],

    // Módulo del wizard de seguros
    InsuranceWizardModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
