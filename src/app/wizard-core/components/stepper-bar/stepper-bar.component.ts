import { Component, Input, Output, EventEmitter } from '@angular/core';
import { WizardStepConfig } from '../../interfaces';

@Component({
  selector: 'app-stepper-bar',
  templateUrl: './stepper-bar.component.html',
  styleUrls: ['./stepper-bar.component.scss'],
})
export class StepperBarComponent {
  @Input() steps: WizardStepConfig[] = [];
  @Input() currentStep = 0;
  @Output() stepClicked = new EventEmitter<number>();

  onStepClick(index: number): void {
    if (index <= this.currentStep) { this.stepClicked.emit(index); }
  }
}
