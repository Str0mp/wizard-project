import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WizardStep } from '../../../wizard-core/interfaces';
import { selectInsuranceWizard } from '../../store/insurance.selectors';
import { InsuranceWizardState } from '../../models/insurance.models';

@Component({
  selector: 'app-step-resumen',
  templateUrl: './step-resumen.component.html',
})
export class StepResumenComponent implements WizardStep, OnInit, OnDestroy {
  state: InsuranceWizardState | null = null;
  private destroy$ = new Subject<void>();
  constructor(private store: Store) {}
  ngOnInit(): void {
    this.store.select(selectInsuranceWizard).pipe(takeUntil(this.destroy$)).subscribe((s) => this.state = s);
  }
  saveToStore(): void {}
  isValid(): boolean { return true; }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
