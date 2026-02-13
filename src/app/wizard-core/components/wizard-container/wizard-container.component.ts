import { Component, Input, Output, EventEmitter } from '@angular/core';
import { WizardStepConfig } from '../../interfaces';

@Component({
  selector: 'app-wizard-container',
  templateUrl: './wizard-container.component.html',
  styleUrls: ['./wizard-container.component.scss'],
})
export class WizardContainerComponent {
  @Input() stepsConfig: WizardStepConfig[] = [];
  @Input() currentStep = 0;
  @Input() isFirstStep = true;
  @Input() isLastStep = false;

  @Output() next = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() goToStep = new EventEmitter<number>();

  onNext(): void { this.next.emit(); }
  onPrevious(): void { this.previous.emit(); }
  onStepClicked(index: number): void { this.goToStep.emit(index); }
}
