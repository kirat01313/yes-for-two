import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  Output,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Memory } from '../../models/memory';
import { MemoryPhoto } from '../../models/photo';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { scrollToStep, stagePosition } from '../../utils/scroll';
import { MemoryCard } from '../memory-card/memory-card';

const SCREENS_PER_MEMORY = 0.6;
const WRITING_SPAN = 0.35;

@Component({
  imports: [DatePipe, TranslatePipe, MemoryCard],
  selector: 'app-memory-album',
  styleUrl: './memory-album.css',
  templateUrl: './memory-album.html',
})
export class MemoryAlbum {
  readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);
  private readonly wideQuery = window.matchMedia('(min-width: 900px)');
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private frame = 0;

  @Input({ required: true }) set memories(memories: Memory[]) {
    this.list.set(memories);
    this.position.update((position) => Math.min(position, Math.max(0, memories.length - 1)));
    this.updateAfterRender();
  }
  @Input() photos: Record<number, MemoryPhoto[]> = {};
  @Input() savingId: number | null = null;

  @Output() wentThere = new EventEmitter<Memory>();
  @Output() saveNote = new EventEmitter<{ memory: Memory; note: string }>();
  @Output() edit = new EventEmitter<Memory>();
  @Output() remove = new EventEmitter<Memory>();

  @ViewChild('stage') stage?: ElementRef<HTMLElement>;
  @ViewChild('index') index?: ElementRef<HTMLElement>;

  readonly list = signal<Memory[]>([]);
  readonly position = signal(0);
  readonly wide = signal(this.wideQuery.matches);

  readonly activeIndex = computed(() =>
    Math.min(this.list().length - 1, Math.max(0, Math.round(this.position()))),
  );
  readonly active = computed(() => this.list()[this.activeIndex()] ?? null);
  readonly progress = computed(() =>
    this.list().length > 1 ? this.position() / (this.list().length - 1) : 0,
  );
  readonly noteWritten = computed(() => {
    if (this.reduceMotion) return 1;
    const offset = this.position() - this.activeIndex();
    return Math.min(1, Math.max(0, (offset + 0.5) / WRITING_SPAN));
  });
  readonly stageHeight = computed(
    () => `calc(100svh + ${(this.list().length - 1) * SCREENS_PER_MEMORY * 100}svh)`,
  );

  constructor() {
    const onChange = (event: MediaQueryListEvent) => {
      this.wide.set(event.matches);
      this.updateAfterRender();
    };
    this.wideQuery.addEventListener('change', onChange);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onScroll, { passive: true });

    inject(DestroyRef).onDestroy(() => {
      this.wideQuery.removeEventListener('change', onChange);
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onScroll);
      cancelAnimationFrame(this.frame);
    });

    effect(() => {
      const index = this.activeIndex();
      const list = this.index?.nativeElement;
      const item = list?.children[index] as HTMLElement | undefined;
      if (list && item) {
        list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2;
      }
    });
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

  goTo(id: number, behavior: ScrollBehavior = 'smooth'): void {
    const index = this.list().findIndex((memory) => memory.id === id);
    if (index < 0) return;

    if (!this.wide()) {
      document.getElementById(`memory-${id}`)?.scrollIntoView({ behavior, block: 'start' });
      return;
    }
    const stage = this.stage?.nativeElement;
    if (stage) scrollToStep(stage, index, SCREENS_PER_MEMORY, behavior);
  }

  private onScroll = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };

  private updateAfterRender(): void {
    afterNextRender(() => this.update(), { injector: this.injector });
  }

  private update(): void {
    const stage = this.stage?.nativeElement;
    this.position.set(stage && this.wide() ? stagePosition(stage, this.list().length) : 0);
  }
}
