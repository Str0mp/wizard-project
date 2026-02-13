import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { WizardStep } from '../../../wizard-core/interfaces';
import { saveCobertura } from '../../store/insurance.actions';

@Component({
  selector: 'app-step-cobertura',
  templateUrl: './step-cobertura.component.html',
})
export class StepCoberturaComponent implements WizardStep {
  constructor(private store: Store) {}
  saveToStore(): void { this.store.dispatch(saveCobertura({ cobertura: {} })); }
  isValid(): boolean { return true; }
}
