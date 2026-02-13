import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { WizardStep } from '../../../wizard-core/interfaces';
import { savePago } from '../../store/insurance.actions';

@Component({
  selector: 'app-step-pago',
  templateUrl: './step-pago.component.html',
})
export class StepPagoComponent implements WizardStep {
  constructor(private store: Store) {}
  saveToStore(): void { this.store.dispatch(savePago({ pago: {} })); }
  isValid(): boolean { return true; }
}
