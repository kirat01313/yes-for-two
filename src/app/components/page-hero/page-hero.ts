import { Component, Input } from '@angular/core';
import { Text } from '../../models/language';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  imports: [TranslatePipe],
  selector: 'app-page-hero',
  styleUrl: './page-hero.css',
  templateUrl: './page-hero.html',
})
export class PageHero {
  @Input({ required: true }) image!: string;
  @Input({ required: true }) alt!: Text;
  @Input({ required: true }) eyebrow!: Text;
  @Input({ required: true }) title!: Text;
  @Input() focus = '50% 50%';
}
