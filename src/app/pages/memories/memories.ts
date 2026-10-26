import {
  Component,
  Injector,
  Input,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MemoryCard } from '../../components/memory-card/memory-card';
import { StatusNotice } from '../../components/status-notice/status-notice';
import { Memory } from '../../models/memory';
import { PROGRAMS, ProgramType, RequestStatus } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { MemoriesService } from '../../services/memories.service';

interface Filter {
  value: ProgramType | '';
  label: string;
}

@Component({
  imports: [FormsModule, RouterLink, TranslatePipe, StatusNotice, MemoryCard],
  selector: 'app-memories',
  styleUrl: './memories.css',
  templateUrl: './memories.html',
})
export class Memories implements OnInit {
  private readonly memoriesService = inject(MemoriesService);
  private readonly injector = inject(Injector);

  @Input() id?: string;

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
  readonly highlighted = signal<number | null>(null);
  readonly savingId = signal<number | null>(null);

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

  readonly wentCount = computed(() => this.memories().filter((memory) => memory.went).length);

  ngOnInit(): void {
    this.memoriesService.list().subscribe({
      next: (memories) => {
        this.memories.set(memories);
        this.status.set(memories.length ? 'success' : 'empty');
        if (this.id) this.goTo(Number(this.id));
      },
      error: () => this.status.set('error'),
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

  private goTo(id: number): void {
    this.highlighted.set(id);
    afterNextRender(
      () => document.getElementById(`memory-${id}`)?.scrollIntoView({ block: 'center' }),
      { injector: this.injector },
    );
  }
}
