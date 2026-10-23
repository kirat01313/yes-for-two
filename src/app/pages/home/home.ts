import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PanelDirective } from '../../directives/panel.directive';
import { RevealDirective } from '../../directives/reveal.directive';
import { ProgramType } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

interface ProgramCard {
  type: ProgramType;
  path: string;
  icon: string;
  image: string;
}

@Component({
  imports: [RouterLink, TranslatePipe, RevealDirective, PanelDirective],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
  host: {
    '(window:scroll)': 'onScroll()',
    '(window:resize)': 'onScroll()',
  },
})
export class Home implements AfterViewInit, OnDestroy {
  @ViewChild('letter') letter?: ElementRef<HTMLElement>;

  private readonly language = inject(LanguageService);

  readonly verses = ['home.poem1', 'home.poem2', 'home.poem3', 'home.poem4'];

  readonly programs: ProgramCard[] = [
    {
      type: 'restaurant',
      path: '/restaurant',
      icon: 'restaurant',
      image: 'images/programs/restaurant.jpg',
    },
    {
      type: 'experience',
      path: '/experience',
      icon: 'palette',
      image: 'images/programs/experience.jpg',
    },
    { type: 'trip', path: '/trip', icon: 'flight_takeoff', image: 'images/programs/trip.jpg' },
  ];

  readonly steps = ['choose', 'tell', 'say'];

  readonly writingProgress = signal(0);
  private readonly lines = computed(() =>
    this.verses.map((verse) => this.language.translate(verse)),
  );
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private frame = 0;

  ngAfterViewInit(): void {
    if (this.reduceMotion) {
      this.writingProgress.set(1);
    } else {
      this.updateWriting();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  onScroll(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.updateWriting();
    });
  }

  mask(index: number): string {
    const lines = this.lines();
    const total = lines.join('').length;
    const before = lines.slice(0, index).join('').length;
    const written = (this.writingProgress() * total - before) / lines[index].length;
    const edge = Math.min(1, Math.max(0, written)) * 112 - 6;
    return `linear-gradient(to right, #000 ${edge}%, transparent ${edge + 6}%)`;
  }

  private updateWriting(): void {
    const letter = this.letter?.nativeElement;
    if (!letter || this.reduceMotion) return;
    const screen = window.innerHeight;
    const top = letter.getBoundingClientRect().top;
    const progress = (screen * 0.4 - top) / (screen * 0.7);
    this.writingProgress.set(Math.min(1, Math.max(0, progress)));
  }
}
