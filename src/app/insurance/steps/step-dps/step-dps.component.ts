import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { WizardStep } from '../../../wizard-core/interfaces';
import { DpsConfig } from '../../../shared/models/shared.models';
import { selectDpsConfig, selectDpsRespuestas } from '../../store/insurance.selectors';
import { saveDpsRespuestas } from '../../store/insurance.actions';

@Component({
  selector: 'app-step-dps',
  templateUrl: './step-dps.component.html',
})
export class StepDpsComponent implements WizardStep, OnInit, OnDestroy {
  dpsConfig: DpsConfig | null = null;
  dpsForm!: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(private store: Store, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.store.select(selectDpsConfig).pipe(take(1)).subscribe((config) => {
      this.dpsConfig = config;
      if (config) {
        const group: Record<string, any> = {};
        for (const p of config.preguntas) { group[p.id] = ['', p.requerida ? [Validators.required] : []]; }
        this.dpsForm = this.fb.group(group);
        this.store.select(selectDpsRespuestas).pipe(take(1)).subscribe((resp) => {
          if (resp && Object.keys(resp).length) { this.dpsForm.patchValue(resp); }
        });
      }
    });
  }

  saveToStore(): void { if (this.dpsForm) { this.store.dispatch(saveDpsRespuestas({ respuestas: this.dpsForm.value })); } }

  isValid(): boolean {
    if (!this.dpsForm || !this.dpsConfig) { return false; }
    this.dpsForm.markAllAsTouched();
    for (const p of this.dpsConfig.preguntas) {
      if (p.dependeDe && this.dpsForm.get(p.dependeDe)?.value !== p.dependeValor) { continue; }
      if (this.dpsForm.get(p.id)?.invalid) { return false; }
    }
    return true;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
