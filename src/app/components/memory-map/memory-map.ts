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
  inject,
} from '@angular/core';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { Feature, FeatureCollection } from 'geojson';
import { GeoJSONSource, Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import { LAND_DOTS } from '../../data/land-dots';
import { Memory } from '../../models/memory';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href);

const WORLD_CENTER: [number, number] = [12, 22];

const LAND: FeatureCollection = {
  type: 'FeatureCollection',
  features: LAND_DOTS.map(([lon, lat]) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [lon, lat] },
  })),
};

@Component({
  imports: [DatePipe, TranslatePipe],
  selector: 'app-memory-map',
  styleUrl: './memory-map.css',
  templateUrl: './memory-map.html',
})
export class MemoryMap implements AfterViewInit, OnChanges, OnDestroy {
  readonly language = inject(LanguageService);

  @Input({ required: true }) memories: Memory[] = [];
  @Output() select = new EventEmitter<number>();

  @ViewChild('map') mapElement!: ElementRef<HTMLDivElement>;

  private map?: MapLibreMap;
  private loaded = false;

  get recent(): Memory[] {
    return this.memories.slice(0, 5);
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
    });
  }

  ngOnChanges(): void {
    if (this.loaded) this.drawMemories();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private style(): StyleSpecification {
    return {
      version: 8,
      sources: {
        land: { type: 'geojson', data: LAND },
        yeses: { type: 'geojson', data: this.yesPoints() },
        route: { type: 'geojson', data: this.route() },
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#faf7f2' } },
        {
          id: 'land',
          type: 'circle',
          source: 'land',
          paint: {
            'circle-color': '#1f1917',
            'circle-radius': ['interpolate', ['exponential', 1.6], ['zoom'], 0, 1.6, 4, 3.2, 7, 7],
            'circle-opacity': 0.2,
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
            'line-opacity': 0.85,
          },
        },
        {
          id: 'yeses',
          type: 'circle',
          source: 'yeses',
          paint: {
            'circle-color': '#aa2d31',
            'circle-radius': ['case', ['get', 'latest'], 5.5, 3.5],
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
    (this.map?.getSource('yeses') as GeoJSONSource | undefined)?.setData(this.yesPoints());
    (this.map?.getSource('route') as GeoJSONSource | undefined)?.setData(this.route());
  }

  private worldZoom(): number {
    return Math.log2(window.innerWidth / 512);
  }
}
