import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WizardStep } from '../../../wizard-core/interfaces';
import { PersonaData, DpsConfig, VehiculoData } from '../../../shared/models/shared.models';
import { selectTitularYCargas, selectValidacion, selectDpsConfig, selectDpsRespuestas, selectVehiculo } from '../../store/insurance.selectors';
import { validarDatos } from '../../store/insurance.actions';

@Component({
  selector: 'app-step-validacion',
  templateUrl: './step-validacion.component.html',
  styleUrls: ['./step-validacion.component.scss'],
})
export class StepValidacionComponent implements WizardStep, OnInit, OnDestroy {
  datos: { titular: PersonaData | null; cargas: PersonaData[] } | null = null;
  validacion = { loading: false, resultado: null as any, error: null as string | null };
  dpsConfig: DpsConfig | null = null;
  dpsRespuestas: Record<string, any> = {};
  vehiculo: VehiculoData | null = null;
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {}
  ngOnInit(): void {
    this.store.select(selectTitularYCargas).pipe(takeUntil(this.destroy$)).subscribe((d) => this.datos = d);
    this.store.select(selectValidacion).pipe(takeUntil(this.destroy$)).subscribe((v) => this.validacion = v);
    this.store.select(selectDpsConfig).pipe(takeUntil(this.destroy$)).subscribe((c) => this.dpsConfig = c);
    this.store.select(selectDpsRespuestas).pipe(takeUntil(this.destroy$)).subscribe((r) => this.dpsRespuestas = r);
    this.store.select(selectVehiculo).pipe(takeUntil(this.destroy$)).subscribe((v) => this.vehiculo = v);
  }

  formatDpsRespuesta(valor: any, tipo: string): string {
    if (valor == null || valor === '') { return 'Sin respuesta'; }
    if (tipo === 'si_no') { return valor === 'si' ? 'Sí' : 'No'; }
    return String(valor);
  }
  validar(): void { this.store.dispatch(validarDatos()); }
  saveToStore(): void {}
  isValid(): boolean { return !!this.validacion.resultado?.valido; }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
