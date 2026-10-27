import { Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  imports: [TranslatePipe],
  selector: 'app-memories-loader',
  styleUrl: './memories-loader.css',
  templateUrl: './memories-loader.html',
})
export class MemoriesLoader {
  readonly photos = [
    'images/programs/restaurant.jpg',
    'images/programs/experience.jpg',
    'images/programs/trip.jpg',
  ];
}
