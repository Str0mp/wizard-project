import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';

import { WizardStep } from '../../../wizard-core/interfaces';
import { DpsConfig } from '../../../shared/models/shared.models';
import { DpsFormFactory } from '../../../shared/services/dps-form.factory';
import { selectDpsConfig, selectDpsRespuestas } from '../../store/insurance.selectors';
import { saveDpsRespuestas } from '../../store/insurance.actions';

@Component({
  selector: 'app-step-dps',
  templateUrl: './step-dps.component.html',
})
export class StepDpsComponent implements WizardStep, OnInit {
  dpsConfig: DpsConfig | null = null;
  dpsForm!: FormGroup;

  constructor(private store: Store, private dpsFormFactory: DpsFormFactory) {}

  ngOnInit(): void {
    this.store.select(selectDpsConfig).pipe(take(1)).subscribe((config) => {
      this.dpsConfig = config;
      if (config) {
        this.dpsForm = this.dpsFormFactory.createDpsFormGroup(config.preguntas);
        this.store.select(selectDpsRespuestas).pipe(take(1)).subscribe((resp) => {
          if (resp && Object.keys(resp).length) { this.dpsForm.patchValue(resp); }
        });
      }
    });
  }

  saveToStore(): void {
    if (this.dpsForm) { this.store.dispatch(saveDpsRespuestas({ respuestas: this.dpsForm.value })); }
  }

  isValid(): boolean {
    if (!this.dpsForm || !this.dpsConfig) { return false; }
    this.dpsForm.markAllAsTouched();
    for (const p of this.dpsConfig.preguntas) {
      if (p.dependeDe && this.dpsForm.get(p.dependeDe)?.value !== p.dependeValor) { continue; }
      if (this.dpsForm.get(p.id)?.invalid) { return false; }
    }
    return true;
  }
}
