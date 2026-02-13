import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperBarComponent } from './components/stepper-bar/stepper-bar.component';
import { WizardContainerComponent } from './components/wizard-container/wizard-container.component';

@NgModule({
  declarations: [StepperBarComponent, WizardContainerComponent],
  imports: [CommonModule],
  exports: [StepperBarComponent, WizardContainerComponent],
})
export class WizardCoreModule {}
