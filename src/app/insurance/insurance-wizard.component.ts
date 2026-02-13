import { Component, OnChanges, OnDestroy, ViewChild, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';

import { WizardStep } from '../wizard-core/interfaces';
import { INSURANCE_PRODUCTS } from './config/insurance-products.config';
import { InsuranceStepConfig } from './models/insurance.models';
import {
  selectStepsConfig, selectCurrentStep, selectCurrentStepConfig,
  selectIsFirstStep, selectIsLastStep,
} from './store/insurance.selectors';
import {
  initWizard, nextStep, prevStep, setStep, loadParentescos, resetWizard,
} from './store/insurance.actions';

@Component({
  selector: 'app-insurance-wizard',
  templateUrl: './insurance-wizard.component.html',
})
export class InsuranceWizardComponent implements OnChanges, OnDestroy {
  @Input() productoId!: string;

  // ── Observables del store (consumidos con | async en el template) ──
  stepsConfig$: Observable<InsuranceStepConfig[]> = this.store.select(selectStepsConfig);
  currentStep$: Observable<number> = this.store.select(selectCurrentStep);
  currentStepConfig$: Observable<InsuranceStepConfig | null> = this.store.select(selectCurrentStepConfig);
  isFirstStep$: Observable<boolean> = this.store.select(selectIsFirstStep);
  isLastStep$: Observable<boolean> = this.store.select(selectIsLastStep);

  // ── ViewChild del step activo (solo se usa en event handlers, nunca en bindings) ──
  @ViewChild('step') set stepRef(ref: WizardStep) { if (ref) { this._activeStepRef = ref; } }
  private _activeStepRef: WizardStep | null = null;

  private destroy$ = new Subject<void>();
  private currentProductoId: string | null = null;

  constructor(private store: Store) {}

  ngOnChanges(): void {
    if (this.productoId !== this.currentProductoId) { this.initProduct(); }
  }

  private initProduct(): void {
    this.currentProductoId = this.productoId;
    const config = INSURANCE_PRODUCTS[this.productoId];
    if (!config) { console.error(`Producto no encontrado: ${this.productoId}`); return; }

    this.store.dispatch(resetWizard());
    this.store.dispatch(initWizard({
      productoId: config.productoId, stepsConfig: config.steps,
      validationRules: config.validationRules || null, dpsConfig: config.dpsConfig || null,
    }));

    if (config.steps.some((s) => s.requiereCargas)) {
      this.store.dispatch(loadParentescos({ productoId: config.productoId }));
    }
  }

  // ── Navegación: la lógica de saveToStore/isValid vive aquí, no en wizard-container ──

  onNext(): void {
    if (!this._activeStepRef || !this._activeStepRef.isValid()) { return; }
    this._activeStepRef.saveToStore();
    this.store.dispatch(nextStep());
  }

  onPrevious(): void {
    this._activeStepRef?.saveToStore();
    this.store.dispatch(prevStep());
  }

  onGoToStep(index: number): void {
    this._activeStepRef?.saveToStore();
    this.store.dispatch(setStep({ step: index }));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
