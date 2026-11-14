import { FamilyTreeData, Person } from '../types/genealogy';

/**
 * Encodes family tree into a shareable URL hash
 */
export function encodeTreeToUrl(tree: FamilyTreeData): string {
  try {
    const json = JSON.stringify(tree);
    const encoded = encodeURIComponent(json);
    return `${window.location.origin}${window.location.pathname}#tree=${encoded}`;
  } catch (err) {
    console.error('Failed to encode tree to URL', err);
    return window.location.href;
  }
}

/**
 * Decodes family tree from current URL hash if present
 */
export function decodeTreeFromUrl(): FamilyTreeData | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#tree=')) return null;
    const encoded = hash.slice(6);
    const json = decodeURIComponent(encoded);
    const tree = JSON.parse(json);
    if (tree && tree.persons && tree.rootPersonId) {
      return tree as FamilyTreeData;
    }
  } catch (err) {
    console.error('Failed to parse tree from URL', err);
  }
  return null;
}

/**
 * Calculates human-readable Czech relationship between person A and person B
 */
export function calculateRelationship(
  targetId: string,
  referenceId: string,
  persons: Record<string, Person>
): string {
  if (targetId === referenceId) return 'Táž osoba';

  const target = persons[targetId];
  const ref = persons[referenceId];
  if (!target || !ref) return 'Příbuzný';

  // 1. Spouses
  if (ref.spouseIds.includes(targetId) || target.spouseIds.includes(referenceId)) {
    return target.gender === 'F' ? 'Manželka' : 'Manžel';
  }

  // 2. Parents
  if (ref.fatherId === targetId) return 'Otec';
  if (ref.motherId === targetId) return 'Matka';

  // 3. Children
  if (ref.childrenIds.includes(targetId)) {
    return target.gender === 'F' ? 'Dcera' : 'Syn';
  }

  // 4. Grandparents
  const refFather = ref.fatherId ? persons[ref.fatherId] : undefined;
  const refMother = ref.motherId ? persons[ref.motherId] : undefined;

  if (refFather?.fatherId === targetId) return 'Dědeček (z otcovy strany)';
  if (refFather?.motherId === targetId) return 'Babička (z otcovy strany)';
  if (refMother?.fatherId === targetId) return 'Dědeček (z matčiny strany)';
  if (refMother?.motherId === targetId) return 'Babička (z matčiny strany)';

  // 5. Great-grandparents
  const grandfatherFather = refFather?.fatherId ? persons[refFather.fatherId] : undefined;
  const grandfatherMother = refMother?.fatherId ? persons[refMother.fatherId] : undefined;
  if (grandfatherFather?.fatherId === targetId || grandfatherMother?.fatherId === targetId) {
    return 'Pradědeček';
  }
  if (grandfatherFather?.motherId === targetId || grandfatherMother?.motherId === targetId) {
    return 'Prababička';
  }

  // 6. Grandchildren
  for (const childId of ref.childrenIds) {
    const child = persons[childId];
    if (child?.childrenIds.includes(targetId)) {
      return target.gender === 'F' ? 'Vnučka' : 'Vnuk';
    }
  }

  // 7. Siblings
  if (
    (ref.fatherId && ref.fatherId === target.fatherId) ||
    (ref.motherId && ref.motherId === target.motherId)
  ) {
    return target.gender === 'F' ? 'Sestra' : 'Bratr';
  }

  // 8. Nieces / Nephews
  for (const childId of ref.childrenIds) {
    const child = persons[childId];
    if (child) {
      // Is target a sibling of my child? That's another child.
    }
  }
  // Is target child of my sibling?
  const isSiblingOfRef = (pId: string) => {
    const p = persons[pId];
    return p && ((ref.fatherId && p.fatherId === ref.fatherId) || (ref.motherId && p.motherId === ref.motherId));
  };
  if ((target.fatherId && isSiblingOfRef(target.fatherId)) || (target.motherId && isSiblingOfRef(target.motherId))) {
    return target.gender === 'F' ? 'Neteř' : 'Synovec';
  }

  // 9. Uncles / Aunts
  if (refFather && isSiblingOfRef(refFather.id)) {
    // sibling of father
    if (refFather.fatherId && persons[refFather.fatherId]?.childrenIds.includes(targetId)) {
      return target.gender === 'F' ? 'Teta (sestra otce)' : 'Strýc (bratr otce)';
    }
  }
  if (refMother && isSiblingOfRef(refMother.id)) {
    if (refMother.fatherId && persons[refMother.fatherId]?.childrenIds.includes(targetId)) {
      return target.gender === 'F' ? 'Teta (sestra matky)' : 'Strýc (bratr matky)';
    }
  }

  // 10. In-laws (Snacha, Zeť)
  for (const childId of ref.childrenIds) {
    const child = persons[childId];
    if (child?.spouseIds.includes(targetId)) {
      return target.gender === 'F' ? 'Snacha' : 'Zeť';
    }
  }

  return 'Příbuzný / předek';
}
