import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService, SignUpResult } from '../../services/auth.service';
import { MemoriesService } from '../../services/memories.service';
import { fieldsMatch } from '../../utils/validators';

type Mode = 'sign-in' | 'create';

@Component({
  imports: [ReactiveFormsModule, TranslatePipe],
  selector: 'app-sign-in',
  styleUrl: './sign-in.css',
  templateUrl: './sign-in.html',
})
export class SignIn implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private memories = inject(MemoriesService);

  @Input() returnTo?: string;

  @Input() set mode(value: string | undefined) {
    this.changeMode(value === 'create' ? 'create' : 'sign-in');
  }

  readonly image =
    'https://images.pexels.com/photos/14493721/pexels-photo-14493721.jpeg?auto=compress&cs=tinysrgb&w=1400';

  readonly currentMode = signal<Mode>('sign-in');
  readonly sending = signal(false);
  readonly showPassword = signal(false);
  readonly errorKey = signal('');
  readonly emailSentTo = signal('');

  readonly form = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: new FormControl(
        { value: '', disabled: true },
        { nonNullable: true, validators: [Validators.required] },
      ),
    },
    { validators: fieldsMatch('password', 'confirmPassword') },
  );

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    if (this.auth.signedIn()) {
      this.afterSignIn();
    }
  }

  changeMode(mode: Mode): void {
    this.currentMode.set(mode);
    this.errorKey.set('');
    this.emailSentTo.set('');

    const confirmPassword = this.form.controls.confirmPassword;
    if (mode === 'create') {
      confirmPassword.enable();
    } else {
      confirmPassword.disable();
    }
    confirmPassword.reset();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.sending.set(true);
    this.errorKey.set('');

    const request: Observable<SignUpResult | void> =
      this.currentMode() === 'sign-in'
        ? this.auth.signIn(email, password)
        : this.auth.signUp(email, password);

    request.subscribe({
      next: (result) => {
        this.sending.set(false);
        if (result === 'confirm-email') {
          this.changeMode('sign-in');
          this.emailSentTo.set(email);
          this.form.controls.password.reset();
        } else {
          this.afterSignIn();
        }
      },
      error: (error) => {
        this.sending.set(false);
        this.errorKey.set(this.auth.errorKey(error));
      },
    });
  }

  private afterSignIn(): void {
    const target = this.returnTo?.startsWith('/') ? this.returnTo : '/memories';
    if (!this.memories.hasPending()) {
      this.router.navigateByUrl(target);
      return;
    }
    this.memories.savePending().subscribe({
      next: (memory) =>
        this.router.navigate(['/memories'], { queryParams: memory ? { id: memory.id } : {} }),
      error: () => this.router.navigateByUrl(target),
    });
  }
}
