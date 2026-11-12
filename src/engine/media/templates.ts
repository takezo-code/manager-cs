// Textos de mídia montados a partir de templates com variáveis. Escolha determinística pela semente.
import { INSTAGRAM_TEMPLATES } from '../../data/media/instagram';
import { NEWS_TEMPLATES } from '../../data/media/news';
import { TWEET_TEMPLATES } from '../../data/media/tweets';
import { hashString } from '../rng';

export const ALLOWED_VARS = ['jogador', 'time', 'rival', 'evento', 'valor', 'manager'] as const;
export type TemplateVar = (typeof ALLOWED_VARS)[number];

export interface Situation {
  vars: readonly TemplateVar[];
  lines: readonly string[];
}
export type TemplateGroup = Record<string, Situation>;

export const ALL_GROUPS = { news: NEWS_TEMPLATES, tweets: TWEET_TEMPLATES, instagram: INSTAGRAM_TEMPLATES };
export type NewsKind = keyof typeof NEWS_TEMPLATES;
export type TweetKind = keyof typeof TWEET_TEMPLATES;
export type InstagramKey = keyof typeof INSTAGRAM_TEMPLATES;

/** Troca as variáveis; lança se alguma ficar sem valor (nunca mostrar "{jogador}" na tela). */
export function fill(template: string, vars: Partial<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    if (v === undefined) throw new Error(`Template sem a variável {${k}}: ${template}`);
    return v;
  });
}

export const pick = <T>(list: readonly T[], seed: string): T => list[hashString(seed) % list.length];

/** Frase de uma situação, preenchida. */
export function say<G extends keyof typeof ALL_GROUPS>(group: G, key: keyof (typeof ALL_GROUPS)[G], vars: Partial<Record<TemplateVar, string>>, seed: string): string {
  const sit = (ALL_GROUPS[group] as TemplateGroup)[key as string];
  const first = hashString(`${String(group)}:${String(key)}:${seed}`) % sit.lines.length;
  // Uma frase com variável faltando não pode travar o dia: tenta as outras e, se nenhuma servir, limpa.
  for (let i = 0; i < sit.lines.length; i++) {
    try {
      return fill(sit.lines[(first + i) % sit.lines.length], vars);
    } catch {
      // próxima frase
    }
  }
  return sit.lines[first].replace(/\{\w+\}/g, '').replace(/\s{2,}/g, ' ').trim();
}

// ---------- Contas fictícias ----------

export interface Account {
  name: string;
  handle: string;
}

export const FANS: Account[] = [
  { name: 'Lucas | torcedor', handle: '@lucas_cs98' },
  { name: 'Bia 🔫', handle: '@biaheadshot' },
  { name: 'Rafinha', handle: '@rafinhaawp' },
  { name: 'Mari do CS', handle: '@maridocs' },
  { name: 'Pedro Clutch', handle: '@pedroclutch' },
  { name: 'Ju Smoke', handle: '@jusmoke' },
  { name: 'Thiago 1v5', handle: '@thiago1v5' },
  { name: 'Carol Eco', handle: '@carol_eco' },
  { name: 'Duda Flash', handle: '@dudaflash' },
  { name: 'Gui Entry', handle: '@guientry' },
  { name: 'Nanda Lurk', handle: '@nandalurk' },
  { name: 'Vini Retake', handle: '@viniretake' },
];

export const JOURNALISTS: Account[] = [
  { name: 'Rafa Lemos', handle: '@rafalemos_esports' },
  { name: 'Carla Duarte', handle: '@carladuarte_cs' },
  { name: 'Bruno Tavares', handle: '@brunotavares_gg' },
];

export const NEWS_ACCOUNT: Account = { name: 'HLTV Brasil (fã)', handle: '@hltvbr_fan' };
