// ============================================================================
// persona-form.component.ts
// Componente PRESENTACIONAL de persona — ahora verdaderamente "dumb".
//
// CAMBIOS SENIOR VS VERSIÓN ANTERIOR:
//
// 1. Ya NO inyecta WizardApiService.
//    En vez de llamar directamente al API para RUT e IMC, emite EVENTOS
//    via @Output(). El componente padre decide qué hacer con ellos.
//    Esto permite que PersonaForm se use en:
//    - El wizard de seguros (el step maneja las llamadas).
//    - Un formulario de DPS standalone.
//    - Una pantalla de edición de cliente.
//    - Cualquier contexto que necesite un form de persona.
//
// 2. Los resultados de RUT e IMC se reciben via @Input().
//    El componente solo renderiza lo que le dicen. No tiene estado async.
//
// 3. Es trivial de testear:
//    - No necesita mock de servicios HTTP.
//    - Solo verificar que los @Output emitan correctamente.
//    - Solo verificar que los @Input se rendericen correctamente.
// ============================================================================

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PersonaValidationRules, ImcResult } from '../../models/shared.models';

@Component({
  selector: 'app-persona-form',
  templateUrl: './persona-form.component.html',
  styleUrls: ['./persona-form.component.scss'],
})
export class PersonaFormComponent {

  // ── Inputs de configuración ──
  @Input() form!: FormGroup;
  @Input() titulo = '';
  @Input() idPrefix = 'persona';
  @Input() mostrarImc = false;
  @Input() validationRules: PersonaValidationRules | null = null;

  // ── Inputs de estado (el padre controla el estado) ──
  @Input() rutBuscando = false;
  @Input() rutEncontrado = false;
  @Input() rutMensaje: string | null = null;
  @Input() imcCalculando = false;
  @Input() imcResult: ImcResult | null = null;

  // ── Outputs (eventos que el padre maneja) ──
  @Output() rutBlur = new EventEmitter<string>();
  @Output() calcularImc = new EventEmitter<{ peso: number; estatura: number }>();

  onRutBlur(): void {
    const rut = this.form.get('rut');
    if (rut?.valid && rut.value?.trim()) {
      this.rutBlur.emit(rut.value.trim());
    }
  }

  onCalcularImc(): void {
    if (this.canCalculateImc()) {
      this.calcularImc.emit({
        peso: this.form.get('peso')!.value,
        estatura: this.form.get('estatura')!.value,
      });
    }
  }

  canCalculateImc(): boolean {
    const p = this.form.get('peso');
    const e = this.form.get('estatura');
    return !!(p?.valid && e?.valid && p.value && e.value);
  }

  showError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.touched && ctrl?.invalid);
  }

  getErrorMsg(field: string, defaultMsg: string): string {
    return (this.validationRules as any)?.[field]?.customErrorMsg || defaultMsg;
  }
}
