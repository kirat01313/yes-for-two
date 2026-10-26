import {
  Component,
  Injector,
  Input,
  OnInit,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { concatMap, from, switchMap, tap } from 'rxjs';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { MemoryExhibition } from '../../components/memory-exhibition/memory-exhibition';
import { StatusNotice } from '../../components/status-notice/status-notice';
import { Memory } from '../../models/memory';
import { MemoryPhoto } from '../../models/photo';
import { RequestStatus } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { MemoriesService } from '../../services/memories.service';
import { MAX_PHOTOS, PhotosService } from '../../services/photos.service';

@Component({
  imports: [RouterLink, TranslatePipe, StatusNotice, MemoryExhibition, ConfirmDialog],
  selector: 'app-gallery',
  styleUrl: './gallery.css',
  templateUrl: './gallery.html',
})
export class Gallery implements OnInit {
  private readonly memoriesService = inject(MemoriesService);
  private readonly photosService = inject(PhotosService);
  private readonly injector = inject(Injector);
  private readonly language = inject(LanguageService);

  @Input() id?: string;

  @ViewChild(MemoryExhibition) exhibition?: MemoryExhibition;
  @ViewChild(ConfirmDialog) confirm!: ConfirmDialog;

  readonly status = signal<RequestStatus>('loading');
  readonly memories = signal<Memory[]>([]);
  readonly photos = signal<Record<number, MemoryPhoto[]>>({});
  readonly uploadingId = signal<number | null>(null);
  readonly savingCaptionId = signal<number | null>(null);
  readonly photoError = signal('');

  ngOnInit(): void {
    this.memoriesService
      .list()
      .pipe(
        tap((memories) => {
          this.memories.set(memories);
          this.status.set(memories.length ? 'success' : 'empty');
          if (this.id) this.goTo(Number(this.id));
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

  addPhotos({ memory, files }: { memory: Memory; files: File[] }): void {
    const room = MAX_PHOTOS - (this.photos()[memory.id]?.length ?? 0);
    this.photoError.set(files.length > room ? 'galleryPage.tooMany' : '');
    if (room <= 0) return;

    this.uploadingId.set(memory.id);
    from(files.slice(0, room))
      .pipe(concatMap((file) => this.photosService.add(memory.id, file)))
      .subscribe({
        next: (photo) =>
          this.photos.update((photos) => ({
            ...photos,
            [memory.id]: [...(photos[memory.id] ?? []), photo],
          })),
        error: () => {
          this.uploadingId.set(null);
          this.photoError.set('galleryPage.uploadError');
        },
        complete: () => this.uploadingId.set(null),
      });
  }

  saveCaption({ photo, caption }: { photo: MemoryPhoto; caption: string }): void {
    this.savingCaptionId.set(photo.id);
    this.photoError.set('');
    this.photosService.updateCaption(photo, caption).subscribe({
      next: (updated) => {
        this.replacePhoto(updated);
        this.savingCaptionId.set(null);
      },
      error: () => {
        this.savingCaptionId.set(null);
        this.photoError.set('galleryPage.captionError');
      },
    });
  }

  async deletePhoto(photo: MemoryPhoto): Promise<void> {
    const sure = await this.confirm.ask(this.language.translate('galleryPage.confirmDeletePhoto'));
    if (!sure) return;

    this.photoError.set('');
    this.photosService.delete(photo).subscribe({
      next: () =>
        this.photos.update((photos) => ({
          ...photos,
          [photo.memoryId]: (photos[photo.memoryId] ?? []).filter((item) => item.id !== photo.id),
        })),
      error: () => this.photoError.set('galleryPage.deletePhotoError'),
    });
  }

  async deleteMemory(memory: Memory): Promise<void> {
    const question = this.language
      .translate('memoriesPage.confirmDelete')
      .replace('{name}', memory.name);
    if (!(await this.confirm.ask(question))) return;

    this.photoError.set('');
    this.photosService
      .deleteFromMemory(memory.id)
      .pipe(switchMap(() => this.memoriesService.delete(memory.id)))
      .subscribe({
        next: () => {
          this.memories.update((memories) => memories.filter((item) => item.id !== memory.id));
          this.photos.update((photos) => {
            const rest = { ...photos };
            delete rest[memory.id];
            return rest;
          });
          if (!this.memories().length) this.status.set('empty');
        },
        error: () => this.photoError.set('memoriesPage.deleteError'),
      });
  }

  private replacePhoto(photo: MemoryPhoto): void {
    this.photos.update((photos) => ({
      ...photos,
      [photo.memoryId]: (photos[photo.memoryId] ?? []).map((item) =>
        item.id === photo.id ? photo : item,
      ),
    }));
  }

  private goTo(id: number): void {
    afterNextRender(() => this.exhibition?.goTo(id), { injector: this.injector });
  }
}
