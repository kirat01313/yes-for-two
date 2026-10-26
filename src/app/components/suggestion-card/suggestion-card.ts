import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Suggestion } from '../../models/suggestion';
import { DistancePipe } from '../../pipes/distance.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  imports: [CurrencyPipe, DatePipe, RouterLink, DistancePipe, TranslatePipe],
  selector: 'app-suggestion-card',
  styleUrl: './suggestion-card.css',
  templateUrl: './suggestion-card.html',
})
export class SuggestionCard {
  readonly language = inject(LanguageService);

  @Input({ required: true }) suggestion!: Suggestion;
  @Input() memoryId: number | null = null;
  @Input() saving = false;

  @Output() saidYes = new EventEmitter<Suggestion>();

  sayYes(): void {
    this.saidYes.emit(this.suggestion);
  }
}
