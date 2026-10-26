import { DatePipe } from '@angular/common';
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
import { StatusNotice } from '../../components/status-notice/status-notice';
import { Memory } from '../../models/memory';
import { PROGRAMS, ProgramType, RequestStatus } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { MemoriesService } from '../../services/memories.service';

interface Filter {
  value: ProgramType | '';
  label: string;
}

@Component({
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, StatusNotice],
  selector: 'app-memories',
  styleUrl: './memories.css',
  templateUrl: './memories.html',
})
export class Memories implements OnInit {
  private readonly memoriesService = inject(MemoriesService);
  private readonly injector = inject(Injector);
  readonly language = inject(LanguageService);

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

  private goTo(id: number): void {
    this.highlighted.set(id);
    afterNextRender(
      () => document.getElementById(`memory-${id}`)?.scrollIntoView({ block: 'center' }),
      { injector: this.injector },
    );
  }
}
