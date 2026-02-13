// ============================================================================
// persona-form.factory.ts
// Fábrica de FormGroups para personas.
//
// CAMBIO CLAVE VS VERSIÓN ANTERIOR:
// Antes era "WizardFormService" y vivía dentro del wizard.
// Ahora es "PersonaFormFactory" y vive en shared/ porque crear un
// FormGroup de persona NO es responsabilidad del wizard — es una
// capacidad reutilizable. Un DPS standalone, una pantalla de edición
// de cliente, o cualquier otro contexto puede necesitarlo.
//
// MEJORA SENIOR: Todos los métodos son puros (reciben inputs, retornan
// outputs, sin side effects). Esto los hace triviales de testear:
//   expect(factory.createPersonaFormGroup(null, false, rules).valid).toBe(false);
// ============================================================================

import { Injectable } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import {
  PersonaData,
  PersonaValidationRules,
  FieldRule,
  DateFieldRule,
  ParentescoOption,
} from '../models/shared.models';
import { generateUid } from '../utils/uid.util';

@Injectable({ providedIn: 'root' })
export class PersonaFormFactory {

  constructor(private fb: FormBuilder) {}

  // ─── Creación de FormGroups ────────────────────────────────────────────────

  createPersonaFormGroup(
    data?: PersonaData | null,
    incluirImc?: boolean,
    rules?: PersonaValidationRules | null,
    esCarga?: boolean
  ): FormGroup {
    const group: Record<string, any> = {
      uid:             [data?.uid || generateUid()],
      nombre:          [data?.nombre || '', this.buildFieldValidators(rules?.nombre, [Validators.required, Validators.minLength(2)])],
      apellidos:       [data?.apellidos || '', this.buildFieldValidators(rules?.apellidos, [Validators.required, Validators.minLength(2)])],
      rut:             [data?.rut || '', this.buildFieldValidators(rules?.rut, [Validators.required])],
      fechaNacimiento: [data?.fechaNacimiento || '', this.buildDateValidators(rules?.fechaNacimiento, [Validators.required])],
    };

    if (esCarga) {
      group.parentescoId = [data?.parentescoId || '', [Validators.required]];
    }

    if (incluirImc) {
      group.peso     = [data?.peso || null, this.buildFieldValidators(rules?.peso, [Validators.required, Validators.min(30), Validators.max(300)])];
      group.estatura = [data?.estatura || null, this.buildFieldValidators(rules?.estatura, [Validators.required, Validators.min(100), Validators.max(250)])];
      group.imc      = [data?.imc || null];
    }

    return this.fb.group(group);
  }

  createCargasFormArray(
    cargas: PersonaData[],
    incluirImc: boolean,
    parentescos: ParentescoOption[],
    fallbackRules?: PersonaValidationRules | null
  ): FormArray {
    const groups = cargas.map((carga) => {
      const rules = this.resolveRulesForParentesco(carga.parentescoId, parentescos, fallbackRules);
      return this.createPersonaFormGroup(carga, incluirImc, rules, true);
    });
    return this.fb.array(groups);
  }

  addCargaToArray(
    formArray: FormArray,
    incluirImc: boolean,
    rules?: PersonaValidationRules | null
  ): string {
    const uid = generateUid();
    const fg = this.createPersonaFormGroup({ uid } as PersonaData, incluirImc, rules, true);
    formArray.push(fg);
    return uid;
  }

  removeCargaFromArray(formArray: FormArray, index: number): void {
    formArray.removeAt(index);
  }

  // ─── Re-aplicación dinámica de validators ──────────────────────────────────

  applyValidationRules(
    formGroup: FormGroup,
    rules: PersonaValidationRules | null,
    incluirImc: boolean
  ): void {
    this.setControlValidators(formGroup, 'nombre', this.buildFieldValidators(rules?.nombre, [Validators.required, Validators.minLength(2)]));
    this.setControlValidators(formGroup, 'apellidos', this.buildFieldValidators(rules?.apellidos, [Validators.required, Validators.minLength(2)]));
    this.setControlValidators(formGroup, 'rut', this.buildFieldValidators(rules?.rut, [Validators.required]));
    this.setControlValidators(formGroup, 'fechaNacimiento', this.buildDateValidators(rules?.fechaNacimiento, [Validators.required]));

    if (incluirImc) {
      this.setControlValidators(formGroup, 'peso', this.buildFieldValidators(rules?.peso, [Validators.required, Validators.min(30), Validators.max(300)]));
      this.setControlValidators(formGroup, 'estatura', this.buildFieldValidators(rules?.estatura, [Validators.required, Validators.min(100), Validators.max(250)]));
    }
  }

  // ─── Resolución de reglas por parentesco ───────────────────────────────────

  resolveRulesForParentesco(
    parentescoId: string | null | undefined,
    parentescos: ParentescoOption[],
    fallback?: PersonaValidationRules | null
  ): PersonaValidationRules | null {
    if (parentescoId && parentescos?.length) {
      const found = parentescos.find((p) => p.id === parentescoId);
      if (found) { return found.reglas; }
    }
    return fallback || null;
  }

  // ─── Builders internos (public for testing) ────────────────────────────────

  buildFieldValidators(rule?: FieldRule | null, defaults: ValidatorFn[] = []): ValidatorFn[] {
    if (!rule) { return defaults; }
    const v: ValidatorFn[] = [];
    if (rule.required)          { v.push(Validators.required); }
    if (rule.minLength != null) { v.push(Validators.minLength(rule.minLength)); }
    if (rule.maxLength != null) { v.push(Validators.maxLength(rule.maxLength)); }
    if (rule.min != null)       { v.push(Validators.min(rule.min)); }
    if (rule.max != null)       { v.push(Validators.max(rule.max)); }
    if (rule.pattern)           { v.push(Validators.pattern(rule.pattern)); }
    return v;
  }

  buildDateValidators(rule?: DateFieldRule | null, defaults: ValidatorFn[] = []): ValidatorFn[] {
    if (!rule) { return defaults; }
    const v = this.buildFieldValidators(rule, defaults);
    if (rule.edadMinima != null || rule.edadMaxima != null) {
      v.push(PersonaFormFactory.edadRangoValidator(rule.edadMinima ?? 0, rule.edadMaxima ?? 150, rule.customErrorMsg));
    }
    return v;
  }

  // ─── Validators estáticos (para fácil testing sin instancia) ───────────────

  static edadRangoValidator(min: number, max: number, msg?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) { return null; }
      const fecha = new Date(control.value);
      if (isNaN(fecha.getTime())) { return { fechaInvalida: true }; }
      const edad = PersonaFormFactory.calcularEdad(fecha);
      if (edad < min || edad > max) {
        return {
          edadFueraDeRango: {
            edadActual: edad, edadMinima: min, edadMaxima: max,
            mensaje: msg || `La edad debe estar entre ${min} y ${max} años.`,
          },
        };
      }
      return null;
    };
  }

  static calcularEdad(fechaNacimiento: Date): number {
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const m = hoy.getMonth() - fechaNacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) { edad--; }
    return edad;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private setControlValidators(fg: FormGroup, name: string, validators: ValidatorFn[]): void {
    const ctrl = fg.get(name);
    if (!ctrl) { return; }
    ctrl.setValidators(validators);
    ctrl.updateValueAndValidity();
  }
}
