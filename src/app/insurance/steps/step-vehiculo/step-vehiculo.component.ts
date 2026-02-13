import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { WizardStep } from '../../../wizard-core/interfaces';
import { VehiculoData } from '../../../shared/models/shared.models';
import { InsuranceApiService } from '../../services/insurance-api.service';
import { selectVehiculo } from '../../store/insurance.selectors';
import { saveVehiculo } from '../../store/insurance.actions';

@Component({
  selector: 'app-step-vehiculo',
  templateUrl: './step-vehiculo.component.html',
  styleUrls: ['./step-vehiculo.component.scss'],
})
export class StepVehiculoComponent implements WizardStep, OnInit, OnDestroy {
  vehiculoForm!: FormGroup;

  patenteBuscando = false;
  patenteEncontrado = false;
  patenteMensaje: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private api: InsuranceApiService,
  ) {}

  ngOnInit(): void {
    this.vehiculoForm = this.fb.group({
      patente: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(6)]],
      marca: ['', Validators.required],
      modelo: ['', Validators.required],
      anio: [null, [Validators.required, Validators.min(1990), Validators.max(new Date().getFullYear() + 1)]],
      color: [''],
      numeroMotor: [''],
      numeroChasis: [''],
    });

    this.store.select(selectVehiculo).pipe(takeUntil(this.destroy$)).subscribe((v) => {
      if (v) { this.vehiculoForm.patchValue(v); }
    });
  }

  onPatenteBlur(patente: string): void {
    this.patenteBuscando = true;
    this.patenteMensaje = null;
    this.api.buscarPorPatente(patente).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.patenteBuscando = false),
    ).subscribe((r) => {
      if (r.encontrado && r.vehiculo) {
        this.vehiculoForm.patchValue(r.vehiculo);
        this.patenteEncontrado = true;
        this.patenteMensaje = 'Vehiculo encontrado.';
      } else {
        this.patenteEncontrado = false;
        this.patenteMensaje = 'Vehiculo no registrado.';
      }
      setTimeout(() => this.patenteMensaje = null, 4000);
    });
  }

  saveToStore(): void {
    this.store.dispatch(saveVehiculo({ vehiculo: this.vehiculoForm.value }));
  }

  isValid(): boolean {
    this.vehiculoForm.markAllAsTouched();
    return this.vehiculoForm.valid;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
