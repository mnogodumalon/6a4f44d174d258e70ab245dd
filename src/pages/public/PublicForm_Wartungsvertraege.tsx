import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a4f44bebe3ad15592c09ac1';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormWartungsvertraege() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Wartungsverträge — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="anlagentyp">Anlagentyp *</Label>
            <Select
              value={lookupKey(fields.anlagentyp) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, anlagentyp: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="anlagentyp" className="max-sm:h-11"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="gasheizung">Gasheizung</SelectItem>
                <SelectItem value="oelheizung">Ölheizung</SelectItem>
                <SelectItem value="waermepumpe">Wärmepumpe</SelectItem>
                <SelectItem value="pelletheizung">Pelletheizung</SelectItem>
                <SelectItem value="fernwaerme">Fernwärme</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anlagenstandort_strasse">Anlagenstandort – Straße</Label>
            <Input
              id="anlagenstandort_strasse"
              placeholder=""
              value={fields.anlagenstandort_strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, anlagenstandort_strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anlagenstandort_hausnummer">Anlagenstandort – Hausnummer</Label>
            <Input
              id="anlagenstandort_hausnummer"
              placeholder=""
              value={fields.anlagenstandort_hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, anlagenstandort_hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anlagenstandort_plz">Anlagenstandort – Postleitzahl</Label>
            <Input
              id="anlagenstandort_plz"
              placeholder=""
              value={fields.anlagenstandort_plz ?? ''}
              onChange={e => setFields(f => ({ ...f, anlagenstandort_plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anlagenstandort_ort">Anlagenstandort – Ort</Label>
            <Input
              id="anlagenstandort_ort"
              placeholder=""
              value={fields.anlagenstandort_ort ?? ''}
              onChange={e => setFields(f => ({ ...f, anlagenstandort_ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wartungsintervall">Wartungsintervall *</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wartungsintervall) === 'jaehrlich'}
                onClick={() => setFields(f => ({ ...f, wartungsintervall: (lookupKey(f.wartungsintervall) === 'jaehrlich' ? undefined : 'jaehrlich') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wartungsintervall) === 'jaehrlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Jährlich
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wartungsintervall) === 'halbjaehrlich'}
                onClick={() => setFields(f => ({ ...f, wartungsintervall: (lookupKey(f.wartungsintervall) === 'halbjaehrlich' ? undefined : 'halbjaehrlich') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wartungsintervall) === 'halbjaehrlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Halbjährlich
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="letzte_wartung">Datum der letzten Wartung</Label>
            <DatePicker
              id="letzte_wartung"
              placeholder=""
              mode="date"
              value={fields.letzte_wartung ?? null}
              onChange={v => setFields(f => ({ ...f, letzte_wartung: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naechste_wartung">Nächste Wartung fällig am *</Label>
            <DatePicker
              id="naechste_wartung"
              placeholder=""
              mode="date"
              value={fields.naechste_wartung ?? null}
              onChange={v => setFields(f => ({ ...f, naechste_wartung: v ?? undefined }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wartungsstatus">Wartungsstatus *</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wartungsstatus) === 'geplant'}
                onClick={() => setFields(f => ({ ...f, wartungsstatus: (lookupKey(f.wartungsstatus) === 'geplant' ? undefined : 'geplant') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wartungsstatus) === 'geplant'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Geplant
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wartungsstatus) === 'durchgefuehrt'}
                onClick={() => setFields(f => ({ ...f, wartungsstatus: (lookupKey(f.wartungsstatus) === 'durchgefuehrt' ? undefined : 'durchgefuehrt') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wartungsstatus) === 'durchgefuehrt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Durchgeführt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wartungsstatus) === 'ueberfaellig'}
                onClick={() => setFields(f => ({ ...f, wartungsstatus: (lookupKey(f.wartungsstatus) === 'ueberfaellig' ? undefined : 'ueberfaellig') as any }))}
                className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wartungsstatus) === 'ueberfaellig'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Überfällig
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jahreswert">Jährlicher Vertragswert (€) *</Label>
            <Input
              id="jahreswert"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.jahreswert ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, jahreswert: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemerkungen">Bemerkungen</Label>
            <Textarea
              id="bemerkungen"
              placeholder=""
              value={fields.bemerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, bemerkungen: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
