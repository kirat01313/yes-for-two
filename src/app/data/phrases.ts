import { DestinationType } from '../models/destination';
import { Phrase } from '../models/suggestion';

export const TRIP_PHRASES: Record<DestinationType, Phrase[]> = {
  city: [
    {
      text: {
        en: 'New streets to get lost in, hand in hand.',
        pt: 'Ruas novas para se perderem de mão dada.',
      },
    },
    {
      text: {
        en: 'A city that does not know you yet. Let it meet you as two.',
        pt: 'Uma cidade que ainda não vos conhece. Deixem que vos conheça a dois.',
      },
    },
    {
      text: {
        en: 'Coffee in a square, dinner by the river and no plans in between.',
        pt: 'Café numa praça, jantar à beira-rio e nenhum plano pelo meio.',
      },
    },
  ],
  beach: [
    {
      text: {
        en: 'Salt on the skin and nowhere else to be.',
        pt: 'Sal na pele e nenhum outro sítio onde estar.',
      },
    },
    {
      text: {
        en: 'The sea has room for two. And for everything you never said.',
        pt: 'O mar tem lugar para dois. E para tudo o que ainda não disseram.',
      },
    },
    {
      text: {
        en: 'Sunsets are better when someone holds your hand.',
        pt: 'O pôr do sol é melhor quando alguém vos dá a mão.',
      },
    },
  ],
  nature: [
    {
      text: {
        en: 'Fewer screens, more mountains, the two of you.',
        pt: 'Menos ecrãs, mais montanha, vocês os dois.',
      },
    },
    {
      text: {
        en: 'Trails, silence and a view worth the climb.',
        pt: 'Trilhos, silêncio e uma vista que vale a subida.',
      },
    },
    {
      text: {
        en: 'Where the phone has no signal, you find each other.',
        pt: 'Onde o telemóvel perde a rede, vocês encontram-se.',
      },
    },
  ],
};

export const PHRASES_FOR_TWO: Phrase[] = [
  {
    text: { en: 'Love is a fire that burns unseen.', pt: 'Amor é fogo que arde sem se ver.' },
    author: 'Luís de Camões',
  },
  {
    text: {
      en: 'The lover turns into the one he loves.',
      pt: 'Transforma-se o amador na cousa amada.',
    },
    author: 'Luís de Camões',
  },
  {
    text: { en: 'I want to love, to love madly!', pt: 'Eu quero amar, amar perdidamente!' },
    author: 'Florbela Espanca',
  },
  { text: { en: 'Today, the world can wait.', pt: 'Hoje, o mundo pode esperar.' } },
  {
    text: {
      en: 'Some places are only beautiful when you go as two.',
      pt: 'Há sítios que só ficam bonitos quando se vai a dois.',
    },
  },
  {
    text: {
      en: 'The best plans are the ones nobody planned.',
      pt: 'Os melhores planos são os que não se planeiam.',
    },
  },
  {
    text: {
      en: 'May today become a story to tell.',
      pt: 'Que hoje vire uma história para contar.',
    },
  },
  {
    text: {
      en: 'Today you choose nothing. Just each other.',
      pt: 'Hoje não escolhem nada. Só se escolhem um ao outro.',
    },
  },
  {
    text: {
      en: 'A new place, the same wish to be with you.',
      pt: 'Um lugar novo, a mesma vontade de estar contigo.',
    },
  },
  {
    text: {
      en: 'The rest of the day can wait: now it is just the two of you.',
      pt: 'O resto do dia que espere: agora são só vocês.',
    },
  },
];

export const DINNER_PHRASES: Phrase[] = [
  {
    text: {
      en: 'Two glasses, one table and no clock.',
      pt: 'Dois copos, uma mesa e tempo sem relógio.',
    },
  },
  {
    text: {
      en: 'May the conversation last longer than dessert.',
      pt: 'Que a conversa dure mais do que a sobremesa.',
    },
  },
  {
    text: {
      en: 'Tonight the table is yours and the rush stays outside.',
      pt: 'Esta noite, a mesa é vossa e a pressa fica à porta.',
    },
  },
];
