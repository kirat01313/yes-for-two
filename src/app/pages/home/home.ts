import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PanelDirective } from '../../directives/panel.directive';
import { RevealDirective } from '../../directives/reveal.directive';
import { ProgramType } from '../../models/program';
import { TranslatePipe } from '../../pipes/translate.pipe';

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
})
export class Home {
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
}
