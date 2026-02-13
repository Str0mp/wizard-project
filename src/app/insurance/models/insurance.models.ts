import {
  PersonaData,
  PersonaValidationRules,
  ParentescoOption,
  DpsConfig,
  VehiculoData,
} from '../../shared/models/shared.models';
import { WizardStepConfig } from '../../wizard-core/interfaces';

export interface InsuranceStepConfig extends WizardStepConfig {
  requiereCargas?: boolean;
  requiereImc?: boolean;
  requiereDps?: boolean;
}

export interface ProductValidationRules {
  titular?: PersonaValidationRules;
  cargas?: PersonaValidationRules;
  maxCargas?: number;
  minCargas?: number;
}

export interface InsuranceWizardConfig {
  productoId: string;
  productoNombre: string;
  steps: InsuranceStepConfig[];
  validationRules?: ProductValidationRules;
  dpsConfig?: DpsConfig | null;
}

export interface InsuranceWizardState {
  productoId: string | null;
  stepsConfig: InsuranceStepConfig[];
  currentStep: number;
  validationRules: ProductValidationRules | null;
  parentescos: ParentescoOption[];
  parentescosLoading: boolean;
  titular: PersonaData | null;
  cargas: PersonaData[];
  dpsConfig: DpsConfig | null;
  dpsRespuestas: Record<string, any>;
  vehiculo: VehiculoData | null;
  cobertura: any | null;
  pago: any | null;
  validacion: {
    loading: boolean;
    resultado: any | null;
    error: string | null;
  };
}
