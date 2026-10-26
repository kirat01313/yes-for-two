import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, switchMap, throwError } from 'rxjs';
import { MemoryPhoto } from '../models/photo';
import { SUPABASE_REST_URL } from '../supabase';
import { AuthService } from './auth.service';

interface PhotoRow {
  id: number;
  memory_id: number;
  path: string;
}

const BUCKET = 'photos';
const URL_LIFETIME = 60 * 60;
const MAX_SIDE = 1800;

@Injectable({ providedIn: 'root' })
export class PhotosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${SUPABASE_REST_URL}/photos`;

  list(memoryIds: number[]): Observable<Record<number, MemoryPhoto[]>> {
    if (!memoryIds.length) return of({});

    return this.http
      .get<PhotoRow[]>(this.url, {
        params: {
          select: 'id,memory_id,path',
          memory_id: `in.(${memoryIds.join(',')})`,
          order: 'created_at',
        },
      })
      .pipe(
        switchMap((rows) => {
          if (!rows.length) return of({});
          return from(
            this.bucket().createSignedUrls(
              rows.map((row) => row.path),
              URL_LIFETIME,
            ),
          ).pipe(
            map(({ data, error }) => {
              if (error) throw error;
              const byMemory: Record<number, MemoryPhoto[]> = {};
              rows.forEach((row, index) => {
                const url = data?.[index]?.signedUrl;
                if (!url) return;
                (byMemory[row.memory_id] ??= []).push({
                  id: row.id,
                  memoryId: row.memory_id,
                  path: row.path,
                  url,
                });
              });
              return byMemory;
            }),
          );
        }),
      );
  }

  add(memoryId: number, file: File): Observable<MemoryPhoto> {
    const user = this.auth.user();
    if (!user) return throwError(() => new Error('not-signed-in'));

    const path = `${user.id}/${memoryId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;

    return from(shrinkPhoto(file)).pipe(
      switchMap((photo) => from(this.bucket().upload(path, photo, { contentType: 'image/jpeg' }))),
      switchMap(({ error }) => {
        if (error) throw error;
        return this.http.post<PhotoRow[]>(
          this.url,
          { memory_id: memoryId, path },
          { headers: new HttpHeaders({ Prefer: 'return=representation' }) },
        );
      }),
      switchMap(([row]) =>
        from(this.bucket().createSignedUrl(path, URL_LIFETIME)).pipe(
          map(({ data, error }) => {
            if (error || !data) throw error ?? new Error('no-url');
            return { id: row.id, memoryId, path, url: data.signedUrl };
          }),
        ),
      ),
    );
  }

  delete(photo: MemoryPhoto): Observable<void> {
    return from(this.bucket().remove([photo.path])).pipe(
      switchMap(({ error }) => {
        if (error) throw error;
        return this.http.delete<void>(this.url, { params: { id: `eq.${photo.id}` } });
      }),
    );
  }

  deleteFromMemory(memoryId: number): Observable<void> {
    return this.http
      .get<PhotoRow[]>(this.url, { params: { select: 'path', memory_id: `eq.${memoryId}` } })
      .pipe(
        switchMap((rows) => {
          if (!rows.length) return of(undefined);
          return from(this.bucket().remove(rows.map((row) => row.path))).pipe(
            map(({ error }) => {
              if (error) throw error;
            }),
          );
        }),
      );
  }

  private bucket() {
    return this.auth.storage().from(BUCKET);
  }
}

async function shrinkPhoto(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('invalid-photo'))),
      'image/jpeg',
      0.85,
    ),
  );
}
