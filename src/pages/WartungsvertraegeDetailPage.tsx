import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Wartungsvertraege, Kundenverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { WartungsvertraegeDialog } from '@/components/dialogs/WartungsvertraegeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Wartungsvertraege';
import { evalComputed } from '@/config/form-enhancements/types';

export default function WartungsvertraegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Wartungsvertraege | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [kundenverwaltungList, setKundenverwaltungList] = useState<Kundenverwaltung[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, kundenverwaltungData] = await Promise.all([
        LivingAppsService.getWartungsvertraege(),
        LivingAppsService.getKundenverwaltung(),
      ]);
      setKundenverwaltungList(kundenverwaltungData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Wartungsvertraege['fields']) {
    if (!record) return;
    await LivingAppsService.updateWartungsvertraegeEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteWartungsvertraegeEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/wartungsvertraege');
  }

  function getKundenverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return kundenverwaltungList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/wartungsvertraege')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/wartungsvertraege')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.anlagenstandort_strasse ?? 'Wartungsverträge'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          kunde: kundenverwaltungList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Kunde" value={getKundenverwaltungDisplayName(record.fields.kunde)} format="text" />
        <RecordField label="Anlagentyp" value={record.fields.anlagentyp} format="pill" />
        <RecordField label="Anlagenstandort – Straße" value={record.fields.anlagenstandort_strasse} format="text" />
        <RecordField label="Anlagenstandort – Hausnummer" value={record.fields.anlagenstandort_hausnummer} format="text" />
        <RecordField label="Anlagenstandort – Postleitzahl" value={record.fields.anlagenstandort_plz} format="text" />
        <RecordField label="Anlagenstandort – Ort" value={record.fields.anlagenstandort_ort} format="text" />
        <RecordField label="Wartungsintervall" value={record.fields.wartungsintervall} format="pill" />
        <RecordField label="Datum der letzten Wartung" value={record.fields.letzte_wartung} format="date" />
        <RecordField label="Nächste Wartung fällig am" value={record.fields.naechste_wartung} format="date" />
        <RecordField label="Wartungsstatus" value={record.fields.wartungsstatus} format="pill" />
        <RecordField label="Jährlicher Vertragswert (€)" value={record.fields.jahreswert} format="text" />
        <RecordField label="Bemerkungen" value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.WARTUNGSVERTRAEGE} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <WartungsvertraegeDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        kundenverwaltungList={kundenverwaltungList}
        enablePhotoScan={AI_PHOTO_SCAN['Wartungsvertraege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Wartungsvertraege']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Wartungsverträge löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
