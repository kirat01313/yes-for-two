import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { fieldsMatch } from '../../utils/validators';

type SaveStatus = '' | 'saving' | 'saved' | 'error';

@Component({
  imports: [ReactiveFormsModule, DatePipe, TranslatePipe],
  selector: 'app-account',
  styleUrl: './account.css',
  templateUrl: './account.html',
})
export class Account implements OnInit {
  readonly auth = inject(AuthService);
  readonly language = inject(LanguageService);

  readonly nameForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(40)] }),
  });

  readonly passwordForm = new FormGroup(
    {
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: fieldsMatch('newPassword', 'confirmPassword') },
  );

  readonly nameStatus = signal<SaveStatus>('');
  readonly passwordStatus = signal<SaveStatus>('');
  readonly showPassword = signal(false);
  readonly passwordErrorKey = signal('');

  ngOnInit(): void {
    this.nameForm.setValue({ name: this.auth.name() });
  }

  saveName(): void {
    if (this.nameForm.invalid) {
      return;
    }
    this.nameStatus.set('saving');

    this.auth.saveName(this.nameForm.getRawValue().name.trim()).subscribe({
      next: () => {
        this.nameStatus.set('saved');
        this.nameForm.markAsPristine();
      },
      error: () => this.nameStatus.set('error'),
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.passwordStatus.set('saving');

    this.auth.changePassword(this.passwordForm.getRawValue().newPassword).subscribe({
      next: () => {
        this.passwordStatus.set('saved');
        this.passwordForm.reset();
      },
      error: (error) => {
        this.passwordErrorKey.set(this.auth.errorKey(error));
        this.passwordStatus.set('error');
      },
    });
  }
}
