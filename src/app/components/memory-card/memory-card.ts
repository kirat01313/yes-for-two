import { DatePipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Memory } from '../../models/memory';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  imports: [DatePipe, ReactiveFormsModule, TranslatePipe],
  selector: 'app-memory-card',
  styleUrl: './memory-card.css',
  templateUrl: './memory-card.html',
})
export class MemoryCard implements OnChanges {
  readonly language = inject(LanguageService);

  @Input({ required: true }) memory!: Memory;
  @Input() saving = false;

  @Output() wentThere = new EventEmitter<Memory>();
  @Output() saveNote = new EventEmitter<{ memory: Memory; note: string }>();
  @Output() remove = new EventEmitter<Memory>();

  readonly noteLimit = 280;
  readonly writing = signal(false);

  readonly form = new FormGroup({
    note: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(this.noteLimit)],
    }),
  });

  get note() {
    return this.form.controls.note;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['memory']) {
      this.note.setValue(this.memory.note);
      this.form.markAsPristine();
    }
  }

  toggleWriting(): void {
    this.writing.update((writing) => !writing);
    this.note.setValue(this.memory.note);
  }

  submitNote(): void {
    if (this.form.invalid) return;
    this.saveNote.emit({ memory: this.memory, note: this.note.value.trim() });
    this.writing.set(false);
  }
}
