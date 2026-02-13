import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormArray } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { WizardStep } from '../../../wizard-core/interfaces';
import {
  PersonaData,
  PersonaValidationRules,
  ParentescoOption,
  ImcResult,
} from '../../../shared/models/shared.models';
import { PersonaFormFactory } from '../../../shared/services/persona-form.factory';
import { InsuranceApiService } from '../../services/insurance-api.service';
import { selectStepTitularConfig } from '../../store/insurance.selectors';
import { saveTitular, saveCargas } from '../../store/insurance.actions';

interface CargaState {
  rules: PersonaValidationRules | null;
  rutBuscando: boolean;
  rutEncontrado: boolean;
  rutMensaje: string | null;
  imcCalculando: boolean;
  imcResult: ImcResult | null;
}

@Component({
  selector: 'app-step-titular-cargas',
  templateUrl: './step-titular-cargas.component.html',
  styleUrls: ['./step-titular-cargas.component.scss'],
})
export class StepTitularCargasComponent implements WizardStep, OnInit, OnDestroy {
  titularForm!: FormGroup;
  cargasFormArray!: FormArray;

  config = {
    requiereCargas: false, requiereImc: false,
    cargasLimits: { min: 0, max: 99 },
    titularRules: null as PersonaValidationRules | null,
    cargasRules: null as PersonaValidationRules | null,
    parentescos: [] as ParentescoOption[],
    parentescosLoading: false,
  };

  titularState = this.createEmptyState();
  private cargaStatesMap = new Map<string, CargaState>();
  private initialized = false;
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private formFactory: PersonaFormFactory,
    private api: InsuranceApiService,
  ) {}

  ngOnInit(): void {
    this.store.select(selectStepTitularConfig).pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.config = {
        requiereCargas: data.requiereCargas, requiereImc: data.requiereImc,
        cargasLimits: data.cargasLimits, titularRules: data.titularRules,
        cargasRules: data.cargasRules, parentescos: data.parentescos,
        parentescosLoading: data.parentescosLoading,
      };
      if (!this.initialized) {
        this.initForms(data.titular, data.cargas);
        this.initialized = true;
      }
    });
  }

  private initForms(titular: PersonaData | null, cargas: PersonaData[]): void {
    this.titularForm = this.formFactory.createPersonaFormGroup(null, this.config.requiereImc, this.config.titularRules, false);
    if (titular) { this.titularForm.patchValue(titular); }

    if (cargas?.length) {
      this.cargasFormArray = this.formFactory.createCargasFormArray(cargas, this.config.requiereImc, this.config.parentescos, this.config.cargasRules);
      cargas.forEach((c, i) => {
        const uid = c.uid || (this.cargasFormArray.at(i) as FormGroup).get('uid')?.value;
        const rules = this.formFactory.resolveRulesForParentesco(c.parentescoId, this.config.parentescos, this.config.cargasRules);
        this.cargaStatesMap.set(uid, { ...this.createEmptyState(), rules });
      });
    } else {
      this.cargasFormArray = this.formFactory.createCargasFormArray([], this.config.requiereImc, this.config.parentescos, this.config.cargasRules);
    }
  }

  onParentescoChange(index: number): void {
    const fg = this.getCargaForm(index);
    const uid = fg.get('uid')?.value;
    const parentescoId = fg.get('parentescoId')?.value;
    const rules = this.formFactory.resolveRulesForParentesco(parentescoId, this.config.parentescos, this.config.cargasRules);
    this.formFactory.applyValidationRules(fg, rules, this.config.requiereImc);
    const state = this.cargaStatesMap.get(uid) || this.createEmptyState();
    this.cargaStatesMap.set(uid, { ...state, rules });
  }

  onTitularRutBlur(rut: string): void {
    this.titularState = { ...this.titularState, rutBuscando: true, rutMensaje: null };
    this.api.buscarPorRut(rut).pipe(
      takeUntil(this.destroy$), finalize(() => this.titularState = { ...this.titularState, rutBuscando: false }),
    ).subscribe((r) => {
      if (r.encontrado && r.persona) {
        this.titularForm.patchValue(r.persona);
        this.titularState = { ...this.titularState, rutEncontrado: true, rutMensaje: '✓ Cliente encontrado.' };
      } else {
        this.titularState = { ...this.titularState, rutEncontrado: false, rutMensaje: 'Cliente nuevo.' };
      }
      setTimeout(() => this.titularState = { ...this.titularState, rutMensaje: null }, 4000);
    });
  }

  onCargaRutBlur(index: number, rut: string): void {
    const fg = this.getCargaForm(index);
    const uid = fg.get('uid')?.value;
    this.updateCargaState(uid, { rutBuscando: true, rutMensaje: null });
    this.api.buscarPorRut(rut).pipe(
      takeUntil(this.destroy$), finalize(() => this.updateCargaState(uid, { rutBuscando: false })),
    ).subscribe((r) => {
      if (r.encontrado && r.persona) { fg.patchValue(r.persona); this.updateCargaState(uid, { rutEncontrado: true, rutMensaje: '✓ Cliente encontrado.' }); }
      else { this.updateCargaState(uid, { rutEncontrado: false, rutMensaje: 'Cliente nuevo.' }); }
      setTimeout(() => this.updateCargaState(uid, { rutMensaje: null }), 4000);
    });
  }

  onTitularCalcularImc(data: { peso: number; estatura: number }): void {
    this.titularState = { ...this.titularState, imcCalculando: true };
    this.api.calcularImc(data.peso, data.estatura).pipe(
      takeUntil(this.destroy$), finalize(() => this.titularState = { ...this.titularState, imcCalculando: false }),
    ).subscribe((result) => { this.titularState = { ...this.titularState, imcResult: result }; this.titularForm.patchValue({ imc: result.imc }); });
  }

  onCargaCalcularImc(index: number, data: { peso: number; estatura: number }): void {
    const fg = this.getCargaForm(index);
    const uid = fg.get('uid')?.value;
    this.updateCargaState(uid, { imcCalculando: true });
    this.api.calcularImc(data.peso, data.estatura).pipe(
      takeUntil(this.destroy$), finalize(() => this.updateCargaState(uid, { imcCalculando: false })),
    ).subscribe((result) => { this.updateCargaState(uid, { imcResult: result }); fg.patchValue({ imc: result.imc }); });
  }

  agregarCarga(): void {
    if (this.cargasFormArray.length >= this.config.cargasLimits.max) { return; }
    const uid = this.formFactory.addCargaToArray(this.cargasFormArray, this.config.requiereImc, this.config.cargasRules);
    this.cargaStatesMap.set(uid, { ...this.createEmptyState(), rules: this.config.cargasRules });
  }

  eliminarCarga(index: number): void {
    const uid = this.getCargaForm(index).get('uid')?.value;
    this.formFactory.removeCargaFromArray(this.cargasFormArray, index);
    this.cargaStatesMap.delete(uid);
  }

  getCargaForm(index: number): FormGroup { return this.cargasFormArray.at(index) as FormGroup; }

  getCargaState(index: number): CargaState {
    const uid = this.getCargaForm(index).get('uid')?.value;
    return this.cargaStatesMap.get(uid) || { ...this.createEmptyState(), rules: this.config.cargasRules };
  }

  saveToStore(): void {
    this.store.dispatch(saveTitular({ titular: this.titularForm.value }));
    if (this.config.requiereCargas) { this.store.dispatch(saveCargas({ cargas: this.cargasFormArray.value })); }
  }

  isValid(): boolean {
    this.titularForm.markAllAsTouched();
    if (!this.titularForm.valid) { return false; }
    if (this.config.requiereCargas) {
      if (this.cargasFormArray.length < this.config.cargasLimits.min) { return false; }
      this.cargasFormArray.markAllAsTouched();
      return this.cargasFormArray.valid;
    }
    return true;
  }

  private createEmptyState(): CargaState {
    return { rules: null, rutBuscando: false, rutEncontrado: false, rutMensaje: null, imcCalculando: false, imcResult: null };
  }

  private updateCargaState(uid: string, partial: Partial<CargaState>): void {
    const current = this.cargaStatesMap.get(uid) || this.createEmptyState();
    this.cargaStatesMap.set(uid, { ...current, ...partial });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
