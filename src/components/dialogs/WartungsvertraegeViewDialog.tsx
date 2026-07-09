import type { Wartungsvertraege, Kundenverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface WartungsvertraegeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Wartungsvertraege | null;
  onEdit: (record: Wartungsvertraege) => void;
  kundenverwaltungList: Kundenverwaltung[];
}

export function WartungsvertraegeViewDialog({ open, onClose, record, onEdit, kundenverwaltungList }: WartungsvertraegeViewDialogProps) {
  function getKundenverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenverwaltungList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wartungsverträge anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kunde</Label>
            <p className="text-sm">{getKundenverwaltungDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagentyp</Label>
            <Badge variant="secondary">{record.fields.anlagentyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagenstandort – Straße</Label>
            <p className="text-sm">{record.fields.anlagenstandort_strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagenstandort – Hausnummer</Label>
            <p className="text-sm">{record.fields.anlagenstandort_hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagenstandort – Postleitzahl</Label>
            <p className="text-sm">{record.fields.anlagenstandort_plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagenstandort – Ort</Label>
            <p className="text-sm">{record.fields.anlagenstandort_ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wartungsintervall</Label>
            <Badge variant="secondary">{record.fields.wartungsintervall?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der letzten Wartung</Label>
            <p className="text-sm">{formatDate(record.fields.letzte_wartung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste Wartung fällig am</Label>
            <p className="text-sm">{formatDate(record.fields.naechste_wartung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wartungsstatus</Label>
            <Badge variant="secondary">{record.fields.wartungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Jährlicher Vertragswert (€)</Label>
            <p className="text-sm">{record.fields.jahreswert ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.WARTUNGSVERTRAEGE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}