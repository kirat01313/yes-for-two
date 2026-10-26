import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  imports: [TranslatePipe],
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.css',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  readonly message = signal('');
  private resolve?: (answer: boolean) => void;
  private pressedOutside = false;

  ask(message: string): Promise<boolean> {
    this.message.set(message);
    this.dialog.nativeElement.showModal();
    return new Promise((resolve) => (this.resolve = resolve));
  }

  answer(value: boolean): void {
    this.resolve?.(value);
    this.resolve = undefined;
    this.dialog.nativeElement.close();
  }

  closed(): void {
    this.resolve?.(false);
    this.resolve = undefined;
  }

  markPress(event: MouseEvent): void {
    this.pressedOutside = event.target === event.currentTarget;
  }

  closeIfOutside(event: MouseEvent): void {
    if (this.pressedOutside && event.target === event.currentTarget) this.answer(false);
    this.pressedOutside = false;
  }
}
