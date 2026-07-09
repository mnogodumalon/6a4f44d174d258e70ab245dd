import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichWartungsvertraege } from '@/lib/enrich';
import type { EnrichedWartungsvertraege } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconCalendarExclamation, IconPlus, IconTools, IconUsers, IconCoin } from '@tabler/icons-react';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { gruss, useClock, namen, undoToast } from '@/lib/polish';
import { WartungsvertraegeDialog } from '@/components/dialogs/WartungsvertraegeDialog';
import { KundenverwaltungDialog } from '@/components/dialogs/KundenverwaltungDialog';
import {
  RecordOverlay,
  RecordHeader,
  RecordSection,
  RecordField,
  RecordKeyFacts,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import {
  TableWidget,
  TableSkeleton,
  TableError,
  TableEmpty,
  type TableColumn,
  type TableRow,
  type TableTone,
} from '@/components/widgets/TableWidget';
import {
  ChartWidget,
  ChartSkeleton,
  ChartError,
  type ChartRow,
  type ChartSegment,
} from '@/components/widgets/ChartWidget';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

const APPGROUP_ID = '6a4f44d174d258e70ab245dd';
const REPAIR_ENDPOINT = '/claude/build/repair';

type OverlayItem =
  | { type: 'vertrag'; record: EnrichedWartungsvertraege }
  | { type: 'edit-vertrag'; record: EnrichedWartungsvertraege }
  | { type: 'new-vertrag' }
  | { type: 'new-kunde' };

function toneForStatus(status: string | undefined): TableTone {
  if (status === 'ueberfaellig') return 'destructive';
  if (status === 'geplant') return 'warning';
  if (status === 'durchgefuehrt') return 'success';
  return 'default';
}

export default function DashboardOverview() {
  const {
    kundenverwaltung, wartungsvertraege,
    setWartungsvertraege,
    kundenverwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [statusFilter, setStatusFilter] = useState<ChartSegment<EnrichedWartungsvertraege> | null>(null);
  const [dialogOpen, setDialogOpen] = useState<'vertrag' | 'kunde' | null>(null);
  const [editingVertrag, setEditingVertrag] = useState<EnrichedWartungsvertraege | null>(null);

  const enrichedVertraege = useMemo(
    () => enrichWartungsvertraege(wartungsvertraege, { kundenverwaltungMap }),
    [wartungsvertraege, kundenverwaltungMap]
  );

  // Status-based buckets
  const today = format(clock, 'yyyy-MM-dd');
  const ueberfaellig = useMemo(
    () => enrichedVertraege.filter(v => lookupKey(v.fields.wartungsstatus) === 'ueberfaellig'),
    [enrichedVertraege]
  );
  const baldFaellig = useMemo(
    () => enrichedVertraege.filter(v => {
      if (!v.fields.naechste_wartung) return false;
      const next = v.fields.naechste_wartung.slice(0, 10);
      return next >= today && next <= format(addDays(clock, 30), 'yyyy-MM-dd') && lookupKey(v.fields.wartungsstatus) !== 'durchgefuehrt';
    }),
    [enrichedVertraege, today, clock]
  );
  const geplant = useMemo(() => enrichedVertraege.filter(v => lookupKey(v.fields.wartungsstatus) === 'geplant'), [enrichedVertraege]);
  const gesamtjahreswert = useMemo(() => enrichedVertraege.reduce((s, v) => s + (v.fields.jahreswert ?? 0), 0), [enrichedVertraege]);
  const durchgefuehrt = useMemo(() => enrichedVertraege.filter(v => lookupKey(v.fields.wartungsstatus) === 'durchgefuehrt'), [enrichedVertraege]);

  // Advance status: geplant → durchgefuehrt
  const advanceStatus = (v: EnrichedWartungsvertraege) => {
    const prevStatus = v.fields.wartungsstatus;
    const optimistic = enrichedVertraege.map(r =>
      r.record_id === v.record_id
        ? { ...r, fields: { ...r.fields, wartungsstatus: LOOKUP_OPTIONS['wartungsvertraege']['wartungsstatus'].find(o => o.key === 'durchgefuehrt') } }
        : r
    );
    setWartungsvertraege(optimistic.map(r => ({ ...r })));
    LivingAppsService.updateWartungsvertraegeEntry(v.record_id, { wartungsstatus: 'durchgefuehrt' }).catch(() => fetchAll());
    undoToast(
      `Wartung für ${v.kundeName || 'Unbekannt'} als durchgeführt markiert`,
      () => {
        setWartungsvertraege(enrichedVertraege.map(r => ({ ...r })));
        LivingAppsService.updateWartungsvertraegeEntry(v.record_id, { wartungsstatus: prevStatus ? (typeof prevStatus === 'object' && 'key' in prevStatus ? (prevStatus as { key: string }).key : String(prevStatus)) : 'geplant' }).catch(() => fetchAll());
      }
    );
  };

  // Hero: first overdue record
  const heroBanner = ueberfaellig.length > 0 ? (
    <HeroBanner
      tone="destructive"
      icon={<IconCalendarExclamation size={18} />}
      action={{ label: 'Als erledigt markieren', onClick: () => advanceStatus(ueberfaellig[0]) }}
    >
      <b>{namen(ueberfaellig.map(r => r.kundeName || 'Unbekannt'))}</b> — {ueberfaellig.length === 1 ? 'Wartung überfällig' : `${ueberfaellig.length} Wartungen überfällig`}.
    </HeroBanner>
  ) : null;

  // Table columns
  const columns: TableColumn<EnrichedWartungsvertraege>[] = [
    {
      key: 'kunde',
      label: 'Kunde',
      accessor: (row) => row.data.kundeName,
      format: 'text',
      cardRole: 'title',
      priority: 100,
      filterable: true,
    },
    {
      key: 'anlagentyp',
      label: 'Anlagentyp',
      accessor: (row) => row.data.fields.anlagentyp,
      format: 'pill',
      cardRole: 'subtitle',
    },
    {
      key: 'naechste_wartung',
      label: 'Nächste Wartung',
      accessor: (row) => row.data.fields.naechste_wartung,
      format: 'date',
      cardRole: 'body',
      filterable: true,
      filterKind: 'range',
    },
    {
      key: 'wartungsstatus',
      label: 'Status',
      accessor: (row) => row.data.fields.wartungsstatus,
      format: 'pill',
      cardRole: 'body',
      filterable: true,
      responsive: 'keep',
    },
    {
      key: 'wartungsintervall',
      label: 'Intervall',
      accessor: (row) => row.data.fields.wartungsintervall,
      format: 'pill',
    },
    {
      key: 'jahreswert',
      label: 'Jahreswert (€)',
      accessor: (row) => row.data.fields.jahreswert,
      format: 'currency',
      align: 'right',
      aggregate: 'sum',
      priority: 100,
    },
  ];

  const tableRows: TableRow<EnrichedWartungsvertraege>[] = useMemo(
    () =>
      (statusFilter ? enrichedVertraege.filter(r => statusFilter.test({ id: `vertrag:${r.record_id}`, data: r } as ChartRow<EnrichedWartungsvertraege>)) : enrichedVertraege).map(v => ({
        id: `vertrag:${v.record_id}`,
        data: v,
        tone: toneForStatus(lookupKey(v.fields.wartungsstatus)),
      })),
    [enrichedVertraege, statusFilter]
  );

  const chartRows: ChartRow<EnrichedWartungsvertraege>[] = useMemo(
    () => enrichedVertraege.map(v => ({ id: `vertrag:${v.record_id}`, data: v })),
    [enrichedVertraege]
  );

  // WorkList: fällig & überfällig
  const worklistItems = useMemo(
    () =>
      [...ueberfaellig, ...baldFaellig.filter(v => !ueberfaellig.find(u => u.record_id === v.record_id))]
        .sort((a, b) => (a.fields.naechste_wartung ?? '').localeCompare(b.fields.naechste_wartung ?? ''))
        .map(v => {
          const statusKey = lookupKey(v.fields.wartungsstatus);
          const isOverdue = statusKey === 'ueberfaellig';
          return {
            id: v.record_id,
            title: v.kundeName || 'Unbekannt',
            icon: <IconTools size={14} className="shrink-0 text-muted-foreground" />,
            secondLine: (
              <>
                <span className={isOverdue ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                  {isOverdue ? 'Überfällig' : 'Bald fällig'}
                </span>
                <span className="text-muted-foreground"> · {formatDate(v.fields.naechste_wartung)}</span>
              </>
            ),
            action: statusKey !== 'durchgefuehrt'
              ? { label: '✓ Durchgeführt', onClick: () => advanceStatus(v) }
              : undefined,
          };
        }),
    [ueberfaellig, baldFaellig, enrichedVertraege]
  );

  // Needed for hooks before early returns
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const contextLine = enrichedVertraege.length === 0
    ? 'Noch keine Wartungsverträge angelegt.'
    : ueberfaellig.length > 0
    ? `${ueberfaellig.length} ${ueberfaellig.length === 1 ? 'Vertrag überfällig' : 'Verträge überfällig'} — ${namen(ueberfaellig.map(r => r.kundeName || ''))} bitte kontaktieren.`
    : geplant.length > 0
    ? `${geplant.length} ${geplant.length === 1 ? 'Wartung geplant' : 'Wartungen geplant'} — alles im Zeitplan.`
    : 'Alle Wartungen aktuell durchgeführt.';

  // Current overlay record
  const currentItem = overlay.current;
  const currentVertrag =
    currentItem?.type === 'vertrag' || currentItem?.type === 'edit-vertrag'
      ? currentItem.record
      : null;

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground truncate max-w-xl">{contextLine}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => { setDialogOpen('kunde'); }}>
            <IconUsers size={14} className="mr-1.5 shrink-0" />
            Kunde anlegen
          </Button>
          <Button size="sm" onClick={() => { setEditingVertrag(null); setDialogOpen('vertrag'); }}>
            <IconPlus size={14} className="mr-1.5 shrink-0" />
            Neuer Vertrag
          </Button>
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroBanner}
        kpis={
          <StatStrip>
            <StatStripItem
              title="Durchgeführt"
              value={durchgefuehrt.length}
              tone={durchgefuehrt.length === enrichedVertraege.length && enrichedVertraege.length > 0 ? 'success' : 'default'}
              icon={<IconTools size={16} />}
            />
            <StatStripItem
              title="Überfällig"
              value={ueberfaellig.length}
              tone={ueberfaellig.length > 0 ? 'destructive' : 'default'}
              icon={<IconCalendarExclamation size={16} />}
            />
            <StatStripItem
              title="Bald fällig (30 Tage)"
              value={baldFaellig.length}
              tone={baldFaellig.length > 0 ? 'warning' : 'default'}
              icon={<IconCalendarExclamation size={16} />}
            />
            <StatStripItem
              title="Jahresumsatz"
              value={formatCurrency(gesamtjahreswert)}
              icon={<IconCoin size={16} />}
            />
          </StatStrip>
        }
        aside={
          <>
            <WorkList
              title="Überfällig & bald fällig"
              icon={<IconCalendarExclamation size={14} />}
              items={worklistItems}
              onItemClick={(id) => {
                const v = enrichedVertraege.find(r => r.record_id === id);
                if (v) overlay.replace({ type: 'vertrag', record: v });
              }}
              empty={{
                text: 'Alle Wartungen im Zeitplan — nichts dringend fällig.',
                action: { label: 'Neuer Vertrag', onClick: () => { setEditingVertrag(null); setDialogOpen('vertrag'); } },
              }}
              max={6}
            />
            {enrichedVertraege.length > 0 && (
              loading ? <ChartSkeleton /> : (
                <ChartWidget
                  title="Anlagen nach Typ"
                  rows={chartRows}
                  dimension={{ kind: 'category', accessor: (row) => row.data.fields.anlagentyp }}
                  interaction={{
                    mode: 'filter',
                    selectedKey: statusFilter?.key ?? null,
                    onSelect: (seg) => setStatusFilter(seg),
                  }}
                />
              )
            )}
          </>
        }
        primary={
          enrichedVertraege.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[27px] bg-card shadow-lg p-12 gap-4">
              <IconTools size={48} className="text-muted-foreground" stroke={1.5} />
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">Noch keine Wartungsverträge</h3>
                <p className="text-sm text-muted-foreground">Lege deinen ersten Wartungsvertrag an, um loszulegen.</p>
              </div>
              <Button onClick={() => { setEditingVertrag(null); setDialogOpen('vertrag'); }}>
                <IconPlus size={14} className="mr-1.5" />
                Ersten Vertrag anlegen
              </Button>
            </div>
          ) : (
            <TableWidget
              columns={columns}
              rows={tableRows}
              locale="de"
              onRowClick={(row) => overlay.replace({ type: 'vertrag', record: row.data })}
              toneForRow={(row) => toneForStatus(lookupKey(row.data.fields.wartungsstatus))}
              toolbarEnd={
                <Button size="sm" onClick={() => { setEditingVertrag(null); setDialogOpen('vertrag'); }}>
                  <IconPlus size={14} className="mr-1" />
                  Neuer Vertrag
                </Button>
              }
              actions={[
                {
                  icon: IconTools,
                  label: 'Bearbeiten',
                  onClick: (row) => {
                    setEditingVertrag(row.data);
                    setDialogOpen('vertrag');
                  },
                },
              ]}
            />
          )
        }
      />

      {/* Record detail overlay */}
      <RecordOverlay
        open={overlay.open && currentItem?.type === 'vertrag'}
        onClose={overlay.close}
        onEdit={() => {
          if (currentVertrag) {
            setEditingVertrag(currentVertrag);
            setDialogOpen('vertrag');
          }
        }}
        footer={
          currentVertrag && lookupKey(currentVertrag.fields.wartungsstatus) !== 'durchgefuehrt'
            ? (
              <Button size="sm" onClick={() => { advanceStatus(currentVertrag); overlay.close(); }}>
                ✓ Als durchgeführt markieren
              </Button>
            )
            : undefined
        }
      >
        {currentVertrag && (
          <>
            <RecordHeader
              title={currentVertrag.kundeName || 'Unbekannt'}
              subtitle={currentVertrag.fields.anlagentyp?.label}
              badges={
                currentVertrag.fields.wartungsstatus && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      lookupKey(currentVertrag.fields.wartungsstatus) === 'ueberfaellig'
                        ? 'bg-destructive/10 text-destructive'
                        : lookupKey(currentVertrag.fields.wartungsstatus) === 'durchgefuehrt'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {currentVertrag.fields.wartungsstatus?.label}
                  </span>
                )
              }
            />
            <RecordKeyFacts
              items={[
                { label: 'Nächste Wartung', value: formatDate(currentVertrag.fields.naechste_wartung) },
                { label: 'Letzte Wartung', value: formatDate(currentVertrag.fields.letzte_wartung) },
                { label: 'Jahreswert', value: formatCurrency(currentVertrag.fields.jahreswert) },
              ]}
            />
            <RecordSection title="Anlagenstandort">
              <RecordField
                label="Adresse"
                value={[
                  currentVertrag.fields.anlagenstandort_strasse,
                  currentVertrag.fields.anlagenstandort_hausnummer,
                  currentVertrag.fields.anlagenstandort_plz,
                  currentVertrag.fields.anlagenstandort_ort,
                ].filter(Boolean).join(' ') || undefined}
              />
            </RecordSection>
            <RecordSection title="Vertragsdetails">
              <RecordField label="Anlagentyp" value={currentVertrag.fields.anlagentyp?.label} />
              <RecordField label="Wartungsintervall" value={currentVertrag.fields.wartungsintervall?.label} />
              <RecordField label="Bemerkungen" value={currentVertrag.fields.bemerkungen} format="longtext" />
            </RecordSection>
            <RecordAttachments appId={APP_IDS.WARTUNGSVERTRAEGE} recordId={currentVertrag.record_id} />
          </>
        )}
      </RecordOverlay>

      {/* Wartungsvertrag create/edit dialog */}
      <WartungsvertraegeDialog
        open={dialogOpen === 'vertrag'}
        onClose={() => { setDialogOpen(null); setEditingVertrag(null); }}
        onSubmit={async (fields) => {
          if (editingVertrag) {
            await LivingAppsService.updateWartungsvertraegeEntry(editingVertrag.record_id, fields);
          } else {
            await LivingAppsService.createWartungsvertraegeEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editingVertrag?.fields}
        recordId={editingVertrag?.record_id}
        kundenverwaltungList={kundenverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Wartungsvertraege']}
      />

      {/* Kundenverwaltung create dialog */}
      <KundenverwaltungDialog
        open={dialogOpen === 'kunde'}
        onClose={() => setDialogOpen(null)}
        onSubmit={async (fields) => {
          await LivingAppsService.createKundenverwaltungEntry(fields);
          fetchAll();
        }}
        enablePhotoScan={AI_PHOTO_SCAN['Kundenverwaltung']}
      />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
