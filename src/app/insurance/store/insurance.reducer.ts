// ============================================================================
// insurance.reducer.ts
// ============================================================================

import { createReducer, on } from '@ngrx/store';
import { InsuranceWizardState } from '../models/insurance.models';
import * as A from './insurance.actions';

export const initialState: InsuranceWizardState = {
  productoId: null,
  stepsConfig: [],
  currentStep: 0,
  validationRules: null,
  parentescos: [],
  parentescosLoading: false,
  titular: null,
  cargas: [],
  dpsConfig: null,
  dpsRespuestas: {},
  vehiculo: null,
  cobertura: null,
  pago: null,
  validacion: { loading: false, resultado: null, error: null },
};

export const insuranceReducer = createReducer(
  initialState,

  on(A.initWizard, (_, { productoId, stepsConfig, validationRules, dpsConfig }) => ({
    ...initialState, productoId, stepsConfig, validationRules, dpsConfig,
  })),

  // Navegación
  on(A.setStep, (s, { step }) => ({ ...s, currentStep: step })),
  on(A.nextStep, (s) => ({ ...s, currentStep: Math.min(s.currentStep + 1, s.stepsConfig.length - 1) })),
  on(A.prevStep, (s) => ({ ...s, currentStep: Math.max(s.currentStep - 1, 0) })),

  // Titular y Cargas
  on(A.saveTitular, (s, { titular }) => ({ ...s, titular })),
  on(A.saveCargas, (s, { cargas }) => ({ ...s, cargas })),

  // Parentescos (con loading state)
  on(A.loadParentescos, (s) => ({ ...s, parentescosLoading: true })),
  on(A.loadParentescosSuccess, (s, { parentescos }) => ({ ...s, parentescos, parentescosLoading: false })),
  on(A.loadParentescosError, (s) => ({ ...s, parentescosLoading: false })),

  // DPS
  on(A.saveDpsRespuestas, (s, { respuestas }) => ({ ...s, dpsRespuestas: respuestas })),

  // Vehículo
  on(A.saveVehiculo, (s, { vehiculo }) => ({ ...s, vehiculo })),

  // Otros steps
  on(A.saveCobertura, (s, { cobertura }) => ({ ...s, cobertura })),
  on(A.savePago, (s, { pago }) => ({ ...s, pago })),

  // Validación
  on(A.validarDatos, (s) => ({ ...s, validacion: { loading: true, resultado: null, error: null } })),
  on(A.validarDatosSuccess, (s, { resultado }) => ({ ...s, validacion: { loading: false, resultado, error: null } })),
  on(A.validarDatosError, (s, { error }) => ({ ...s, validacion: { loading: false, resultado: null, error } })),

  // Reset
  on(A.resetWizard, () => ({ ...initialState })),
);
