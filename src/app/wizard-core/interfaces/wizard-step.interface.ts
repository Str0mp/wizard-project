export interface WizardStep {
  saveToStore(): void;
  isValid(): boolean;
}

export interface WizardStepConfig {
  id: string;
  label: string;
  component: string;
  [key: string]: any;
}
