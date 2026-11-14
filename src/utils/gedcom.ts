import { FamilyTreeData, Person, ParishCitation } from '../types/genealogy';

/**
 * Standard GEDCOM 5.5.1 Export and Import Engine
 * Fully compatible with MyHeritage, Ancestry, Gramps, and FamilySearch.
 */

// Czech month to GEDCOM month abbreviation converter
const CZ_MONTHS: Record<string, string> = {
  '01': 'JAN', '1': 'JAN', 'ledna': 'JAN', 'leden': 'JAN',
  '02': 'FEB', '2': 'FEB', 'února': 'FEB', 'únor': 'FEB',
  '03': 'MAR', '3': 'MAR', 'března': 'MAR', 'březen': 'MAR',
  '04': 'APR', '4': 'APR', 'dubna': 'APR', 'duben': 'APR',
  '05': 'MAY', '5': 'MAY', 'května': 'MAY', 'květen': 'MAY',
  '06': 'JUN', '6': 'JUN', 'června': 'JUN', 'červen': 'JUN',
  '07': 'JUL', '7': 'JUL', 'července': 'JUL', 'červenec': 'JUL',
  '08': 'AUG', '8': 'AUG', 'srpna': 'AUG', 'srpen': 'AUG',
  '09': 'SEP', '9': 'SEP', 'září': 'SEP',
  '10': 'OCT', 'října': 'OCT', 'říjen': 'OCT',
  '11': 'NOV', 'listopadu': 'NOV', 'listopad': 'NOV',
  '12': 'DEC', 'prosince': 'DEC', 'prosinec': 'DEC',
};

function formatGedcomDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();

  // Format DD.MM.YYYY
  const dotParts = trimmed.split('.');
  if (dotParts.length === 3) {
    const day = dotParts[0].trim().padStart(2, '0');
    const monthKey = dotParts[1].trim();
    const year = dotParts[2].trim();
    const gedMonth = CZ_MONTHS[monthKey] || monthKey;
    return `${day} ${gedMonth} ${year}`.trim();
  }

  // Format YYYY-MM-DD
  const dashParts = trimmed.split('-');
  if (dashParts.length === 3) {
    const year = dashParts[0].trim();
    const monthKey = dashParts[1].trim();
    const day = dashParts[2].trim().padStart(2, '0');
    const gedMonth = CZ_MONTHS[monthKey] || monthKey;
    return `${day} ${gedMonth} ${year}`.trim();
  }

  // If just a year e.g. "1841" or "kolem 1850"
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  if (/kolem\s+(\d{4})/i.test(trimmed)) {
    const match = trimmed.match(/kolem\s+(\d{4})/i);
    return `ABT ${match?.[1]}`;
  }

  return trimmed;
}

export function exportToGedcom(treeData: FamilyTreeData): string {
  const lines: string[] = [];

  // 1. Header
  lines.push('0 HEAD');
  lines.push('1 SOUR RodokmenMatrikyOnline');
  lines.push('2 VERS 1.0');
  lines.push('2 NAME Rodokmen & Matriky Online');
  lines.push(`1 DATE ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push('1 SUBM @SUBM1@');

  lines.push('0 @SUBM1@ SUBM');
  lines.push(`1 NAME ${treeData.author || 'Badatel v matrikách'}`);

  // Create mapping of IDs to GEDCOM @I... / @F... IDs
  const personList = Object.values(treeData.persons);
  const idToGedcomId: Record<string, string> = {};
  personList.forEach((p, idx) => {
    idToGedcomId[p.id] = `@I${idx + 1}@`;
  });

  // Track family units
  interface FamilyUnit {
    id: string;
    gedcomId: string;
    husbandId?: string;
    wifeId?: string;
    childrenIds: string[];
  }
  const families: FamilyUnit[] = [];
  let famCounter = 1;

  // Group by parents
  const parentPairKey = (fId?: string, mId?: string) => `${fId || 'none'}_${mId || 'none'}`;
  const parentPairToFam: Record<string, FamilyUnit> = {};

  personList.forEach(p => {
    if (p.fatherId || p.motherId) {
      const key = parentPairKey(p.fatherId, p.motherId);
      if (!parentPairToFam[key]) {
        const fam: FamilyUnit = {
          id: `fam-${famCounter}`,
          gedcomId: `@F${famCounter}@`,
          husbandId: p.fatherId,
          wifeId: p.motherId,
          childrenIds: [p.id]
        };
        famCounter++;
        parentPairToFam[key] = fam;
        families.push(fam);
      } else {
        if (!parentPairToFam[key].childrenIds.includes(p.id)) {
          parentPairToFam[key].childrenIds.push(p.id);
        }
      }
    }
  });

  // Also create families for spouses who don't have children yet
  personList.forEach(p => {
    p.spouseIds.forEach(spId => {
      const key1 = parentPairKey(p.id, spId);
      const key2 = parentPairKey(spId, p.id);
      if (!parentPairToFam[key1] && !parentPairToFam[key2]) {
        const isHusband = p.gender === 'M';
        const fam: FamilyUnit = {
          id: `fam-${famCounter}`,
          gedcomId: `@F${famCounter}@`,
          husbandId: isHusband ? p.id : spId,
          wifeId: isHusband ? spId : p.id,
          childrenIds: []
        };
        famCounter++;
        parentPairToFam[key1] = fam;
        families.push(fam);
      }
    });
  });

  // Sources tracking
  const sources: ParishCitation[] = [];
  const citationToSourceGedcomId: Record<string, string> = {};
  let sourCounter = 1;

  personList.forEach(p => {
    p.parishCitations.forEach(cit => {
      if (!citationToSourceGedcomId[cit.id]) {
        const sourGedId = `@S${sourCounter}@`;
        sourCounter++;
        citationToSourceGedcomId[cit.id] = sourGedId;
        sources.push(cit);
      }
    });
  });

  // 2. Individuals
  personList.forEach(p => {
    const gedId = idToGedcomId[p.id];
    lines.push(`0 ${gedId} INDI`);

    // Name
    const lastNameSlash = p.lastName ? `/${p.lastName}/` : '//';
    lines.push(`1 NAME ${p.firstName} ${lastNameSlash}`.trim());
    lines.push(`2 GIVN ${p.firstName}`);
    if (p.lastName) lines.push(`2 SURN ${p.lastName}`);
    if (p.maidenName) lines.push(`2 _MARNM ${p.maidenName}`);

    // Sex
    lines.push(`1 SEX ${p.gender === 'F' ? 'F' : 'M'}`);

    // Birth
    if (p.birthDate || p.birthPlace) {
      lines.push('1 BIRT');
      if (p.birthDate) lines.push(`2 DATE ${formatGedcomDate(p.birthDate)}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }

    // Death
    if (p.isDeceased || p.deathDate || p.deathPlace) {
      lines.push('1 DEAT');
      if (p.deathDate) lines.push(`2 DATE ${formatGedcomDate(p.deathDate)}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }

    // Occupation
    if (p.occupation) {
      lines.push(`1 OCCU ${p.occupation}`);
    }

    // Religion
    if (p.religion) {
      lines.push(`1 RELI ${p.religion}`);
    }

    // Residence
    if (p.residence) {
      lines.push('1 RESI');
      lines.push(`2 PLAC ${p.residence}`);
    }

    // Notes
    if (p.notes) {
      lines.push(`1 NOTE ${p.notes.replace(/\n/g, ' ')}`);
    }

    // Link Sources
    p.parishCitations.forEach(cit => {
      const sourGedId = citationToSourceGedcomId[cit.id];
      if (sourGedId) {
        lines.push(`1 SOUR ${sourGedId}`);
        if (cit.folio) lines.push(`2 PAGE ${cit.folio}`);
        if (cit.originalText) lines.push(`2 DATA`);
        if (cit.originalText) lines.push(`3 TEXT ${cit.originalText.replace(/\n/g, ' ')}`);
      }
    });

    // Family links
    // As child
    families.forEach(f => {
      if (f.childrenIds.includes(p.id)) {
        lines.push(`1 FAMC ${f.gedcomId}`);
      }
    });

    // As spouse
    families.forEach(f => {
      if (f.husbandId === p.id || f.wifeId === p.id) {
        lines.push(`1 FAMS ${f.gedcomId}`);
      }
    });
  });

  // 3. Families
  families.forEach(f => {
    lines.push(`0 ${f.gedcomId} FAM`);
    if (f.husbandId && idToGedcomId[f.husbandId]) {
      lines.push(`1 HUSB ${idToGedcomId[f.husbandId]}`);
    }
    if (f.wifeId && idToGedcomId[f.wifeId]) {
      lines.push(`1 WIFE ${idToGedcomId[f.wifeId]}`);
    }
    f.childrenIds.forEach(childId => {
      if (idToGedcomId[childId]) {
        lines.push(`1 CHIL ${idToGedcomId[childId]}`);
      }
    });
    lines.push('1 MARR');
  });

  // 4. Sources
  sources.forEach(s => {
    const sourGedId = citationToSourceGedcomId[s.id];
    lines.push(`0 ${sourGedId} SOUR`);
    lines.push(`1 TITL ${s.signature || s.parish || 'Matrika'}`);
    lines.push(`1 AUTH ${s.archiveName}`);
    if (s.parish) lines.push(`1 PLAC ${s.parish}`);
    if (s.directUrl) lines.push(`1 NOTE Odkaz do archivu: ${s.directUrl}`);
    if (s.originalText) lines.push(`1 TEXT ${s.originalText.replace(/\n/g, ' ')}`);
  });

  // 5. Trailer
  lines.push('0 TRLR');

  return lines.join('\n');
}

export function downloadGedcomFile(treeData: FamilyTreeData, filename = 'rodokmen.ged'): void {
  const content = exportToGedcom(treeData);
  // Prepend UTF-8 BOM so genealogy desktop software correctly renders Czech accents
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Robust GEDCOM 5.5.1 Parser to import into the Family Tree
 */
export function importFromGedcom(gedcomText: string): FamilyTreeData {
  const lines = gedcomText.split(/\r?\n/);
  const personsMap: Record<string, Person> = {};
  
  interface RawIndi {
    id: string;
    firstName: string;
    lastName: string;
    gender: 'M' | 'F' | 'OTHER';
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    isDeceased: boolean;
    occupation?: string;
    notes?: string;
    famc?: string;
    fams: string[];
  }

  interface RawFam {
    id: string;
    husbandId?: string;
    wifeId?: string;
    childrenIds: string[];
  }

  const rawIndis: Record<string, RawIndi> = {};
  const rawFams: Record<string, RawFam> = {};

  let currentIndi: RawIndi | null = null;
  let currentFam: RawFam | null = null;
  let currentSubtag = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(' ');
    const level = parts[0];
    const tagOrId = parts[1];
    const rest = parts.slice(2).join(' ');

    if (level === '0') {
      currentSubtag = '';
      if (rest === 'INDI') {
        currentFam = null;
        currentIndi = {
          id: tagOrId.replace(/@/g, ''),
          firstName: 'Neznámé jméno',
          lastName: '',
          gender: 'M',
          isDeceased: false,
          fams: []
        };
        rawIndis[currentIndi.id] = currentIndi;
      } else if (rest === 'FAM') {
        currentIndi = null;
        currentFam = {
          id: tagOrId.replace(/@/g, ''),
          childrenIds: []
        };
        rawFams[currentFam.id] = currentFam;
      } else {
        currentIndi = null;
        currentFam = null;
      }
      continue;
    }

    if (currentIndi) {
      if (level === '1') {
        currentSubtag = tagOrId;
        if (tagOrId === 'NAME') {
          // e.g. "Antonín /Dvořák/"
          const match = rest.match(/([^/]*)(?:\/([^/]*)\/)?/);
          if (match) {
            currentIndi.firstName = (match[1] || '').trim() || 'Neznámé jméno';
            currentIndi.lastName = (match[2] || '').trim();
          }
        } else if (tagOrId === 'SEX') {
          currentIndi.gender = rest.trim().toUpperCase() === 'F' ? 'F' : 'M';
        } else if (tagOrId === 'DEAT') {
          currentIndi.isDeceased = true;
        } else if (tagOrId === 'OCCU') {
          currentIndi.occupation = rest;
        } else if (tagOrId === 'NOTE') {
          currentIndi.notes = (currentIndi.notes ? currentIndi.notes + '\n' : '') + rest;
        } else if (tagOrId === 'FAMC') {
          currentIndi.famc = rest.replace(/@/g, '');
        } else if (tagOrId === 'FAMS') {
          currentIndi.fams.push(rest.replace(/@/g, ''));
        }
      } else if (level === '2') {
        if (currentSubtag === 'BIRT') {
          if (tagOrId === 'DATE') currentIndi.birthDate = rest;
          if (tagOrId === 'PLAC') currentIndi.birthPlace = rest;
        } else if (currentSubtag === 'DEAT') {
          if (tagOrId === 'DATE') {
            currentIndi.deathDate = rest;
            currentIndi.isDeceased = true;
          }
          if (tagOrId === 'PLAC') {
            currentIndi.deathPlace = rest;
            currentIndi.isDeceased = true;
          }
        }
      }
    } else if (currentFam) {
      if (level === '1') {
        if (tagOrId === 'HUSB') {
          currentFam.husbandId = rest.replace(/@/g, '');
        } else if (tagOrId === 'WIFE') {
          currentFam.wifeId = rest.replace(/@/g, '');
        } else if (tagOrId === 'CHIL') {
          currentFam.childrenIds.push(rest.replace(/@/g, ''));
        }
      }
    }
  }

  // Convert rawIndis to Persons and link relationships
  Object.values(rawIndis).forEach(raw => {
    const person: Person = {
      id: raw.id,
      firstName: raw.firstName,
      lastName: raw.lastName,
      gender: raw.gender,
      birthDate: raw.birthDate,
      birthPlace: raw.birthPlace,
      deathDate: raw.deathDate,
      deathPlace: raw.deathPlace,
      isDeceased: raw.isDeceased,
      occupation: raw.occupation,
      notes: raw.notes,
      spouseIds: [],
      childrenIds: [],
      parishCitations: []
    };
    personsMap[person.id] = person;
  });

  // Link parents, children and spouses from FAM records
  Object.values(rawFams).forEach(fam => {
    const husb = fam.husbandId ? personsMap[fam.husbandId] : undefined;
    const wife = fam.wifeId ? personsMap[fam.wifeId] : undefined;

    if (husb && wife) {
      if (!husb.spouseIds.includes(wife.id)) husb.spouseIds.push(wife.id);
      if (!wife.spouseIds.includes(husb.id)) wife.spouseIds.push(husb.id);
    }

    fam.childrenIds.forEach(childId => {
      const child = personsMap[childId];
      if (child) {
        if (husb) {
          child.fatherId = husb.id;
          if (!husb.childrenIds.includes(child.id)) husb.childrenIds.push(child.id);
        }
        if (wife) {
          child.motherId = wife.id;
          if (!wife.childrenIds.includes(child.id)) wife.childrenIds.push(child.id);
        }
      }
    });
  });

  const allIds = Object.keys(personsMap);
  const rootId = allIds[0] || 'p1';

  return {
    id: `tree-${Date.now()}`,
    treeName: 'Importovaný rodokmen z GEDCOM',
    description: `Úspěšně importováno ${allIds.length} osob ze souboru GEDCOM.`,
    author: 'Importováno uživatelem',
    rootPersonId: rootId,
    persons: personsMap,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0'
  };
}
