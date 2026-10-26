import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Memory } from '../../models/memory';
import { MemoryPhoto } from '../../models/photo';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { MemoryCard } from '../memory-card/memory-card';

@Component({
  imports: [DatePipe, TranslatePipe, MemoryCard],
  selector: 'app-memory-album',
  styleUrl: './memory-album.css',
  templateUrl: './memory-album.html',
})
export class MemoryAlbum {
  readonly language = inject(LanguageService);
  private readonly wideQuery = window.matchMedia('(min-width: 900px)');

  @Input({ required: true }) set memories(memories: Memory[]) {
    this.list.set(memories);
    this.position.update((position) => Math.min(position, Math.max(0, memories.length - 1)));
  }
  @Input() photos: Record<number, MemoryPhoto[]> = {};
  @Input() savingId: number | null = null;

  @Output() wentThere = new EventEmitter<Memory>();
  @Output() saveNote = new EventEmitter<{ memory: Memory; note: string }>();
  @Output() edit = new EventEmitter<Memory>();
  @Output() remove = new EventEmitter<Memory>();

  readonly list = signal<Memory[]>([]);
  readonly position = signal(0);
  readonly wide = signal(this.wideQuery.matches);

  readonly activeIndex = computed(() =>
    Math.min(this.list().length - 1, Math.max(0, Math.round(this.position()))),
  );
  readonly active = computed(() => this.list()[this.activeIndex()] ?? null);

  constructor() {
    const onChange = (event: MediaQueryListEvent) => this.wide.set(event.matches);
    this.wideQuery.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => this.wideQuery.removeEventListener('change', onChange));
  }

  centerPhoto(memory: Memory): string | null {
    return memory.image ?? this.photos[memory.id]?.[0]?.url ?? null;
  }

  photoTransform(index: number): string {
    return `translateY(calc(-50% + ${index - this.position()} * (var(--photo-height) + var(--photo-gap))))`;
  }

  photoOpacity(index: number): number {
    return Math.max(0.12, 1 - Math.abs(index - this.position()) * 0.85);
  }

  goTo(id: number): void {
    const index = this.list().findIndex((memory) => memory.id === id);
    if (index < 0) return;

    if (!this.wide()) {
      document.getElementById(`memory-${id}`)?.scrollIntoView({ block: 'start' });
      return;
    }
    this.position.set(index);
  }
}
