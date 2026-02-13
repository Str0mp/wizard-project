import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DpsPregunta } from '../models/shared.models';

@Injectable({ providedIn: 'root' })
export class DpsFormFactory {

  constructor(private fb: FormBuilder) {}

  createDpsFormGroup(preguntas: DpsPregunta[]): FormGroup {
    const group: Record<string, any> = {};
    for (const p of preguntas) {
      group[p.id] = ['', p.requerida ? [Validators.required] : []];
    }
    return this.fb.group(group);
  }
}
