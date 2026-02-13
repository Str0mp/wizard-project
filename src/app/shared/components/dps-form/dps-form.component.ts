import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DpsConfig, DpsPregunta } from '../../models/shared.models';
import { DpsFormFactory } from '../../services/dps-form.factory';

@Component({
  selector: 'app-dps-form',
  templateUrl: './dps-form.component.html',
  styleUrls: ['./dps-form.component.scss'],
})
export class DpsFormComponent implements OnInit {
  @Input() config: DpsConfig | null = null;
  @Input() form!: FormGroup;

  constructor(private dpsFormFactory: DpsFormFactory) {}

  ngOnInit(): void {
    if (!this.form && this.config) {
      this.form = this.dpsFormFactory.createDpsFormGroup(this.config.preguntas);
    }
  }

  get preguntasVisibles(): DpsPregunta[] {
    if (!this.config) { return []; }
    return this.config.preguntas.filter((p) => {
      if (!p.dependeDe) { return true; }
      return this.form.get(p.dependeDe)?.value === p.dependeValor;
    });
  }
}
