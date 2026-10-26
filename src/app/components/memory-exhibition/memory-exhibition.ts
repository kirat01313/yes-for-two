import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Memory } from '../../models/memory';
import { MemoryPhoto } from '../../models/photo';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { MAX_CAPTION, MAX_PHOTOS } from '../../services/photos.service';
import { googleMapsLink } from '../../utils/geo';

@Component({
  imports: [DatePipe, NgTemplateOutlet, RouterLink, TranslatePipe],
  selector: 'app-memory-exhibition',
  styleUrl: './memory-exhibition.css',
  templateUrl: './memory-exhibition.html',
})
export class MemoryExhibition {
  readonly language = inject(LanguageService);

  @Input({ required: true }) memories: Memory[] = [];
  @Input() photos: Record<number, MemoryPhoto[]> = {};
  @Input() uploadingId: number | null = null;
  @Input() savingCaptionId: number | null = null;

  @Output() addPhotos = new EventEmitter<{ memory: Memory; files: File[] }>();
  @Output() deletePhoto = new EventEmitter<MemoryPhoto>();
  @Output() saveCaption = new EventEmitter<{ photo: MemoryPhoto; caption: string }>();
  @Output() deleteMemory = new EventEmitter<Memory>();

  readonly maxPhotos = MAX_PHOTOS;
  readonly maxCaption = MAX_CAPTION;
  readonly editingPhotoId = signal<number | null>(null);

  ownPhotos(memory: Memory): MemoryPhoto[] {
    return this.photos[memory.id] ?? [];
  }

  cover(memory: Memory): MemoryPhoto | null {
    return this.ownPhotos(memory)[0] ?? null;
  }

  wall(memory: Memory): MemoryPhoto[] {
    return this.ownPhotos(memory).slice(1);
  }

  canAddPhotos(memory: Memory): boolean {
    return this.ownPhotos(memory).length < MAX_PHOTOS;
  }

  mapsLink(memory: Memory): string {
    return googleMapsLink(memory.name, memory.place);
  }

  number(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  goTo(id: number): void {
    document.getElementById(`work-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  chooseFiles(memory: Memory, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length) this.addPhotos.emit({ memory, files });
    input.value = '';
  }

  editCaption(photo: MemoryPhoto | null): void {
    this.editingPhotoId.set(photo?.id ?? null);
  }

  submitCaption(photo: MemoryPhoto, caption: string): void {
    this.saveCaption.emit({ photo, caption: caption.trim() });
    this.editingPhotoId.set(null);
  }
}
