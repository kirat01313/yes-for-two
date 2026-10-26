import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { Feature, FeatureCollection } from 'geojson';
import { RouterLink } from '@angular/router';
import {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl';
import { LAND_DOTS } from '../../data/land-dots';
import { Memory } from '../../models/memory';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { distanceKm } from '../../utils/geo';

setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href);

const WORLD_CENTER: [number, number] = [12, 22];
const DESCENT_SCREENS = 1.4;

const LAND: FeatureCollection = {
  type: 'FeatureCollection',
  features: LAND_DOTS.map(([lon, lat]) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [lon, lat] },
  })),
};

interface Camera {
  lon: number;
  lat: number;
  zoom: number;
}

@Component({
  imports: [DatePipe, RouterLink, TranslatePipe],
  selector: 'app-memory-map',
  styleUrl: './memory-map.css',
  templateUrl: './memory-map.html',
})
export class MemoryMap implements AfterViewInit, OnChanges, OnDestroy {
  readonly language = inject(LanguageService);

  @Input({ required: true }) memories: Memory[] = [];
  @Input() covers: Record<number, string> = {};
  @Output() select = new EventEmitter<number>();
  @Output() add = new EventEmitter<void>();

  @ViewChild('section') section!: ElementRef<HTMLElement>;
  @ViewChild('map') mapElement!: ElementRef<HTMLDivElement>;

  readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly progress = signal(0);
  readonly titleOpacity = computed(() => Math.max(0, 1 - this.progress() * 3));
  readonly arrivalOpacity = computed(() =>
    Math.min(1, Math.max(0, (this.progress() - 0.85) / 0.15)),
  );

  private map?: MapLibreMap;
  private loaded = false;
  private pins: Marker[] = [];
  private highlight?: Marker;
  private target: Camera | null = null;
  private lastProgress = -1;
  private frame = 0;

  get latest(): Memory | null {
    return this.memories[0] ?? null;
  }

  get recent(): Memory[] {
    return this.memories.slice(0, 5);
  }

  get coordinates(): string {
    const memory = this.latest;
    if (!memory) return '';
    const dms = (value: number) =>
      `${Math.floor(Math.abs(value))}° ${Math.round((Math.abs(value) % 1) * 60)}′`;
    return `${dms(memory.lat)} ${memory.lat >= 0 ? 'N' : 'S'} · ${dms(memory.lon)} ${memory.lon >= 0 ? 'E' : 'W'}`;
  }

  ngAfterViewInit(): void {
    this.map = new MapLibreMap({
      container: this.mapElement.nativeElement,
      style: this.style(),
      center: WORLD_CENTER,
      zoom: this.worldZoom(),
      minZoom: -2,
      renderWorldCopies: false,
      scrollZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    this.map.touchZoomRotate.disableRotation();
    this.map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    this.map.on('load', () => {
      this.loaded = true;
      this.drawMemories();
      this.findTarget();
      this.updateCamera(true);
    });

    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  ngOnChanges(): void {
    if (!this.loaded) return;
    this.drawMemories();
    this.findTarget();
    this.updateCamera(true);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.frame);
    this.map?.remove();
  }

  private style(): StyleSpecification {
    return {
      version: 8,
      sources: {
        land: { type: 'geojson', data: LAND },
        yeses: { type: 'geojson', data: this.yesPoints() },
        route: { type: 'geojson', data: this.route() },
        streets: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 19,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Natural Earth',
        },
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#faf7f2' } },
        {
          id: 'streets',
          type: 'raster',
          source: 'streets',
          minzoom: 6.5,
          paint: {
            'raster-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 10.5, 1],
            'raster-saturation': -0.85,
            'raster-contrast': -0.1,
            'raster-brightness-min': 0.06,
          },
        },
        {
          id: 'land',
          type: 'circle',
          source: 'land',
          paint: {
            'circle-color': '#1f1917',
            'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 1, 2.6, 5, 38],
            'circle-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.22, 4, 0.18, 7.5, 0],
          },
        },
        {
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round' },
          paint: {
            'line-color': '#aa2d31',
            'line-width': 1.2,
            'line-dasharray': [2, 3],
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.85, 8, 0],
          },
        },
        {
          id: 'yeses',
          type: 'circle',
          source: 'yeses',
          paint: {
            'circle-color': '#aa2d31',
            'circle-radius': ['case', ['get', 'latest'], 5.5, 3.5],
            'circle-opacity': ['interpolate', ['linear'], ['zoom'], 0, 1, 8, 1, 9.5, 0],
          },
        },
      ],
    };
  }

  private yesPoints(): FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: this.memories.map((memory, index) => ({
        type: 'Feature',
        properties: { latest: index === 0 },
        geometry: { type: 'Point', coordinates: [memory.lon, memory.lat] },
      })),
    };
  }

  private route(): Feature {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [...this.memories].reverse().map((memory) => [memory.lon, memory.lat]),
      },
    };
  }

  private drawMemories(): void {
    const map = this.map;
    if (!map) return;
    (map.getSource('yeses') as GeoJSONSource | undefined)?.setData(this.yesPoints());
    (map.getSource('route') as GeoJSONSource | undefined)?.setData(this.route());

    this.pins.forEach((pin) => pin.remove());
    this.pins = this.memories.map((memory) =>
      new Marker({ element: this.createPin(memory), anchor: 'top', offset: [0, -29] })
        .setLngLat([memory.lon, memory.lat])
        .addTo(map),
    );

    this.highlight?.remove();
    const latest = this.latest;
    this.highlight = latest
      ? new Marker({ element: this.createHighlight(latest), anchor: 'center' })
          .setLngLat([latest.lon, latest.lat])
          .addTo(map)
      : undefined;
  }

  private createHighlight(memory: Memory): HTMLElement {
    const highlight = document.createElement('div');
    highlight.className = 'highlight';
    const ring = document.createElement('span');
    ring.className = 'ring';
    const name = document.createElement('span');
    name.className = 'highlight-name';
    name.textContent = memory.name;
    highlight.append(ring, name);
    return highlight;
  }

  private createPin(memory: Memory): HTMLElement {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = `pin ${memory.went ? 'pin-went' : 'pin-yes'}`;
    pin.setAttribute(
      'aria-label',
      this.language.translate('memoryMap.pinLabel').replace('{name}', memory.name),
    );

    const photo = document.createElement('span');
    photo.className = 'pin-photo';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = memory.icon;

    const image = memory.image ?? this.covers[memory.id];
    if (image) {
      const img = document.createElement('img');
      img.src = image;
      img.alt = '';
      img.addEventListener('error', () => img.replaceWith(icon));
      photo.append(img);
    } else {
      photo.append(icon);
    }

    const name = document.createElement('span');
    name.className = 'pin-name';
    name.textContent = memory.name;

    pin.append(photo, name);
    pin.addEventListener('click', () => this.select.emit(memory.id));
    return pin;
  }

  private worldZoom(): number {
    return Math.log2(window.innerWidth / 512);
  }

  private findTarget(): void {
    const latest = this.latest;
    if (!latest) {
      this.target = null;
      return;
    }

    const near = this.memories.filter(
      (memory) => distanceKm(latest.lat, latest.lon, memory.lat, memory.lon) < 25,
    );
    if (near.length === 1) {
      this.target = { lon: latest.lon, lat: latest.lat, zoom: latest.type === 'trip' ? 11 : 15 };
      return;
    }

    const lons = near.map((memory) => memory.lon);
    const lats = near.map((memory) => memory.lat);
    const lonSpan = Math.max(0.004, Math.max(...lons) - Math.min(...lons));
    const latSpan = Math.max(0.004, Math.max(...lats) - Math.min(...lats));
    const zoomByWidth = Math.log2((((window.innerWidth - 240) / 256) * 360) / lonSpan);
    const zoomByHeight = Math.log2((((window.innerHeight - 260) / 256) * 170) / latSpan);
    this.target = {
      lon: (Math.max(...lons) + Math.min(...lons)) / 2,
      lat: (Math.max(...lats) + Math.min(...lats)) / 2,
      zoom: Math.min(15, zoomByWidth, zoomByHeight),
    };
  }

  private updateCamera(force = false): void {
    if (!this.map || !this.section) return;

    const top = this.section.nativeElement.getBoundingClientRect().top;
    const progress = this.reduceMotion ? 1 : clamp(-top / (window.innerHeight * DESCENT_SCREENS));
    this.progress.set(progress);

    if (!force && Math.abs(progress - this.lastProgress) < 0.0005) return;
    this.lastProgress = progress;

    const worldZoom = this.worldZoom();
    const target = this.target ?? { lon: WORLD_CENTER[0], lat: WORLD_CENTER[1], zoom: worldZoom };

    const travel = ease(clamp(progress / 0.5));
    const descend = ease(clamp((progress - 0.15) / 0.85));
    const lon = WORLD_CENTER[0] + (target.lon - WORLD_CENTER[0]) * travel;
    const lat = WORLD_CENTER[1] + (target.lat - WORLD_CENTER[1]) * travel;
    const zoom = worldZoom + (target.zoom - worldZoom) * descend;

    const padding = {
      top: window.innerHeight * 0.28 * (1 - descend),
      bottom: 0,
      left: 0,
      right: 0,
    };
    this.map.jumpTo({ center: [lon, lat], zoom, padding });

    const element = this.mapElement.nativeElement;
    element.classList.toggle('with-pins', zoom > 9);
    element.classList.toggle('with-highlight', zoom < 7);
  }

  private onScroll = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.updateCamera();
    });
  };

  private onResize = (): void => {
    this.findTarget();
    this.updateCamera(true);
  };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function ease(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}
