import { FormControl, FormGroup } from '@angular/forms';
import {
  choiceGroup,
  fieldsMatch,
  notInFuture,
  selectedValues,
  setAll,
  todayIso,
} from './validators';

describe('validators', () => {
  it('todayIso gives today as YYYY-MM-DD', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(todayIso()).getDate()).toBe(new Date().getDate());
  });

  it('notInFuture accepts today and the past, and blocks tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    expect(notInFuture(new FormControl(todayIso()))).toBeNull();
    expect(notInFuture(new FormControl('2020-01-01'))).toBeNull();
    expect(notInFuture(new FormControl(''))).toBeNull();
    expect(notInFuture(new FormControl(tomorrowIso))).toEqual({ futureDate: true });
  });

  it('fieldsMatch compares two fields of a group', () => {
    const group = new FormGroup(
      { password: new FormControl('secret1'), confirm: new FormControl('secret2') },
      { validators: fieldsMatch('password', 'confirm') },
    );
    expect(group.hasError('fieldsDiffer')).toBe(true);

    group.controls.confirm.setValue('secret1');
    expect(group.hasError('fieldsDiffer')).toBe(false);
  });

  it('choiceGroup starts with everything ticked and needs at least one', () => {
    const group = choiceGroup(['city', 'beach', 'nature']);
    expect(selectedValues(group)).toEqual(['city', 'beach', 'nature']);
    expect(group.valid).toBe(true);

    setAll(group, false);
    expect(selectedValues(group)).toEqual([]);
    expect(group.hasError('noneChosen')).toBe(true);

    group.controls['beach'].setValue(true);
    expect(selectedValues(group)).toEqual(['beach']);
    expect(group.valid).toBe(true);
  });
});
