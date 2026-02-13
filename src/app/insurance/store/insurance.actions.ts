import { createAction, props } from '@ngrx/store';
import { PersonaData, ParentescoOption, DpsConfig, VehiculoData } from '../../shared/models/shared.models';
import { InsuranceStepConfig, ProductValidationRules } from '../models/insurance.models';

export const initWizard = createAction('[Insurance Wizard] Init', props<{
  productoId: string; stepsConfig: InsuranceStepConfig[];
  validationRules: ProductValidationRules | null; dpsConfig: DpsConfig | null;
}>());

export const setStep    = createAction('[Insurance Wizard] Set Step', props<{ step: number }>());
export const nextStep   = createAction('[Insurance Wizard] Next Step');
export const prevStep   = createAction('[Insurance Wizard] Prev Step');

export const saveTitular = createAction('[Insurance Wizard] Save Titular', props<{ titular: PersonaData }>());
export const saveCargas  = createAction('[Insurance Wizard] Save Cargas', props<{ cargas: PersonaData[] }>());

export const loadParentescos        = createAction('[Insurance Wizard] Load Parentescos', props<{ productoId: string }>());
export const loadParentescosSuccess = createAction('[Insurance API] Load Parentescos Success', props<{ parentescos: ParentescoOption[] }>());
export const loadParentescosError   = createAction('[Insurance API] Load Parentescos Error', props<{ error: string }>());

export const saveDpsRespuestas = createAction('[Insurance Wizard] Save DPS', props<{ respuestas: Record<string, any> }>());

export const validarDatos        = createAction('[Insurance Wizard] Validar Datos');
export const validarDatosSuccess = createAction('[Insurance API] Validar Success', props<{ resultado: any }>());
export const validarDatosError   = createAction('[Insurance API] Validar Error', props<{ error: string }>());

export const saveVehiculo  = createAction('[Insurance Wizard] Save Vehiculo', props<{ vehiculo: VehiculoData }>());
export const saveCobertura = createAction('[Insurance Wizard] Save Cobertura', props<{ cobertura: any }>());
export const savePago      = createAction('[Insurance Wizard] Save Pago', props<{ pago: any }>());

export const resetWizard = createAction('[Insurance Wizard] Reset');
