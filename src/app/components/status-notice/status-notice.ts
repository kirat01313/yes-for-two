import { Component, Input } from '@angular/core';
import { Text } from '../../models/language';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  imports: [TranslatePipe],
  selector: 'app-status-notice',
  styleUrl: './status-notice.css',
  templateUrl: './status-notice.html',
})
export class StatusNotice {
  @Input({ required: true }) status!: 'loading' | 'empty' | 'error';
  @Input({ required: true }) title!: Text;
  @Input() text: Text = '';
}
