import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { PersonaFormComponent } from './components/persona-form/persona-form.component';
import { DpsFormComponent } from './components/dps-form/dps-form.component';
import { VehiculoFormComponent } from './components/vehiculo-form/vehiculo-form.component';

@NgModule({
  declarations: [PersonaFormComponent, DpsFormComponent, VehiculoFormComponent],
  imports: [CommonModule, ReactiveFormsModule],
  exports: [PersonaFormComponent, DpsFormComponent, VehiculoFormComponent],
})
export class SharedFormsModule {}
