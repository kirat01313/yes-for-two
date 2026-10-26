import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Text } from '../../models/language';
import { Memory, MemoryFormData } from '../../models/memory';
import { FoundPlace } from '../../models/place';
import { PROGRAMS, ProgramType } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { GeoService } from '../../services/geo.service';
import { notInFuture, todayIso } from '../../utils/validators';

type ChosenLocation = MemoryFormData['location'];

const DEFAULT_IMAGE =
  'https://images.pexels.com/photos/28957805/pexels-photo-28957805.jpeg?auto=compress&cs=tinysrgb&w=1200';

@Component({
  imports: [ReactiveFormsModule, TranslatePipe],
  selector: 'app-memory-form',
  styleUrl: './memory-form.css',
  templateUrl: './memory-form.html',
})
export class MemoryForm implements OnChanges {
  private readonly geo = inject(GeoService);

  @Input() memory: Memory | null = null;
  @Input() saving = false;
  @Input() error: Text = '';

  @Output() save = new EventEmitter<MemoryFormData>();
  @Output() cancel = new EventEmitter<void>();

  readonly programs = PROGRAMS;
  readonly today = todayIso();
  readonly noteLimit = 280;

  readonly results = signal<FoundPlace[]>([]);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly locationLabel = signal('');

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    }),
    type: new FormControl<ProgramType | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    search: new FormControl('', { nonNullable: true }),
    location: new FormControl<ChosenLocation | null>(null, {
      validators: [Validators.required],
    }),
    date: new FormControl(todayIso(), {
      nonNullable: true,
      validators: [Validators.required, notInFuture],
    }),
    note: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(this.noteLimit)],
    }),
  });

  get image(): string {
    return this.memory?.image ?? DEFAULT_IMAGE;
  }

  get controls() {
    return this.form.controls;
  }

  ngOnChanges(): void {
    const memory = this.memory;
    this.results.set([]);
    this.searched.set(false);

    if (!memory) {
      this.form.reset({
        name: '',
        type: '',
        search: '',
        location: null,
        date: todayIso(),
        note: '',
      });
      this.locationLabel.set('');
      return;
    }

    this.form.reset({
      name: memory.name,
      type: memory.type,
      search: '',
      location: { name: memory.place, lat: memory.lat, lon: memory.lon },
      date: memory.date,
      note: memory.note,
    });
    this.locationLabel.set(memory.place);
  }

  searchPlaces(): void {
    const text = this.controls.search.value.trim();
    if (text.length < 2) return;

    this.searching.set(true);
    this.geo.findPlaces(text).subscribe((results) => {
      this.results.set(results);
      this.searched.set(true);
      this.searching.set(false);
    });
  }

  choose(place: FoundPlace): void {
    this.controls.location.setValue({ name: place.city, lat: place.lat, lon: place.lon });
    this.locationLabel.set([place.name, place.description].filter(Boolean).join(' — '));
    if (!this.controls.name.value.trim() && place.name !== place.city) {
      this.controls.name.setValue(place.name);
    }
    this.results.set([]);
    this.searched.set(false);
  }

  changeLocation(): void {
    this.controls.location.setValue(null);
    this.controls.location.markAsTouched();
    this.locationLabel.set('');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, type, location, date, note } = this.form.getRawValue();
    this.save.emit({ name, type: type as ProgramType, location: location!, date, note });
  }
}
