import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Text, Translated } from '../../models/language';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { ChoiceGroup, setAll } from '../../utils/validators';

export interface ChoiceOption {
  value: string;
  name: Translated;
  icon: string;
  group?: Translated;
}

@Component({
  imports: [ReactiveFormsModule, TranslatePipe],
  selector: 'app-choice-selector',
  styleUrl: './choice-selector.css',
  templateUrl: './choice-selector.html',
  host: { class: 'field' },
})
export class ChoiceSelector {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly language = inject(LanguageService);

  @Input({ required: true }) key!: string;
  @Input({ required: true }) label!: Text;
  @Input({ required: true }) group!: ChoiceGroup;
  @Input({ required: true }) options!: readonly ChoiceOption[];
  @Input() allText: Text = 'choices.all';
  @Input() errorMessage: Text = '';

  @ViewChild('toggle') toggle?: ElementRef<HTMLButtonElement>;

  readonly open = signal(false);

  summary(): string {
    const lang = this.language.lang();
    const checked = this.options.filter((option) => this.group.controls[option.value].value);
    const names = checked.map((option) => option.name[lang]);

    if (checked.length === this.options.length) return this.language.translate(this.allText);
    if (checked.length === 0) return lang === 'pt' ? 'Nenhuma escolhida' : 'None chosen';
    if (checked.length <= 2) return names.join(lang === 'pt' ? ' e ' : ' and ');
    return lang === 'pt'
      ? `${names[0]} e mais ${checked.length - 1}`
      : `${names[0]} and ${checked.length - 1} more`;
  }

  startsGroup(index: number): boolean {
    const group = this.options[index].group;
    return !!group && (index === 0 || this.options[index - 1].group !== group);
  }

  switchOpen(): void {
    this.open.update((open) => !open);
  }

  checkAll(checked: boolean): void {
    setAll(this.group, checked);
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('keydown.escape')
  closeOnEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.toggle?.nativeElement.focus();
  }
}
