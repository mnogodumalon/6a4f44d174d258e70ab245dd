import type { EnrichedWartungsvertraege } from '@/types/enriched';
import type { Kundenverwaltung, Wartungsvertraege } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface WartungsvertraegeMaps {
  kundenverwaltungMap: Map<string, Kundenverwaltung>;
}

export function enrichWartungsvertraege(
  wartungsvertraege: Wartungsvertraege[],
  maps: WartungsvertraegeMaps
): EnrichedWartungsvertraege[] {
  return wartungsvertraege.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenverwaltungMap, 'vorname', 'nachname'),
  }));
}
