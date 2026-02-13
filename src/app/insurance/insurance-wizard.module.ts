import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { WizardCoreModule } from '../wizard-core/wizard-core.module';
import { SharedFormsModule } from '../shared/shared-forms.module';
import { insuranceReducer } from './store/insurance.reducer';
import { InsuranceEffects } from './store/insurance.effects';

import { InsuranceWizardComponent } from './insurance-wizard.component';
import { ContratarPageComponent } from './contratar-page.component';
import { StepTitularCargasComponent } from './steps/step-titular-cargas/step-titular-cargas.component';
import { StepDpsComponent } from './steps/step-dps/step-dps.component';
import { StepCoberturaComponent } from './steps/step-cobertura/step-cobertura.component';
import { StepValidacionComponent } from './steps/step-validacion/step-validacion.component';
import { StepPagoComponent } from './steps/step-pago/step-pago.component';
import { StepResumenComponent } from './steps/step-resumen/step-resumen.component';
import { StepVehiculoComponent } from './steps/step-vehiculo/step-vehiculo.component';

@NgModule({
  declarations: [
    InsuranceWizardComponent,
    ContratarPageComponent,
    StepTitularCargasComponent,
    StepDpsComponent,
    StepCoberturaComponent,
    StepValidacionComponent,
    StepPagoComponent,
    StepResumenComponent,
    StepVehiculoComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    WizardCoreModule,
    SharedFormsModule,
    StoreModule.forFeature('insuranceWizard', insuranceReducer),
    EffectsModule.forFeature([InsuranceEffects]),
  ],
  exports: [InsuranceWizardComponent],
})
export class InsuranceWizardModule {}
