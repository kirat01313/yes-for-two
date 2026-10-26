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
import { MemoryBook } from '../../components/memory-book/memory-book';
import { StatusNotice } from '../../components/status-notice/status-notice';
import { Memory } from '../../models/memory';
import { MemoryPhoto } from '../../models/photo';
import { RequestStatus } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { MemoriesService } from '../../services/memories.service';
import { PhotosService } from '../../services/photos.service';

@Component({
  imports: [RouterLink, TranslatePipe, StatusNotice, MemoryBook],
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

  @ViewChild(MemoryBook) book?: MemoryBook;

  readonly status = signal<RequestStatus>('loading');
  readonly memories = signal<Memory[]>([]);
  readonly photos = signal<Record<number, MemoryPhoto[]>>({});
  readonly uploadingId = signal<number | null>(null);
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
    this.uploadingId.set(memory.id);
    this.photoError.set('');

    from(files)
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

  deletePhoto(photo: MemoryPhoto): void {
    if (!confirm(this.language.translate('galleryPage.confirmDeletePhoto'))) return;

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

  private goTo(id: number): void {
    afterNextRender(() => this.book?.goTo(id, 'auto'), { injector: this.injector });
  }
}
