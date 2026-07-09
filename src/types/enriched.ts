import type { Wartungsvertraege } from './app';

export type EnrichedWartungsvertraege = Wartungsvertraege & {
  kundeName: string;
};
