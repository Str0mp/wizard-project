// ============================================================================
// dps-form.component.ts
// Declaración Personal de Salud — componente REUTILIZABLE.
//
// CASO DE USO QUE MOTIVÓ LA REESTRUCTURACIÓN:
// "¿Qué pasa si hay un componente de DPS que debe reutilizarse y
// configurarse? ¿Se usa el mismo wizard u otro?"
//
// RESPUESTA: El DPS NO pertenece al wizard. Es un componente independiente
// que PUEDE usarse dentro del wizard (como contenido de un step) o fuera
// (en una pantalla standalone de renovación de póliza, por ejemplo).
//
// CÓMO SE USA:
//
// 1. Dentro del wizard (como step):
//    El StepDpsComponent (en insurance/steps/) implementa WizardStep,
//    y en su template usa <app-dps-form [config]="..." [formGroup]="...">.
//    El step se encarga de saveToStore() e isValid().
//
// 2. Standalone (fuera del wizard):
//    Cualquier componente puede usar <app-dps-form> directamente.
//    No necesita wizard, ni store, ni nada del flujo de contratación.
//
// CONFIGURACIÓN:
// Las preguntas de la DPS vienen del backend (DpsConfig) y se renderizan
// dinámicamente. Cada pregunta puede ser sí/no, texto, fecha, numérico,
// y puede depender de otra pregunta (lógica condicional).
// ============================================================================

import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DpsConfig, DpsPregunta } from '../../models/shared.models';

@Component({
  selector: 'app-dps-form',
  templateUrl: './dps-form.component.html',
  styleUrls: ['./dps-form.component.scss'],
})
export class DpsFormComponent implements OnInit {
  /**
   * Configuración de la DPS (preguntas, título, etc.).
   * Viene del backend. Si es null, no se renderiza nada.
   */
  @Input() config: DpsConfig | null = null;

  /**
   * FormGroup externo (opcional). Si se pasa, se usa ese.
   * Si no se pasa, se crea uno internamente.
   * Esto permite que el step padre controle el form (para saveToStore).
   */
  @Input() form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    if (!this.form && this.config) {
      this.form = this.buildForm(this.config.preguntas);
    }
  }

  /**
   * Filtra las preguntas visibles según lógica condicional.
   * Una pregunta con dependeDe solo se muestra si la pregunta padre
   * tiene el valor esperado (dependeValor).
   */
  get preguntasVisibles(): DpsPregunta[] {
    if (!this.config) { return []; }
    return this.config.preguntas.filter((p) => {
      if (!p.dependeDe) { return true; }
      return this.form.get(p.dependeDe)?.value === p.dependeValor;
    });
  }

  /**
   * Construye un FormGroup dinámico a partir de las preguntas.
   * Público para que el step padre pueda usarlo si necesita crear
   * el form antes de pasarlo como @Input.
   */
  buildForm(preguntas: DpsPregunta[]): FormGroup {
    const group: Record<string, any> = {};
    for (const p of preguntas) {
      group[p.id] = ['', p.requerida ? [Validators.required] : []];
    }
    return this.fb.group(group);
  }
}
