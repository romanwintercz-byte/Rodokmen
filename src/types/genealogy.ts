/**
 * Genealogy Data Models & Interfaces
 */

export type Gender = 'M' | 'F' | 'OTHER';

export interface ParishCitation {
  id: string;
  archiveName: string; // e.g. "ActaPublica (SOA Praha)", "Portafontium (SOA Plzeň)", "SOA Zámrsk", "SOA Třeboň"
  parish: string; // Farnost (e.g. "Benešov", "Nelahozeves")
  bookType: 'N' | 'O' | 'Z' | 'INDEX'; // Narození, Oddaní, Zemřelí, Index
  signature: string; // Signatura knihy (e.g. "Nelahozeves 04")
  folio: string; // Snímek / folio / strana (e.g. "fol. 78 / snímek 81")
  timeSpan?: string; // Časový rozsah (e.g. "1860–1885")
  directUrl?: string; // Přímý odkaz na online scan v archivu
  originalText?: string; // Původní zápis (přepis z kurentu/latiny/češtiny)
  notes?: string;
  verified: boolean;
  dateAdded: string;
}

export interface LifeEvent {
  id: string;
  type: 'BIRTH' | 'BAPTISM' | 'MARRIAGE' | 'RESIDENCE' | 'OCCUPATION' | 'MILITARY' | 'DEATH' | 'BURIAL' | 'OTHER';
  date?: string;
  place?: string;
  description?: string;
  sourceCitationId?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isDeceased: boolean;
  occupation?: string;
  religion?: string;
  residence?: string; // Bydliště / dům č.p.
  notes?: string;
  avatarUrl?: string;
  
  // Rodinné vazby (IDs)
  fatherId?: string;
  motherId?: string;
  spouseIds: string[];
  childrenIds: string[];

  // Matriční záznamy & prameny
  parishCitations: ParishCitation[];
  customEvents?: LifeEvent[];
  tags?: string[];
}

export interface FamilyTreeData {
  id: string;
  treeName: string;
  description: string;
  author: string;
  rootPersonId: string;
  persons: Record<string, Person>;
  createdAt: string;
  lastModified: string;
  version: string;
}

export interface CzechArchivePortal {
  id: string;
  name: string;
  region: string;
  coverage: string;
  webUrl: string;
  searchUrlTemplate?: string;
  description: string;
  tips: string;
  badgeColor: string;
}

export interface AIAnalysisResult {
  recordType: 'N' | 'O' | 'Z' | 'GENERAL';
  originalTranscription: string;
  languageDetected: string; // 'Kurent (němčina)', 'Stará čeština', 'Novodobá čeština', 'Latina'
  confidence: number;
  extractedPerson: {
    firstName?: string;
    lastName?: string;
    maidenName?: string;
    gender?: Gender;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    houseNumber?: string;
    occupation?: string;
    religion?: string;
    causeOfDeath?: string;
  };
  parents?: {
    fatherName?: string;
    fatherOccupation?: string;
    fatherOrigin?: string;
    motherName?: string;
    motherMaidenName?: string;
    motherOrigin?: string;
  };
  godparentsOrWitnesses?: string[];
  citationSuggestion: {
    archiveName?: string;
    parish?: string;
    bookType?: 'N' | 'O' | 'Z' | 'INDEX';
    signature?: string;
    folio?: string;
  };
  notesAndContext: string;
  suggestedAction: 'CREATE_NEW' | 'UPDATE_EXISTING' | 'ADD_PARENTS';
}
