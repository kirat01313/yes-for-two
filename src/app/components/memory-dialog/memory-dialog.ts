import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { Text } from '../../models/language';
import { Memory, MemoryFormData } from '../../models/memory';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { MemoryForm } from '../memory-form/memory-form';

@Component({
  imports: [TranslatePipe, MemoryForm],
  selector: 'app-memory-dialog',
  styleUrl: './memory-dialog.css',
  templateUrl: './memory-dialog.html',
})
export class MemoryDialog {
  @Input() saving = false;
  @Input() error: Text = '';

  @Output() save = new EventEmitter<MemoryFormData>();

  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;

  readonly isOpen = signal(false);
  readonly memory = signal<Memory | null>(null);
  private pressedOutside = false;

  open(memory: Memory | null = null): void {
    this.memory.set(memory);
    this.isOpen.set(true);
    this.dialog.nativeElement.showModal();
  }

  close(): void {
    this.dialog.nativeElement.close();
    this.isOpen.set(false);
  }

  closed(): void {
    if (!this.dialog.nativeElement.open) this.isOpen.set(false);
  }

  markPress(event: MouseEvent): void {
    this.pressedOutside = event.target === event.currentTarget;
  }

  closeIfOutside(event: MouseEvent): void {
    if (this.pressedOutside && event.target === event.currentTarget) this.close();
    this.pressedOutside = false;
  }
}
