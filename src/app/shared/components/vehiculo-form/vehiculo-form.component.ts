import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { VehiculoData } from '../../models/shared.models';

@Component({
  selector: 'app-vehiculo-form',
  templateUrl: './vehiculo-form.component.html',
  styleUrls: ['./vehiculo-form.component.scss'],
})
export class VehiculoFormComponent {
  @Input() form!: FormGroup;
  @Input() titulo = 'Datos del Vehículo';

  @Input() patenteBuscando = false;
  @Input() patenteEncontrado = false;
  @Input() patenteMensaje: string | null = null;

  @Output() patenteBlur = new EventEmitter<string>();

  onPatenteBlur(): void {
    const patente = this.form.get('patente');
    if (patente?.valid && patente.value?.trim()) {
      this.patenteBlur.emit(patente.value.trim().toUpperCase());
    }
  }

  showError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.touched && ctrl?.invalid);
  }
}
