import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  Input,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Memory } from '../../models/memory';
import { MemoryPhoto } from '../../models/photo';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { scrollToStep, stagePosition } from '../../utils/scroll';

const SCREENS_PER_PAGE = 0.8;
const COLLAGE_SIZE = 4;
const TILTS = [-4, 3, -2, 5, -3, 2];

@Component({
  imports: [DatePipe, NgTemplateOutlet, RouterLink, TranslatePipe],
  selector: 'app-memory-book',
  styleUrl: './memory-book.css',
  templateUrl: './memory-book.html',
  host: {
    '(window:keydown)': 'onKey($event)',
  },
})
export class MemoryBook {
  readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);
  private readonly wideQuery = window.matchMedia('(min-width: 900px)');
  private frame = 0;

  @Input({ required: true }) set memories(memories: Memory[]) {
    this.list.set([...memories].reverse());
    this.updateAfterRender();
  }
  @Input() photos: Record<number, MemoryPhoto[]> = {};

  @ViewChild('stage') stage?: ElementRef<HTMLElement>;

  readonly list = signal<Memory[]>([]);
  readonly position = signal(0);
  readonly wide = signal(this.wideQuery.matches);

  readonly current = computed(() => Math.round(this.position()));
  readonly last = computed(() => this.list().length - 1);
  readonly leaves = computed(() =>
    this.list()
      .slice(0, -1)
      .map((memory, index) => ({ front: memory, back: this.list()[index + 1] })),
  );
  readonly stageHeight = computed(
    () => `calc(100svh + ${this.last() * SCREENS_PER_PAGE * 100}svh)`,
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
  }

  collage(memory: Memory): string[] {
    return this.allPhotos(memory).slice(0, COLLAGE_SIZE);
  }

  extraPhotos(memory: Memory): string[] {
    return this.allPhotos(memory).slice(COLLAGE_SIZE, COLLAGE_SIZE + 2);
  }

  tilt(index: number): string {
    return `${TILTS[index % TILTS.length]}deg`;
  }

  leafAngle(index: number): number {
    return -180 * Math.min(1, Math.max(0, this.position() - index));
  }

  leafLayer(index: number): number {
    const turned = this.position() - index;
    if (turned > 0 && turned < 1) return 1000;
    return turned >= 1 ? index + 1 : this.list().length - index;
  }

  next(): void {
    this.goToPage(Math.min(this.last(), this.current() + 1));
  }

  previous(): void {
    this.goToPage(Math.max(0, this.current() - 1));
  }

  goTo(id: number, behavior: ScrollBehavior = 'smooth'): void {
    const index = this.list().findIndex((memory) => memory.id === id);
    if (index >= 0) this.goToPage(index, behavior);
  }

  onKey(event: KeyboardEvent): void {
    const typing =
      event.target instanceof Element &&
      event.target.closest('input, textarea, select, dialog') !== null;
    if (!this.wide() || typing) return;
    if (event.key === 'ArrowRight') this.next();
    if (event.key === 'ArrowLeft') this.previous();
  }

  private goToPage(index: number, behavior: ScrollBehavior = 'smooth'): void {
    if (!this.wide()) {
      document
        .getElementById(`book-${this.list()[index]?.id}`)
        ?.scrollIntoView({ behavior, block: 'start' });
      return;
    }
    const stage = this.stage?.nativeElement;
    if (stage) scrollToStep(stage, index, SCREENS_PER_PAGE, behavior);
  }

  private allPhotos(memory: Memory): string[] {
    const own = (this.photos[memory.id] ?? []).map((photo) => photo.url);
    return memory.image ? [memory.image, ...own] : own;
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
