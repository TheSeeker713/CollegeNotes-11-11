import { DEFAULT_APPEARANCE, type Appearance, type ThemeId, type ModeId } from '@collegenotes/domain';

export type VariantKey = `${ThemeId}-${ModeId}`;

export type SemanticTokens = {
  canvas: string;
  surface: string;
  notes: string;
  study: string;
  listen: string;
  text: string;
  secondary: string;
  border: string;
  accent: string;
  onAccent: string;
  error: string;
  warning: string;
  titleSurface: string;
  titleText: string;
  focus: string;
  fontUi: string;
  fontReading: string;
  fontHeading: string;
  cardRadiusPx: number;
};

export const VARIANTS: Record<VariantKey, SemanticTokens> = {
  'botanical-light': {
    canvas: '#F5F1E7', surface: '#FFFCF4', notes: '#E6EDD9', study: '#F1E1D3', listen: '#DEEAF0',
    text: '#202B24', secondary: '#455044', border: '#596352', accent: '#325739', onAccent: '#FFFFFF',
    error: '#A02628', warning: '#704500', titleSurface: '#E6EDD9', titleText: '#202B24', focus: '#325739',
    fontUi: 'system-ui, sans-serif', fontReading: 'system-ui, sans-serif', fontHeading: 'Georgia, serif', cardRadiusPx: 26
  },
  'botanical-dark': {
    canvas: '#111C17', surface: '#1A2B22', notes: '#24362A', study: '#352A25', listen: '#1E3039',
    text: '#F5F3E7', secondary: '#C6D0C1', border: '#819C89', accent: '#BBD5AB', onAccent: '#16231A',
    error: '#FFB4A6', warning: '#F6D58A', titleSurface: '#24362A', titleText: '#F5F3E7', focus: '#BBD5AB',
    fontUi: 'system-ui, sans-serif', fontReading: 'system-ui, sans-serif', fontHeading: 'Georgia, serif', cardRadiusPx: 26
  },
  'brutalist-light': {
    canvas: '#F2F3F0', surface: '#FFFFFF', notes: '#F1F3F7', study: '#E4EBFC', listen: '#E8EBEF',
    text: '#15191C', secondary: '#3D444A', border: '#626971', accent: '#153FBA', onAccent: '#FFFFFF',
    error: '#9F2027', warning: '#704300', titleSurface: '#15191C', titleText: '#FFFFFF', focus: '#153FBA',
    fontUi: 'system-ui, sans-serif', fontReading: 'system-ui, sans-serif', fontHeading: 'Impact, Haettenschweiler, Arial Narrow, sans-serif', cardRadiusPx: 8
  },
  'brutalist-dark': {
    canvas: '#111316', surface: '#202328', notes: '#242831', study: '#202C40', listen: '#1C2730',
    text: '#F5F6F7', secondary: '#C8D0DA', border: '#8E9BAC', accent: '#B9CEFF', onAccent: '#10254F',
    error: '#FFB4BA', warning: '#F3D29A', titleSurface: '#090B0D', titleText: '#F5F6F7', focus: '#B9CEFF',
    fontUi: 'system-ui, sans-serif', fontReading: 'system-ui, sans-serif', fontHeading: 'Impact, Haettenschweiler, Arial Narrow, sans-serif', cardRadiusPx: 8
  }
};

export function variantKey(appearance: Appearance = DEFAULT_APPEARANCE): VariantKey {
  return `${appearance.theme}-${appearance.mode}`;
}

export function tokensFor(appearance: Appearance = DEFAULT_APPEARANCE): SemanticTokens {
  return VARIANTS[variantKey(appearance)];
}

export const LOCAL_FONTS = ['system-ui', 'sans-serif', 'Georgia', 'serif', 'Impact', 'Haettenschweiler', 'Arial Narrow'] as const;
