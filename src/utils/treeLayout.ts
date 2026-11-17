import { FamilyTreeData, Person } from '../types/genealogy';

export const CARD_W = 204;
export const CARD_H = 104;
export const SPOUSE_GAP = 34;
export const SIBLING_GAP = 36;
export const GEN_GAP_Y = 76;
export const ROW_STEP_Y = CARD_H + GEN_GAP_Y;
export const COMPONENT_GAP = 120;

export interface NodePosition {
  x: number;
  y: number;
  gen: number;
  componentIndex: number;
}

export interface FamilyBusGroup {
  key: string;
  parentIds: string[];
  stemX: number;
  stemY: number;
  busY: number;
  childIds: string[];
}

export interface SpouseBridge {
  key: string;
  leftId: string;
  rightId: string;
  leftPos: NodePosition;
  rightPos: NodePosition;
  isAdjacentSameRow: boolean;
}

export interface BranchToggleInfo {
  personId: string;
  coupleKey: string;
  mode: 'switch' | 'toggle-inlaw';
  isExpanded: boolean;
  hiddenCount: number;
  branchLabel: string;
}

export interface BranchVisibilityResult {
  visiblePersonIds: Set<string>;
  branchToggles: Record<string, BranchToggleInfo>;
}

export interface LayoutOptions {
  branchFocusMode?: boolean;
  expandedSpouseByCouple?: Record<string, string>;
}

interface Block {
  id: string;
  personIds: string[];
  width: number;
  x: number;
  parentKey: string;
  sortHint: number;
}

function getBirthYearNum(p?: Person): number {
  if (!p?.birthDate) return 9999;
  const m = p.birthDate.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return m ? parseInt(m[1], 10) : 9999;
}

function orderCouple(a: Person, b: Person): [Person, Person] {
  if (a.gender === 'M' && b.gender === 'F') return [a, b];
  if (a.gender === 'F' && b.gender === 'M') return [b, a];
  return a.id < b.id ? [a, b] : [b, a];
}

function getParentKey(p: Person): string {
  const f = p.fatherId || '';
  const m = p.motherId || '';
  if (!f && !m) return `single:${p.id}`;
  if (f && m) return f < m ? `pair:${f}|${m}` : `pair:${m}|${f}`;
  return `one:${f || m}`;
}

export function getCoupleKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Computes which persons are visible under MyHeritage-style per-generation branch focus:
 * At every married couple in every generation, only ONE spouse's upward branch is shown
 * by default, while the other spouse gets a clickable branch toggle tab above their card.
 */
export function computeBranchVisibility(
  tree: FamilyTreeData,
  expandedSpouseByCouple: Record<string, string> = {},
  branchFocusMode: boolean = true
): BranchVisibilityResult {
  const personsMap = tree.persons || {};
  const allIds = Object.keys(personsMap);
  if (allIds.length === 0) {
    return { visiblePersonIds: new Set(), branchToggles: {} };
  }

  if (!branchFocusMode) {
    return {
      visiblePersonIds: new Set(allIds),
      branchToggles: {},
    };
  }

  // Symmetric lookup maps for defensive consistency
  const childrenByParent: Record<string, Set<string>> = {};
  const spousesByPerson: Record<string, Set<string>> = {};
  allIds.forEach(id => {
    childrenByParent[id] = new Set();
    spousesByPerson[id] = new Set();
  });
  allIds.forEach(id => {
    const p = personsMap[id];
    if (p.fatherId && personsMap[p.fatherId]) childrenByParent[p.fatherId].add(id);
    if (p.motherId && personsMap[p.motherId]) childrenByParent[p.motherId].add(id);
    (p.childrenIds || []).forEach(cId => {
      if (personsMap[cId]) childrenByParent[id].add(cId);
    });
    (p.spouseIds || []).forEach(spId => {
      if (personsMap[spId] && spId !== id) {
        spousesByPerson[id].add(spId);
        spousesByPerson[spId].add(id);
      }
    });
  });

  const hasParents = (id: string) => {
    const p = personsMap[id];
    return Boolean(
      p && ((p.fatherId && personsMap[p.fatherId]) || (p.motherId && personsMap[p.motherId]))
    );
  };

  const getSiblings = (id: string): string[] => {
    const p = personsMap[id];
    if (!p) return [];
    const sibs = new Set<string>();
    if (p.fatherId && childrenByParent[p.fatherId]) {
      childrenByParent[p.fatherId].forEach(c => {
        if (c !== id) sibs.add(c);
      });
    }
    if (p.motherId && childrenByParent[p.motherId]) {
      childrenByParent[p.motherId].forEach(c => {
        if (c !== id) sibs.add(c);
      });
    }
    return Array.from(sibs);
  };

  // Helper: simulate expanding a person's upward lineage (honoring existing toggles) to count newly revealed nodes
  const countUpwardBranch = (startId: string, alreadyVisible: Set<string>): number => {
    const simAdded = new Set<string>();
    const simUpwardSeen = new Set<string>();

    const simWalkCouple = (coupleIds: string[]) => {
      const candidates = coupleIds.filter(id => hasParents(id) && !alreadyVisible.has(id));
      // Special case: startId itself IS already visible (it's the card holding the button), so allow startId
      const effectiveCandidates = coupleIds.filter(
        id => hasParents(id) && (id === startId || !alreadyVisible.has(id))
      );
      if (effectiveCandidates.length === 0 && candidates.length === 0) return;
      const list = effectiveCandidates.length > 0 ? effectiveCandidates : candidates;

      let activeId = list[0];
      if (list.length >= 2) {
        const key = getCoupleKey(list[0], list[1]);
        const explicit = expandedSpouseByCouple[key];
        if (explicit && list.includes(explicit)) {
          activeId = explicit;
        } else {
          activeId = list.find(id => personsMap[id]?.gender === 'M') || list[0];
        }
      }

      if (simUpwardSeen.has(activeId)) return;
      simUpwardSeen.add(activeId);

      const p = personsMap[activeId];
      if (!p) return;
      const nextCouple: string[] = [];
      if (p.fatherId && personsMap[p.fatherId]) {
        if (!alreadyVisible.has(p.fatherId)) simAdded.add(p.fatherId);
        nextCouple.push(p.fatherId);
      }
      if (p.motherId && personsMap[p.motherId]) {
        if (!alreadyVisible.has(p.motherId)) simAdded.add(p.motherId);
        nextCouple.push(p.motherId);
      }

      getSiblings(activeId).forEach(sibId => {
        if (!alreadyVisible.has(sibId)) simAdded.add(sibId);
        spousesByPerson[sibId]?.forEach(spId => {
          if (!alreadyVisible.has(spId)) simAdded.add(spId);
        });
      });

      if (nextCouple.length > 0) {
        simWalkCouple(nextCouple);
      }
    };

    simWalkCouple([startId]);
    simAdded.delete(startId);
    return simAdded.size;
  };

  const visiblePersonIds = new Set<string>();
  const branchToggles: Record<string, BranchToggleInfo> = {};
  const processedGlobal = new Set<string>();

  const seeds = [
    ...(tree.rootPersonId && personsMap[tree.rootPersonId] ? [tree.rootPersonId] : []),
    ...allIds,
  ];

  seeds.forEach(seedId => {
    if (!personsMap[seedId] || processedGlobal.has(seedId)) return;

    // Collect full connected component first so each disconnected island is handled cleanly once
    const compQueue = [seedId];
    const compSet = new Set<string>();
    while (compQueue.length > 0) {
      const id = compQueue.shift()!;
      if (compSet.has(id) || !personsMap[id]) continue;
      compSet.add(id);
      processedGlobal.add(id);
      const p = personsMap[id];
      if (p.fatherId && personsMap[p.fatherId]) compQueue.push(p.fatherId);
      if (p.motherId && personsMap[p.motherId]) compQueue.push(p.motherId);
      spousesByPerson[id]?.forEach(sp => compQueue.push(sp));
      childrenByParent[id]?.forEach(c => compQueue.push(c));
    }

    const upwardExpanded = new Set<string>();
    const spineCoupleMembers = new Set<string>();
    const downwardSeeds: string[] = [];
    const deferredSwitches: { otherId: string; coupleKey: string }[] = [];
    const deferredInLaws: { personId: string; coupleKey: string; isExpanded: boolean }[] = [];
    const handledInLaw = new Set<string>();

    const walkUpwardCouple = (coupleIds: string[], markAsSpine: boolean) => {
      coupleIds.forEach(id => {
        visiblePersonIds.add(id);
        if (markAsSpine) spineCoupleMembers.add(id);
      });

      const candidates = coupleIds.filter(id => hasParents(id));
      if (candidates.length === 0) return;

      let activeId = candidates[0];
      if (candidates.length >= 2) {
        const pairKey = getCoupleKey(candidates[0], candidates[1]);
        const explicit = expandedSpouseByCouple[pairKey];
        if (explicit && candidates.includes(explicit)) {
          activeId = explicit;
        } else if (candidates.includes(seedId)) {
          activeId = seedId;
        } else {
          activeId = candidates.find(id => personsMap[id]?.gender === 'M') || candidates[0];
        }

        candidates.forEach(otherId => {
          if (otherId !== activeId) {
            deferredSwitches.push({ otherId, coupleKey: pairKey });
          }
        });
      }

      if (upwardExpanded.has(activeId)) return;
      upwardExpanded.add(activeId);

      const p = personsMap[activeId];
      if (!p) return;

      const nextCouple: string[] = [];
      if (p.fatherId && personsMap[p.fatherId]) {
        visiblePersonIds.add(p.fatherId);
        nextCouple.push(p.fatherId);
      }
      if (p.motherId && personsMap[p.motherId]) {
        visiblePersonIds.add(p.motherId);
        nextCouple.push(p.motherId);
      }

      // Include siblings of activeId (and seed them for spouses/descendants)
      getSiblings(activeId).forEach(sibId => {
        visiblePersonIds.add(sibId);
        downwardSeeds.push(sibId);
      });

      if (nextCouple.length > 0) {
        walkUpwardCouple(nextCouple, markAsSpine);
      }
    };

    // 1. Seed initial couple and climb upward along single active branch per generation
    const seedSpouses = Array.from(spousesByPerson[seedId] || []);
    const initialCouple = [seedId, ...seedSpouses];
    initialCouple.forEach(id => visiblePersonIds.add(id));
    walkUpwardCouple(initialCouple, true);

    // 2. Walk downward from initial couple & upward-branch siblings (keeping spouses visible, collapsing in-law parents unless toggled)
    const downwardQueue = [...initialCouple, ...downwardSeeds];
    const downwardVisited = new Set<string>();

    while (downwardQueue.length > 0) {
      const currId = downwardQueue.shift()!;
      if (downwardVisited.has(currId) || !personsMap[currId]) continue;
      downwardVisited.add(currId);
      visiblePersonIds.add(currId);

      const currSpouses = Array.from(spousesByPerson[currId] || []);
      currSpouses.forEach(spId => {
        visiblePersonIds.add(spId);

        if (
          !spineCoupleMembers.has(spId) &&
          !upwardExpanded.has(spId) &&
          hasParents(spId) &&
          !handledInLaw.has(spId)
        ) {
          handledInLaw.add(spId);
          const pairKey = getCoupleKey(currId, spId);
          const isExpanded = expandedSpouseByCouple[pairKey] === spId;
          if (isExpanded) {
            walkUpwardCouple([spId], false);
          }
          deferredInLaws.push({ personId: spId, coupleKey: pairKey, isExpanded });
        }

        childrenByParent[spId]?.forEach(cId => {
          if (!downwardVisited.has(cId)) downwardQueue.push(cId);
        });
      });

      childrenByParent[currId]?.forEach(cId => {
        if (!downwardVisited.has(cId)) downwardQueue.push(cId);
      });
    }

    // 3. Finalize branch toggle badges with exact hidden-branch counts
    deferredSwitches.forEach(({ otherId, coupleKey }) => {
      const hiddenCount = countUpwardBranch(otherId, visiblePersonIds);
      if (hiddenCount > 0) {
        const p = personsMap[otherId];
        branchToggles[otherId] = {
          personId: otherId,
          coupleKey,
          mode: 'switch',
          isExpanded: false,
          hiddenCount,
          branchLabel: p?.maidenName || p?.lastName || p?.firstName || 'Větev',
        };
      }
    });

    deferredInLaws.forEach(({ personId, coupleKey, isExpanded }) => {
      const p = personsMap[personId];
      if (!isExpanded) {
        const hiddenCount = countUpwardBranch(personId, visiblePersonIds);
        if (hiddenCount > 0) {
          branchToggles[personId] = {
            personId,
            coupleKey,
            mode: 'toggle-inlaw',
            isExpanded: false,
            hiddenCount,
            branchLabel: p?.maidenName || p?.lastName || p?.firstName || 'Větev',
          };
        }
      } else {
        branchToggles[personId] = {
          personId,
          coupleKey,
          mode: 'toggle-inlaw',
          isExpanded: true,
          hiddenCount: 0,
          branchLabel: p?.maidenName || p?.lastName || p?.firstName || 'Větev',
        };
      }
    });
  });

  return { visiblePersonIds, branchToggles };
}

/**
 * Automatically flips collapsed couple branch toggles so `targetPersonId` becomes visible
 * (e.g. when the user selects someone via Search, Detail Modal, or adds a parent to a collapsed branch).
 */
export function resolveTogglesForPerson(
  tree: FamilyTreeData,
  targetPersonId: string,
  currentToggles: Record<string, string>
): Record<string, string> {
  const personsMap = tree.persons || {};
  if (!personsMap[targetPersonId]) return currentToggles;

  const allIds = Object.keys(personsMap);
  const childrenByParent: Record<string, Set<string>> = {};
  const spousesByPerson: Record<string, Set<string>> = {};
  allIds.forEach(id => {
    childrenByParent[id] = new Set();
    spousesByPerson[id] = new Set();
  });
  allIds.forEach(id => {
    const p = personsMap[id];
    if (p.fatherId && personsMap[p.fatherId]) childrenByParent[p.fatherId].add(id);
    if (p.motherId && personsMap[p.motherId]) childrenByParent[p.motherId].add(id);
    (p.childrenIds || []).forEach(cId => {
      if (personsMap[cId]) childrenByParent[id].add(cId);
    });
    (p.spouseIds || []).forEach(spId => {
      if (personsMap[spId] && spId !== id) {
        spousesByPerson[id].add(spId);
        spousesByPerson[spId].add(id);
      }
    });
  });

  // Undirected closure behind a collapsed spouse (stops at already-visible nodes)
  const containsInHiddenClosure = (startId: string, visibleSet: Set<string>): boolean => {
    const q = [startId];
    const seen = new Set<string>();
    while (q.length > 0) {
      const id = q.shift()!;
      if (seen.has(id) || !personsMap[id]) continue;
      if (id !== startId && visibleSet.has(id)) continue;
      seen.add(id);
      if (id === targetPersonId) return true;
      const p = personsMap[id];
      if (p.fatherId) q.push(p.fatherId);
      if (p.motherId) q.push(p.motherId);
      spousesByPerson[id]?.forEach(sp => q.push(sp));
      childrenByParent[id]?.forEach(c => q.push(c));
    }
    return false;
  };

  let next = { ...currentToggles };
  for (let depth = 0; depth < 8; depth++) {
    const { visiblePersonIds, branchToggles } = computeBranchVisibility(tree, next, true);
    if (visiblePersonIds.has(targetPersonId)) {
      return next;
    }
    const candidate = Object.values(branchToggles).find(
      t => !t.isExpanded && containsInHiddenClosure(t.personId, visiblePersonIds)
    );
    if (!candidate) break;
    next = { ...next, [candidate.coupleKey]: candidate.personId };
  }

  return next;
}

/**
 * Computes a clean, overlap-free, MyHeritage-style couple-centered hierarchical layout
 * handling per-generation single-spouse branch focus, ancestors, descendants, siblings, and disconnected subtrees.
 */
export function computeMyHeritageLayout(
  tree: FamilyTreeData,
  options: LayoutOptions = {}
): {
  positions: Record<string, NodePosition>;
  busGroups: FamilyBusGroup[];
  spouseBridges: SpouseBridge[];
  branchToggles: Record<string, BranchToggleInfo>;
  visiblePersonIds: Set<string>;
} {
  const { branchFocusMode = true, expandedSpouseByCouple = {} } = options;
  const rawPersons = tree.persons || {};
  if (Object.keys(rawPersons).length === 0) {
    return {
      positions: {},
      busGroups: [],
      spouseBridges: [],
      branchToggles: {},
      visiblePersonIds: new Set(),
    };
  }

  const { visiblePersonIds, branchToggles } = computeBranchVisibility(
    tree,
    expandedSpouseByCouple,
    branchFocusMode
  );

  // Build pruned person map containing strictly currently visible persons
  const personsMap: Record<string, Person> = {};
  visiblePersonIds.forEach(id => {
    const p = rawPersons[id];
    if (!p) return;
    personsMap[id] = {
      ...p,
      fatherId: p.fatherId && visiblePersonIds.has(p.fatherId) ? p.fatherId : undefined,
      motherId: p.motherId && visiblePersonIds.has(p.motherId) ? p.motherId : undefined,
      spouseIds: (p.spouseIds || []).filter(spId => visiblePersonIds.has(spId)),
      childrenIds: (p.childrenIds || []).filter(cId => visiblePersonIds.has(cId)),
    };
  });

  const allIds = Object.keys(personsMap);
  if (allIds.length === 0) {
    return {
      positions: {},
      busGroups: [],
      spouseBridges: [],
      branchToggles,
      visiblePersonIds,
    };
  }

  // 1. Partition into connected components and assign generation depths via BFS
  const visited = new Set<string>();
  const components: {
    index: number;
    ids: string[];
    anchorId: string;
    generations: Record<string, number>;
  }[] = [];

  const traverseComponent = (seedId: string, compIndex: number) => {
    if (!personsMap[seedId] || visited.has(seedId)) return;
    const queue: { id: string; gen: number }[] = [{ id: seedId, gen: 0 }];
    const ids: string[] = [];
    const generations: Record<string, number> = {};

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      if (visited.has(id) || !personsMap[id]) continue;
      visited.add(id);
      ids.push(id);
      generations[id] = gen;

      const p = personsMap[id];
      if (p.fatherId && !visited.has(p.fatherId)) {
        queue.push({ id: p.fatherId, gen: gen + 1 });
      }
      if (p.motherId && !visited.has(p.motherId)) {
        queue.push({ id: p.motherId, gen: gen + 1 });
      }
      (p.childrenIds || []).forEach(cId => {
        if (!visited.has(cId)) {
          queue.push({ id: cId, gen: gen - 1 });
        }
      });
      (p.spouseIds || []).forEach(spId => {
        if (!visited.has(spId)) {
          queue.push({ id: spId, gen });
        }
      });
    }

    components.push({
      index: compIndex,
      ids,
      anchorId: seedId,
      generations,
    });
  };

  if (tree.rootPersonId && personsMap[tree.rootPersonId]) {
    traverseComponent(tree.rootPersonId, 0);
  }
  allIds.forEach(id => {
    if (!visited.has(id)) {
      traverseComponent(id, components.length);
    }
  });

  // Global maxGen so top row aligns nicely across components
  let globalMaxGen = -Infinity;
  components.forEach(comp => {
    Object.values(comp.generations).forEach(g => {
      if (g > globalMaxGen) globalMaxGen = g;
    });
  });

  const positions: Record<string, NodePosition> = {};
  let nextComponentStartX = 0;

  // 2. Lay out each connected component independently without collisions
  components.forEach(comp => {
    const { ids, generations, anchorId, index: compIndex } = comp;
    const compSet = new Set(ids);

    // Group persons by generation
    const byGen: Record<number, Person[]> = {};
    let minGen = Infinity;
    let maxGen = -Infinity;
    ids.forEach(id => {
      const g = generations[id] ?? 0;
      if (g < minGen) minGen = g;
      if (g > maxGen) maxGen = g;
      if (!byGen[g]) byGen[g] = [];
      byGen[g].push(personsMap[id]);
    });

    // Build indivisible couple/single blocks per generation
    const genBlocks: Record<number, Block[]> = {};
    const personToBlock: Record<string, Block> = {};

    for (let g = maxGen; g >= minGen; g--) {
      const group = byGen[g] || [];
      const used = new Set<string>();
      const groupIdSet = new Set(group.map(p => p.id));
      const blocks: Block[] = [];

      group.forEach((p, idx) => {
        if (used.has(p.id)) return;
        const sameGenSpouses = (p.spouseIds || [])
          .filter(spId => groupIdSet.has(spId) && !used.has(spId) && spId !== p.id)
          .map(spId => personsMap[spId]);

        let orderedPeople: Person[];
        if (sameGenSpouses.length === 1) {
          orderedPeople = orderCouple(p, sameGenSpouses[0]);
        } else if (sameGenSpouses.length > 1) {
          orderedPeople = [p, ...sameGenSpouses];
        } else {
          orderedPeople = [p];
        }

        orderedPeople.forEach(m => used.add(m.id));
        const width = orderedPeople.length * CARD_W + (orderedPeople.length - 1) * SPOUSE_GAP;

        // Pick primary parentKey for sibling clustering (prefer member who has parents in tree)
        const withParents = orderedPeople.find(m => m.fatherId || m.motherId) || orderedPeople[0];
        let sortHint = getBirthYearNum(withParents);
        // Keep spouses whose right-side partner also brings ancestral parents on the right edge of left-partner's siblings
        if (orderedPeople.length >= 2) {
          const leftHasParents = Boolean(orderedPeople[0].fatherId || orderedPeople[0].motherId);
          const rightHasParents = Boolean(orderedPeople[1].fatherId || orderedPeople[1].motherId);
          if (leftHasParents && rightHasParents) {
            sortHint = 100000 + sortHint;
          } else if (orderedPeople[1].id === withParents.id) {
            // Right-side child of parents (e.g. wife whose husband has no parents in tree): put at left edge of her siblings
            sortHint = -100000 + sortHint;
          }
        }
        const block: Block = {
          id: orderedPeople.map(m => m.id).join('+'),
          personIds: orderedPeople.map(m => m.id),
          width,
          x: idx * (CARD_W + SIBLING_GAP),
          parentKey: getParentKey(withParents),
          sortHint,
        };
        orderedPeople.forEach(m => {
          personToBlock[m.id] = block;
        });
        blocks.push(block);
      });

      genBlocks[g] = blocks;
    }

    // Seed initial X hints recursively from anchorId (upward ancestors & downward descendants)
    const seededBlocks = new Set<string>();
    const setBlockCenter = (block: Block, centerX: number) => {
      block.x = centerX - block.width / 2;
      seededBlocks.add(block.id);
    };

    const seedUpward = (personId: string, centerX: number, seen = new Set<string>()) => {
      if (seen.has(personId) || !compSet.has(personId)) return;
      seen.add(personId);
      const p = personsMap[personId];
      if (!p) return;

      const fBlock = p.fatherId ? personToBlock[p.fatherId] : undefined;
      const mBlock = p.motherId ? personToBlock[p.motherId] : undefined;

      if (fBlock && mBlock && fBlock.id === mBlock.id) {
        if (!seededBlocks.has(fBlock.id)) {
          setBlockCenter(fBlock, centerX);
        }
        const fCenter = fBlock.x + CARD_W / 2;
        const mCenter = fBlock.x + CARD_W + SPOUSE_GAP + CARD_W / 2;
        if (p.fatherId) seedUpward(p.fatherId, fCenter, seen);
        if (p.motherId) seedUpward(p.motherId, mCenter, seen);
      } else {
        if (fBlock && !seededBlocks.has(fBlock.id)) {
          const cx = mBlock ? centerX - (CARD_W / 2 + SPOUSE_GAP / 2) : centerX;
          setBlockCenter(fBlock, cx);
          seedUpward(p.fatherId!, cx, seen);
        }
        if (mBlock && !seededBlocks.has(mBlock.id)) {
          const cx = fBlock ? centerX + (CARD_W / 2 + SPOUSE_GAP / 2) : centerX;
          setBlockCenter(mBlock, cx);
          seedUpward(p.motherId!, cx, seen);
        }
      }
    };

    const seedDownward = (block: Block, centerX: number, seen = new Set<string>()) => {
      if (seen.has(block.id)) return;
      seen.add(block.id);

      const childIds = Array.from(
        new Set(block.personIds.flatMap(id => personsMap[id]?.childrenIds || []))
      ).filter(cId => compSet.has(cId));

      if (childIds.length === 0) return;

      const childBlocks: Block[] = [];
      const seenCB = new Set<string>();
      childIds.forEach(cId => {
        const cb = personToBlock[cId];
        if (cb && !seenCB.has(cb.id)) {
          seenCB.add(cb.id);
          childBlocks.push(cb);
        }
      });

      childBlocks.sort((a, b) => a.sortHint - b.sortHint);

      const totalW =
        childBlocks.reduce((acc, cb) => acc + cb.width, 0) +
        Math.max(0, childBlocks.length - 1) * SIBLING_GAP;
      let cursor = centerX - totalW / 2;

      childBlocks.forEach(cb => {
        const cbCenter = cursor + cb.width / 2;
        if (!seededBlocks.has(cb.id)) {
          setBlockCenter(cb, cbCenter);
        }
        seedDownward(cb, cbCenter, seen);
        cursor += cb.width + SIBLING_GAP;
      });
    };

    const anchorBlock = personToBlock[anchorId];
    if (anchorBlock) {
      setBlockCenter(anchorBlock, 0);
      anchorBlock.personIds.forEach((mId, idx) => {
        const memberCenter = anchorBlock.x + idx * (CARD_W + SPOUSE_GAP) + CARD_W / 2;
        seedUpward(mId, memberCenter);
      });
      seedDownward(anchorBlock, 0);
    }

    // Helper: get center X of a person's card inside its block
    const getPersonCenterX = (pId: string): number | null => {
      const b = personToBlock[pId];
      if (!b) return null;
      const idx = b.personIds.indexOf(pId);
      if (idx === -1) return null;
      return b.x + idx * (CARD_W + SPOUSE_GAP) + CARD_W / 2;
    };

    // Helper: de-overlap row left-to-right preserving order
    const resolveRowOverlaps = (blocks: Block[]) => {
      for (let i = 1; i < blocks.length; i++) {
        const prevRight = blocks[i - 1].x + blocks[i - 1].width;
        if (blocks[i].x < prevRight + SIBLING_GAP) {
          blocks[i].x = prevRight + SIBLING_GAP;
        }
      }
    };

    // 4 alternating relaxation passes: align children under parents, then parents over children
    for (let pass = 0; pass < 4; pass++) {
      // Top-down pass (maxGen -> minGen): align blocks with their parents above
      for (let g = maxGen; g >= minGen; g--) {
        const blocks = genBlocks[g];
        if (!blocks || blocks.length === 0) continue;

        blocks.forEach(block => {
          const parentTargets: number[] = [];
          block.personIds.forEach((mId, mIdx) => {
            const m = personsMap[mId];
            if (!m) return;
            const pCenters: number[] = [];
            if (m.fatherId) {
              const fc = getPersonCenterX(m.fatherId);
              if (fc !== null) pCenters.push(fc);
            }
            if (m.motherId) {
              const mc = getPersonCenterX(m.motherId);
              if (mc !== null) pCenters.push(mc);
            }
            if (pCenters.length > 0) {
              const parentMid = pCenters.reduce((a, b) => a + b, 0) / pCenters.length;
              // Shift so m's slot inside block aligns under parentMid
              const mOffsetInBlock = mIdx * (CARD_W + SPOUSE_GAP) + CARD_W / 2;
              parentTargets.push(parentMid - mOffsetInBlock + block.width / 2);
            }
          });

          if (parentTargets.length > 0) {
            const targetCenter = parentTargets.reduce((a, b) => a + b, 0) / parentTargets.length;
            block.x = targetCenter - block.width / 2;
          }
        });

        // Sort by desired center, keeping siblings grouped by parentKey
        const parentGroupAnchor: Record<string, number> = {};
        blocks.forEach(b => {
          const cx = b.x + b.width / 2;
          if (parentGroupAnchor[b.parentKey] === undefined) {
            parentGroupAnchor[b.parentKey] = cx;
          } else {
            parentGroupAnchor[b.parentKey] = Math.min(parentGroupAnchor[b.parentKey], cx);
          }
        });

        blocks.sort((a, b) => {
          if (a.parentKey !== b.parentKey) {
            return (parentGroupAnchor[a.parentKey] ?? 0) - (parentGroupAnchor[b.parentKey] ?? 0);
          }
          if (a.sortHint !== b.sortHint) return a.sortHint - b.sortHint;
          return a.x - b.x;
        });

        resolveRowOverlaps(blocks);
      }

      // Bottom-up pass (minGen -> maxGen): center parents above their children
      for (let g = minGen; g <= maxGen; g++) {
        const blocks = genBlocks[g];
        if (!blocks || blocks.length === 0) continue;

        blocks.forEach(block => {
          // If couple, center between children of the pair (or per partner)
          const childCenters: number[] = [];
          const seenChildren = new Set<string>();
          block.personIds.forEach(mId => {
            (personsMap[mId]?.childrenIds || []).forEach(cId => {
              if (seenChildren.has(cId)) return;
              seenChildren.add(cId);
              const cc = getPersonCenterX(cId);
              if (cc !== null) childCenters.push(cc);
            });
          });

          if (childCenters.length > 0) {
            const childrenMid = (Math.min(...childCenters) + Math.max(...childCenters)) / 2;
            block.x = childrenMid - block.width / 2;
          }
        });

        blocks.sort((a, b) => a.x - b.x);
        resolveRowOverlaps(blocks);
      }
    }

    // Final top-down overlap check & compute component bounding box
    let compMinX = Infinity;
    let compMaxX = -Infinity;
    for (let g = maxGen; g >= minGen; g--) {
      const blocks = genBlocks[g] || [];
      resolveRowOverlaps(blocks);
      blocks.forEach(b => {
        if (b.x < compMinX) compMinX = b.x;
        if (b.x + b.width > compMaxX) compMaxX = b.x + b.width;
      });
    }
    if (!Number.isFinite(compMinX)) compMinX = 0;
    if (!Number.isFinite(compMaxX)) compMaxX = CARD_W;

    // Normalize component horizontally so it starts at nextComponentStartX
    const shiftX = nextComponentStartX - compMinX;
    for (let g = maxGen; g >= minGen; g--) {
      const blocks = genBlocks[g] || [];
      const y = 80 + (globalMaxGen - g) * ROW_STEP_Y;
      blocks.forEach(b => {
        b.personIds.forEach((pId, idx) => {
          positions[pId] = {
            x: b.x + shiftX + idx * (CARD_W + SPOUSE_GAP),
            y,
            gen: g,
            componentIndex: compIndex,
          };
        });
      });
    }

    nextComponentStartX += compMaxX - compMinX + COMPONENT_GAP;
  });

  // 3. Build Spouse Bridges (one per canonical pair)
  const spouseBridges: SpouseBridge[] = [];
  const seenSpousePairs = new Set<string>();

  allIds.forEach(id => {
    const p = personsMap[id];
    const pPos = positions[id];
    if (!p || !pPos) return;

    (p.spouseIds || []).forEach(spId => {
      const pairKey = id < spId ? `${id}|${spId}` : `${spId}|${id}`;
      if (seenSpousePairs.has(pairKey)) return;
      const spPos = positions[spId];
      if (!spPos) return;
      seenSpousePairs.add(pairKey);

      const leftId = pPos.x <= spPos.x ? id : spId;
      const rightId = pPos.x <= spPos.x ? spId : id;
      const leftPos = positions[leftId];
      const rightPos = positions[rightId];
      const isSameRow = Math.abs(leftPos.y - rightPos.y) < 5;
      const gap = rightPos.x - (leftPos.x + CARD_W);

      spouseBridges.push({
        key: `spouse-${pairKey}`,
        leftId,
        rightId,
        leftPos,
        rightPos,
        isAdjacentSameRow: isSameRow && gap >= -5 && gap <= SPOUSE_GAP + 18,
      });
    });
  });

  // 4. Build MyHeritage Family Bus Groups (one stem from parent couple/single parent -> shared sibling rail -> child drops)
  const busMap: Record<string, FamilyBusGroup> = {};

  allIds.forEach(childId => {
    const child = personsMap[childId];
    const childPos = positions[childId];
    if (!child || !childPos) return;

    const hasFather = Boolean(child.fatherId && positions[child.fatherId]);
    const hasMother = Boolean(child.motherId && positions[child.motherId]);
    if (!hasFather && !hasMother) return;

    let key: string;
    let parentIds: string[];
    let stemX: number;
    let stemY: number;
    let parentRowY: number;

    if (hasFather && hasMother) {
      const fId = child.fatherId!;
      const mId = child.motherId!;
      const fPos = positions[fId];
      const mPos = positions[mId];
      key = fId < mId ? `pair:${fId}|${mId}` : `pair:${mId}|${fId}`;
      parentIds = [fId, mId];

      const leftPos = fPos.x <= mPos.x ? fPos : mPos;
      const rightPos = fPos.x <= mPos.x ? mPos : fPos;
      const sameRow = Math.abs(leftPos.y - rightPos.y) < 5;
      const gap = rightPos.x - (leftPos.x + CARD_W);

      if (sameRow && gap >= -5 && gap <= SPOUSE_GAP + 18) {
        // Stem originates directly from the midpoint of the horizontal marriage bridge!
        stemX = (leftPos.x + CARD_W + rightPos.x) / 2;
        stemY = leftPos.y + CARD_H / 2;
        parentRowY = leftPos.y;
      } else {
        stemX = (leftPos.x + CARD_W / 2 + rightPos.x + CARD_W / 2) / 2;
        parentRowY = Math.max(leftPos.y, rightPos.y);
        stemY = parentRowY + CARD_H;
      }
    } else {
      const pId = hasFather ? child.fatherId! : child.motherId!;
      const pPos = positions[pId];
      key = `one:${pId}`;
      parentIds = [pId];
      stemX = pPos.x + CARD_W / 2;
      parentRowY = pPos.y;
      stemY = pPos.y + CARD_H;
    }

    if (!busMap[key]) {
      busMap[key] = {
        key,
        parentIds,
        stemX,
        stemY,
        busY: parentRowY + CARD_H + GEN_GAP_Y / 2,
        childIds: [],
      };
    }
    busMap[key].childIds.push(childId);
  });

  return {
    positions,
    busGroups: Object.values(busMap),
    spouseBridges,
    branchToggles,
    visiblePersonIds,
  };
}
