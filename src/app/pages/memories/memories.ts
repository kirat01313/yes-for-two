import {
  Component,
  ElementRef,
  Injector,
  Input,
  OnInit,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { MemoryAlbum } from '../../components/memory-album/memory-album';
import { MemoryForm } from '../../components/memory-form/memory-form';
import { MemoryMap } from '../../components/memory-map/memory-map';
import { StatusNotice } from '../../components/status-notice/status-notice';
import { Memory, MemoryFormData } from '../../models/memory';
import { MemoryPhoto } from '../../models/photo';
import { PROGRAMS, ProgramType, RequestStatus } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { MemoriesService } from '../../services/memories.service';
import { PhotosService } from '../../services/photos.service';

interface Filter {
  value: ProgramType | '';
  label: string;
}

@Component({
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    StatusNotice,
    MemoryMap,
    MemoryAlbum,
    MemoryForm,
  ],
  selector: 'app-memories',
  styleUrl: './memories.css',
  templateUrl: './memories.html',
})
export class Memories implements OnInit {
  private readonly memoriesService = inject(MemoriesService);
  private readonly photosService = inject(PhotosService);
  private readonly injector = inject(Injector);
  private readonly language = inject(LanguageService);

  @Input() id?: string;

  @ViewChild('formDialog') formDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild(MemoryAlbum) album?: MemoryAlbum;

  readonly filters: Filter[] = [
    { value: '', label: 'memoriesPage.all' },
    ...PROGRAMS.map((program) => ({
      value: program.value,
      label: `memoriesPage.filters.${program.value}`,
    })),
  ];

  readonly status = signal<RequestStatus>('loading');
  readonly memories = signal<Memory[]>([]);
  readonly filter = signal<ProgramType | ''>('');
  readonly search = signal('');
  readonly photos = signal<Record<number, MemoryPhoto[]>>({});
  readonly savingId = signal<number | null>(null);
  readonly listError = signal('');

  readonly formOpen = signal(false);
  readonly editing = signal<Memory | null>(null);
  readonly savingForm = signal(false);
  readonly formError = signal('');
  pressedOutside = false;

  readonly visible = computed(() => {
    const text = this.search().trim().toLowerCase();
    return this.memories()
      .filter((memory) => !this.filter() || memory.type === this.filter())
      .filter(
        (memory) =>
          !text ||
          `${memory.name} ${memory.category} ${memory.place} ${memory.note}`
            .toLowerCase()
            .includes(text),
      );
  });

  readonly covers = computed(() => {
    const covers: Record<number, string> = {};
    for (const [id, photos] of Object.entries(this.photos())) {
      if (photos[0]) covers[Number(id)] = photos[0].url;
    }
    return covers;
  });

  readonly wentCount = computed(() => this.memories().filter((memory) => memory.went).length);

  ngOnInit(): void {
    this.memoriesService
      .list()
      .pipe(
        tap((memories) => {
          this.memories.set(memories);
          this.status.set(memories.length ? 'success' : 'empty');
          if (this.id) this.goTo(Number(this.id), 'auto');
        }),
        switchMap((memories) => this.photosService.list(memories.map((memory) => memory.id))),
      )
      .subscribe({
        next: (photos) => this.photos.set(photos),
        error: () => {
          if (this.status() === 'loading') this.status.set('error');
        },
      });
  }

  chooseFilter(value: ProgramType | ''): void {
    this.filter.set(value);
  }

  markAsWent(memory: Memory): void {
    this.update(memory.id, { went: true });
  }

  saveNote({ memory, note }: { memory: Memory; note: string }): void {
    this.update(memory.id, { note });
  }

  openForm(memory: Memory | null = null): void {
    this.editing.set(memory);
    this.formError.set('');
    this.formOpen.set(true);
    this.formDialog?.nativeElement.showModal();
  }

  closeForm(): void {
    this.formDialog?.nativeElement.close();
    this.formOpen.set(false);
  }

  closeIfOutside(event: MouseEvent): void {
    if (this.pressedOutside && event.target === event.currentTarget) this.closeForm();
    this.pressedOutside = false;
  }

  showMemory(id: number): void {
    this.goTo(id);
  }

  formClosed(): void {
    if (!this.formDialog?.nativeElement.open) this.formOpen.set(false);
  }

  saveForm(data: MemoryFormData): void {
    const memory = this.editing();
    const request = memory
      ? this.memoriesService.edit(memory, data)
      : this.memoriesService.addManual(data);

    this.savingForm.set(true);
    this.formError.set('');
    request.subscribe({
      next: (saved) => {
        this.memories.update((memories) =>
          [...memories.filter((item) => item.id !== saved.id), saved].sort((a, b) =>
            b.date.localeCompare(a.date),
          ),
        );
        this.status.set('success');
        this.savingForm.set(false);
        this.closeForm();
        this.goTo(saved.id);
      },
      error: () => {
        this.savingForm.set(false);
        this.formError.set('memoriesPage.saveError');
      },
    });
  }

  deleteMemory(memory: Memory): void {
    const question = this.language
      .translate('memoriesPage.confirmDelete')
      .replace('{name}', memory.name);
    if (!confirm(question)) return;

    this.savingId.set(memory.id);
    this.listError.set('');
    this.photosService
      .deleteFromMemory(memory.id)
      .pipe(switchMap(() => this.memoriesService.delete(memory.id)))
      .subscribe({
        next: () => {
          this.memories.update((memories) => memories.filter((item) => item.id !== memory.id));
          this.savingId.set(null);
          if (!this.memories().length) this.status.set('empty');
        },
        error: () => {
          this.savingId.set(null);
          this.listError.set('memoriesPage.deleteError');
        },
      });
  }

  private update(id: number, changes: Partial<Memory>): void {
    this.savingId.set(id);
    this.memoriesService.update(id, changes).subscribe({
      next: (updated) => {
        this.memories.update((memories) =>
          memories.map((memory) => (memory.id === id ? updated : memory)),
        );
        this.savingId.set(null);
      },
      error: () => this.savingId.set(null),
    });
  }

  private goTo(id: number, behavior: ScrollBehavior = 'smooth'): void {
    this.filter.set('');
    this.search.set('');
    afterNextRender(() => this.album?.goTo(id, behavior), { injector: this.injector });
  }
}
