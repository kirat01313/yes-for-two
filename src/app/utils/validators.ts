import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export type ChoiceGroup = FormGroup<Record<string, FormControl<boolean>>>;

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

export function atLeastOne(group: AbstractControl): ValidationErrors | null {
  const values = Object.values(group.value as Record<string, boolean>);
  return values.some(Boolean) ? null : { noneChosen: true };
}

export function choiceGroup(values: readonly string[]): ChoiceGroup {
  const controls: Record<string, FormControl<boolean>> = {};
  for (const value of values) {
    controls[value] = new FormControl(true, { nonNullable: true });
  }
  return new FormGroup(controls, { validators: atLeastOne });
}

export function selectedValues(group: ChoiceGroup): string[] {
  return Object.entries(group.getRawValue())
    .filter(([, checked]) => checked)
    .map(([value]) => value);
}

export function setAll(group: ChoiceGroup, checked: boolean): void {
  for (const control of Object.values(group.controls)) {
    control.setValue(checked);
  }
  group.markAsTouched();
}
