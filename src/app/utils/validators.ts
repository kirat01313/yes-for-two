import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function fieldsMatch(field: string, confirmation: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const first = group.get(field);
    const second = group.get(confirmation);

    if (!first || !second || second.disabled) {
      return null;
    }

    return first.value === second.value ? null : { fieldsDiffer: true };
  };
}
