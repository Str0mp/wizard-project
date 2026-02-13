// ============================================================================
// insurance.selectors.ts
//
// MEJORA SENIOR: selectStepTitularConfig es un SELECTOR COMPUESTO que agrupa
// todo lo que StepTitularCargasComponent necesita en una sola suscripción.
//
// Antes: 6-7 subscribe separados en ngOnInit → verbose, error-prone.
// Ahora:  1 subscribe a selectStepTitularConfig → limpio, testeable.
//
// Regla: si un componente necesita 3+ selectores del mismo slice,
// crea un selector compuesto.
// ============================================================================

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { InsuranceWizardState } from '../models/insurance.models';

// ─── Feature ─────────────────────────────────────────────────────────────────

export const selectInsuranceWizard = createFeatureSelector<InsuranceWizardState>('insuranceWizard');

// ─── Configuración ───────────────────────────────────────────────────────────

export const selectProductoId  = createSelector(selectInsuranceWizard, (s) => s.productoId);
export const selectStepsConfig = createSelector(selectInsuranceWizard, (s) => s.stepsConfig);
export const selectCurrentStep = createSelector(selectInsuranceWizard, (s) => s.currentStep);

export const selectCurrentStepConfig = createSelector(
  selectStepsConfig, selectCurrentStep,
  (steps, current) => steps[current] || null
);

export const selectIsFirstStep = createSelector(selectCurrentStep, (c) => c === 0);
export const selectIsLastStep  = createSelector(selectStepsConfig, selectCurrentStep, (s, c) => c === s.length - 1);

// ─── Parentescos ─────────────────────────────────────────────────────────────

export const selectParentescos        = createSelector(selectInsuranceWizard, (s) => s.parentescos);
export const selectParentescosLoading = createSelector(selectInsuranceWizard, (s) => s.parentescosLoading);

// ─── Datos ───────────────────────────────────────────────────────────────────

export const selectTitular = createSelector(selectInsuranceWizard, (s) => s.titular);
export const selectCargas  = createSelector(selectInsuranceWizard, (s) => s.cargas);

export const selectTitularYCargas = createSelector(
  selectTitular, selectCargas,
  (titular, cargas) => ({ titular, cargas })
);

// ─── Reglas de validación ────────────────────────────────────────────────────

export const selectValidationRules       = createSelector(selectInsuranceWizard, (s) => s.validationRules);
export const selectTitularValidationRules = createSelector(selectValidationRules, (r) => r?.titular || null);
export const selectCargasValidationRules  = createSelector(selectValidationRules, (r) => r?.cargas || null);
export const selectCargasLimits           = createSelector(selectValidationRules, (r) => ({ min: r?.minCargas ?? 0, max: r?.maxCargas ?? 99 }));

export const selectRequiereCargas = createSelector(selectStepsConfig, (steps) => {
  const s = steps.find((st) => st.component === 'step-titular-cargas');
  return s?.requiereCargas ?? false;
});

export const selectRequiereImc = createSelector(selectStepsConfig, (steps) => {
  const s = steps.find((st) => st.component === 'step-titular-cargas');
  return s?.requiereImc ?? false;
});

// ─── Selectores intermedios para Step Titular ────────────────────────────────

export const selectStepTitularFlags = createSelector(
  selectRequiereCargas,
  selectRequiereImc,
  selectCargasLimits,
  selectParentescos,
  selectParentescosLoading,
  (requiereCargas, requiereImc, cargasLimits, parentescos, parentescosLoading) => ({
    requiereCargas, requiereImc, cargasLimits, parentescos, parentescosLoading,
  })
);

// ─── SELECTOR COMPUESTO: Step Titular ────────────────────────────────────────
//
// Agrupa TODO lo que StepTitularCargasComponent necesita.
// El componente hace UN solo subscribe a este selector.

export const selectStepTitularConfig = createSelector(
  selectStepTitularFlags,
  selectTitularValidationRules,
  selectCargasValidationRules,
  selectTitular,
  selectCargas,
  (flags, titularRules, cargasRules, titular, cargas) => ({
    ...flags,
    titularRules,
    cargasRules,
    titular,
    cargas,
  })
);

// ─── DPS ─────────────────────────────────────────────────────────────────────

export const selectDpsConfig     = createSelector(selectInsuranceWizard, (s) => s.dpsConfig);
export const selectDpsRespuestas = createSelector(selectInsuranceWizard, (s) => s.dpsRespuestas);

// ─── Validación ──────────────────────────────────────────────────────────────

export const selectValidacion = createSelector(selectInsuranceWizard, (s) => s.validacion);

// ─── Vehículo ────────────────────────────────────────────────────────────────

export const selectVehiculo = createSelector(selectInsuranceWizard, (s) => s.vehiculo);

// ─── Otros steps ─────────────────────────────────────────────────────────────

export const selectCobertura = createSelector(selectInsuranceWizard, (s) => s.cobertura);
export const selectPago      = createSelector(selectInsuranceWizard, (s) => s.pago);
