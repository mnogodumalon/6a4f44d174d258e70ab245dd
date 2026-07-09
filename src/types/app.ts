// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kundenverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    telefon?: string;
    email?: string;
  };
}

export interface Wartungsvertraege {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kunde?: string; // applookup -> URL zu 'Kundenverwaltung' Record
    anlagentyp?: LookupValue;
    anlagenstandort_strasse?: string;
    anlagenstandort_hausnummer?: string;
    anlagenstandort_plz?: string;
    anlagenstandort_ort?: string;
    wartungsintervall?: LookupValue;
    letzte_wartung?: string; // Format: YYYY-MM-DD oder ISO String
    naechste_wartung?: string; // Format: YYYY-MM-DD oder ISO String
    wartungsstatus?: LookupValue;
    jahreswert?: number;
    bemerkungen?: string;
  };
}

export const APP_IDS = {
  KUNDENVERWALTUNG: '6a4f44bc95142d55b64a3861',
  WARTUNGSVERTRAEGE: '6a4f44bebe3ad15592c09ac1',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'wartungsvertraege': {
    anlagentyp: [{ key: "gasheizung", label: "Gasheizung" }, { key: "oelheizung", label: "Ölheizung" }, { key: "waermepumpe", label: "Wärmepumpe" }, { key: "pelletheizung", label: "Pelletheizung" }, { key: "fernwaerme", label: "Fernwärme" }, { key: "sonstiges", label: "Sonstiges" }],
    wartungsintervall: [{ key: "jaehrlich", label: "Jährlich" }, { key: "halbjaehrlich", label: "Halbjährlich" }],
    wartungsstatus: [{ key: "geplant", label: "Geplant" }, { key: "durchgefuehrt", label: "Durchgeführt" }, { key: "ueberfaellig", label: "Überfällig" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kundenverwaltung': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
  },
  'wartungsvertraege': {
    'kunde': 'applookup/select',
    'anlagentyp': 'lookup/select',
    'anlagenstandort_strasse': 'string/text',
    'anlagenstandort_hausnummer': 'string/text',
    'anlagenstandort_plz': 'string/text',
    'anlagenstandort_ort': 'string/text',
    'wartungsintervall': 'lookup/radio',
    'letzte_wartung': 'date/date',
    'naechste_wartung': 'date/date',
    'wartungsstatus': 'lookup/select',
    'jahreswert': 'number',
    'bemerkungen': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKundenverwaltung = StripLookup<Kundenverwaltung['fields']>;
export type CreateWartungsvertraege = StripLookup<Wartungsvertraege['fields']>;