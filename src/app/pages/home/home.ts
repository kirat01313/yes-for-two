import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  readonly verses = ['home.poem1', 'home.poem2', 'home.poem3', 'home.poem4'];
}