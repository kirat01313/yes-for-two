export type Lang = 'en' | 'pt';

export type Translated = Record<Lang, string>;

export type Text = string | Translated;
