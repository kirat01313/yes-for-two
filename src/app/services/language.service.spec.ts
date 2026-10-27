import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let language: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    language = TestBed.inject(LanguageService);
    language.set('en');
  });

  it('translates a key in both languages', () => {
    expect(language.translate('nav.memories')).toBe('Memories');
    language.set('pt');
    expect(language.translate('nav.memories')).toBe('Memórias');
  });

  it('translates a text that already has both languages', () => {
    const text = { en: 'Beach', pt: 'Praia' };
    expect(language.translate(text)).toBe('Beach');
    language.toggle();
    expect(language.translate(text)).toBe('Praia');
  });

  it('gives back the key when it does not exist', () => {
    expect(language.translate('nav.nothingHere')).toBe('nav.nothingHere');
  });

  it('uses the right locale and remembers the choice', () => {
    language.set('pt');
    TestBed.tick();
    expect(language.locale()).toBe('pt-PT');
    expect(document.documentElement.lang).toBe('pt-PT');
    expect(localStorage.getItem('yes-for-two:lang')).toBe('pt');
  });
});
