import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Person, FamilyTreeData } from '../types/genealogy';
import {
  CARD_W,
  CARD_H,
  SPOUSE_GAP,
  ROW_STEP_Y,
  computeMyHeritageLayout,
  resolveTogglesForPerson,
  NodePosition,
  BranchToggleInfo,
} from '../utils/treeLayout';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  BookOpen,
  User,
  Calendar,
  Sparkles,
  Layers,
  CircleDot,
  Compass,
  Search,
  Trash2,
  Crosshair,
  ChevronUp,
  ChevronDown,
  GitBranch,
} from 'lucide-react';

interface FamilyTreeCanvasProps {
  tree: FamilyTreeData;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  onAddRelative: (relationType: 'father' | 'mother' | 'spouse' | 'child', targetPersonId: string) => void;
  onDeletePerson: (personId: string) => void;
  onOpenParishAssistant: (person?: Person) => void;
  viewMode: 'generations' | 'pedigree' | 'fan' | 'timeline';
  onViewModeChange: (mode: 'generations' | 'pedigree' | 'fan' | 'timeline') => void;
}

function extractYear(dateStr?: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? match[1] : dateStr.trim();
}

function formatLifespan(person: Person): string {
  const b = extractYear(person.birthDate);
  const d = extractYear(person.deathDate);
  if (b && d) return `${b} – ${d}`;
  if (b && person.isDeceased) return `${b} – †`;
  if (b) return `★ ${b}`;
  if (d) return `† ${d}`;
  return person.isDeceased ? 'zemřel(a)' : 'datum neuvedeno';
}

function formatShortPlace(place?: string): string {
  if (!place) return '';
  return place.replace(/\s*č\.p\.\s*\d+.*$/i, '').trim();
}

export const FamilyTreeCanvas: React.FC<FamilyTreeCanvasProps> = ({
  tree,
  selectedPersonId,
  onSelectPerson,
  onAddRelative,
  onDeletePerson,
  onOpenParishAssistant,
  viewMode,
  onViewModeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [brokenAvatarIds, setBrokenAvatarIds] = useState<Record<string, boolean>>({});
  const [branchFocusMode, setBranchFocusMode] = useState(true);
  const [expandedSpouseByCouple, setExpandedSpouseByCouple] = useState<Record<string, string>>({});
  const [branchSwitchTick, setBranchSwitchTick] = useState(0);

  // Zoom handlers (centered on viewport center)
  const handleZoomIn = () => {
    setZoom(prev => {
      const next = Math.min(prev * 1.2, 2.2);
      if (containerRef.current) {
        const cx = containerRef.current.clientWidth / 2;
        const cy = containerRef.current.clientHeight / 2;
        setPan(p => ({
          x: cx - (cx - p.x) * (next / prev),
          y: cy - (cy - p.y) * (next / prev),
        }));
      }
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const next = Math.max(prev * 0.83, 0.35);
      if (containerRef.current) {
        const cx = containerRef.current.clientWidth / 2;
        const cy = containerRef.current.clientHeight / 2;
        setPan(p => ({
          x: cx - (cx - p.x) * (next / prev),
          y: cy - (cy - p.y) * (next / prev),
        }));
      }
      return next;
    });
  };

  // Mouse drag panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.person-node-card, .ghost-node-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom (centered around mouse pointer)
  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode === 'timeline') return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => {
      const next = Math.max(0.3, Math.min(2.4, prev * zoomFactor));
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        setPan(p => ({
          x: mouseX - (mouseX - p.x) * (next / prev),
          y: mouseY - (mouseY - p.y) * (next / prev),
        }));
      }
      return next;
    });
  };

  // MyHeritage-style couple-centered hierarchical layout (1 active branch per couple in every generation)
  const {
    positions: nodesLayout,
    busGroups,
    spouseBridges,
    branchToggles,
    visiblePersonIds,
  } = useMemo(
    () => computeMyHeritageLayout(tree, { branchFocusMode, expandedSpouseByCouple }),
    [tree, branchFocusMode, expandedSpouseByCouple]
  );

  const handleToggleSpouseBranch = useCallback((toggle: BranchToggleInfo) => {
    setExpandedSpouseByCouple(prev => {
      if (toggle.mode === 'toggle-inlaw' && toggle.isExpanded) {
        const next = { ...prev };
        delete next[toggle.coupleKey];
        return next;
      }
      return {
        ...prev,
        [toggle.coupleKey]: toggle.personId,
      };
    });
    setBranchSwitchTick(t => t + 1);
  }, []);

  // Pedigree Layout (Ahnentafel horizontal brackets, zero vertical overlaps up to 4 generations)
  const pedigreeLayout = useMemo(() => {
    if (viewMode !== 'pedigree') return {} as Record<string, NodePosition>;
    const rootId = selectedPersonId || tree.rootPersonId;
    const pos: Record<string, NodePosition> = {};
    const totalCanvasH = 8 * (CARD_H + 22); // 1008px accommodates all 8 gen-3 cards with 22px gap

    function placeAncestors(id: string | undefined, gen: number, yIndex: number, totalSlots: number) {
      if (!id || gen > 3) return;
      const person = tree.persons[id];
      if (!person) return;

      const x = gen * (CARD_W + 76);
      const slotHeight = totalCanvasH / totalSlots;
      const y = (yIndex + 0.5) * slotHeight - CARD_H / 2 - totalCanvasH / 2;

      pos[id] = { x, y, gen, componentIndex: 0 };

      if (person.fatherId) {
        placeAncestors(person.fatherId, gen + 1, yIndex * 2, totalSlots * 2);
      }
      if (person.motherId) {
        placeAncestors(person.motherId, gen + 1, yIndex * 2 + 1, totalSlots * 2);
      }
    }

    placeAncestors(rootId, 0, 0, 1);
    return pos;
  }, [tree, selectedPersonId, viewMode]);

  const activeLayout = viewMode === 'pedigree' ? pedigreeLayout : nodesLayout;

  // Bounding box of currently rendered tree
  const treeBounds = useMemo(() => {
    const positions = Object.values(activeLayout);
    if (positions.length === 0) {
      return { minX: 0, maxX: CARD_W, minY: 0, maxY: CARD_H, width: CARD_W, height: CARD_H };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    positions.forEach(pos => {
      if (pos.x < minX) minX = pos.x;
      if (pos.x + CARD_W > maxX) maxX = pos.x + CARD_W;
      if (pos.y < minY) minY = pos.y;
      if (pos.y + CARD_H > maxY) maxY = pos.y + CARD_H;
    });

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(CARD_W, maxX - minX),
      height: Math.max(CARD_H, maxY - minY),
    };
  }, [activeLayout]);

  // Center & Fit tree to visible screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const viewportW = container.clientWidth || window.innerWidth;
    const viewportH = container.clientHeight || window.innerHeight - 64;

    const { minX, minY, width: treeW, height: treeH } = treeBounds;

    const paddingX = 64;
    const paddingTop = 96;
    const paddingBottom = 88;

    const availableW = Math.max(220, viewportW - paddingX * 2);
    const availableH = Math.max(220, viewportH - paddingTop - paddingBottom);

    const scaleX = availableW / treeW;
    const scaleY = availableH / treeH;

    const targetZoom = Math.min(1.05, Math.max(0.4, Math.min(scaleX, scaleY)));
    const centeredPanX = (viewportW - treeW * targetZoom) / 2 - minX * targetZoom;
    const centeredPanY =
      paddingTop + Math.max(0, (availableH - treeH * targetZoom) / 2) - minY * targetZoom;

    setZoom(targetZoom);
    setPan({ x: centeredPanX, y: centeredPanY });
  }, [treeBounds]);

  // Center smoothly on the currently selected person
  const centerOnSelectedPerson = useCallback(() => {
    if (!containerRef.current || !selectedPersonId) return;
    const pos = activeLayout[selectedPersonId];
    if (!pos) return;
    const viewportW = containerRef.current.clientWidth || window.innerWidth;
    const viewportH = containerRef.current.clientHeight || window.innerHeight - 64;
    const targetZoom = Math.max(zoom, 0.95);
    setZoom(targetZoom);
    setPan({
      x: viewportW / 2 - (pos.x + CARD_W / 2) * targetZoom,
      y: viewportH / 2 - (pos.y + CARD_H / 2) * targetZoom,
    });
  }, [activeLayout, selectedPersonId, zoom]);

  // Auto-reveal a collapsed person ONLY when selection changes or a new person is added to the tree
  const personCount = Object.keys(tree.persons).length;
  const visibleCount = visiblePersonIds.size;
  const prevSelectCountRef = useRef({ selectedPersonId, personCount });

  useEffect(() => {
    const prev = prevSelectCountRef.current;
    const selectionChanged = prev.selectedPersonId !== selectedPersonId;
    const treeGrew = personCount > prev.personCount;
    prevSelectCountRef.current = { selectedPersonId, personCount };

    if (!branchFocusMode || !selectedPersonId) return;
    if ((selectionChanged || treeGrew) && !visiblePersonIds.has(selectedPersonId)) {
      setExpandedSpouseByCouple(curr => resolveTogglesForPerson(tree, selectedPersonId, curr));
    }
  }, [selectedPersonId, personCount, branchFocusMode, visiblePersonIds, tree]);

  // Auto fit on initial mount, tree structural change, branch switch, or view mode switch
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 40);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, personCount, branchFocusMode, visibleCount, branchSwitchTick]);

  useEffect(() => {
    const handleResize = () => fitToScreen();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToScreen]);

  // Filter matching persons
  const matchingPersonIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    const set = new Set<string>();
    Object.values(tree.persons).forEach(p => {
      const fullName = `${p.firstName} ${p.lastName} ${p.maidenName || ''}`.toLowerCase();
      const place = `${p.birthPlace || ''} ${p.deathPlace || ''}`.toLowerCase();
      const occu = (p.occupation || '').toLowerCase();
      if (fullName.includes(q) || place.includes(q) || occu.includes(q)) {
        set.add(p.id);
      }
    });
    return set;
  }, [tree, searchQuery]);

  // MyHeritage-style ghost parent cards above selected person (only when spot is free!)
  const ghostParentCards = useMemo(() => {
    if (viewMode !== 'generations' || !selectedPersonId) return [];
    const person = tree.persons[selectedPersonId];
    const pos = nodesLayout[selectedPersonId];
    if (!person || !pos) return [];

    const missingFather = !person.fatherId;
    const missingMother = !person.motherId;
    if (!missingFather && !missingMother) return [];

    const ghostY = pos.y - ROW_STEP_Y;
    const ghosts: { type: 'father' | 'mother'; x: number; y: number; label: string }[] = [];

    const isAreaFree = (gx: number, gy: number) =>
      !Object.values(nodesLayout).some(
        existing =>
          Math.abs(existing.y - gy) < CARD_H + 10 &&
          gx < existing.x + CARD_W + 14 &&
          gx + CARD_W + 14 > existing.x
      );

    if (missingFather && missingMother) {
      const fx = pos.x + CARD_W / 2 - SPOUSE_GAP / 2 - CARD_W;
      const mx = pos.x + CARD_W / 2 + SPOUSE_GAP / 2;
      if (isAreaFree(fx, ghostY)) ghosts.push({ type: 'father', x: fx, y: ghostY, label: 'Přidat otce' });
      if (isAreaFree(mx, ghostY)) ghosts.push({ type: 'mother', x: mx, y: ghostY, label: 'Přidat matku' });
    } else if (missingFather) {
      const fx = pos.x - (CARD_W + SPOUSE_GAP) / 2;
      if (isAreaFree(fx, ghostY)) ghosts.push({ type: 'father', x: fx, y: ghostY, label: 'Přidat otce' });
    } else if (missingMother) {
      const mx = pos.x + (CARD_W + SPOUSE_GAP) / 2;
      if (isAreaFree(mx, ghostY)) ghosts.push({ type: 'mother', x: mx, y: ghostY, label: 'Přidat matku' });
    }

    return ghosts;
  }, [viewMode, selectedPersonId, tree.persons, nodesLayout]);

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#f3f5f8] select-none"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: View Mode Switcher */}
        <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md shadow-sm border border-slate-200/90 rounded-xl p-1 gap-1">
          <button
            onClick={() => onViewModeChange('generations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              viewMode === 'generations'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Rodinný strom</span>
          </button>
          <button
            onClick={() => onViewModeChange('pedigree')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              viewMode === 'pedigree'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Vývod z předků</span>
          </button>
          <button
            onClick={() => onViewModeChange('fan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              viewMode === 'fan'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Vějířový kruh</span>
          </button>
          <button
            onClick={() => onViewModeChange('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
              viewMode === 'timeline'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Časová osa</span>
          </button>
        </div>

        {/* Search bar, Branch Focus Switch & Parish CTA */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          {viewMode === 'generations' && (
            <button
              type="button"
              onClick={() => setBranchFocusMode(v => !v)}
              title={
                branchFocusMode
                  ? 'V každé generaci je zobrazena větev jednoho z manželů (přepnutí kliknutím na záložku ▲ Větev nad kartou). Kliknutím sem zobrazíte všechny větve najednou.'
                  : 'Zobrazeny jsou všechny větve současně. Kliknutím sem zapnete přehledné přepínání po jedné větvi na manželský pár.'
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 border shadow-sm transition-all ${
                branchFocusMode
                  ? 'bg-amber-50/95 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'bg-white/95 border-slate-200/90 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-700" />
              <span>{branchFocusMode ? '1 větev na pár' : 'Všechny větve'}</span>
            </button>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Hledat osobu, obec..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && matchingPersonIds.size > 0) {
                  const firstId = Array.from(matchingPersonIds)[0];
                  if (branchFocusMode && !visiblePersonIds.has(firstId)) {
                    setExpandedSpouseByCouple(curr => resolveTogglesForPerson(tree, firstId, curr));
                  }
                  onSelectPerson(firstId);
                }
              }}
              className="pl-9 pr-10 py-1.5 bg-white/95 backdrop-blur-md text-xs border border-slate-200/90 rounded-xl shadow-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600/30 w-48 sm:w-56 transition-all"
            />
            {searchQuery && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-amber-700 font-semibold tabular-nums">
                {matchingPersonIds.size}
              </span>
            )}
          </div>

          <button
            onClick={() => onOpenParishAssistant()}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-200" />
            <span>Hledat v matrikách &amp; AI</span>
          </button>
        </div>
      </div>

      {/* Floating Canvas Controls (Bottom Right) */}
      {viewMode !== 'timeline' && viewMode !== 'fan' && (
        <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-1 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl p-1.5">
          <button
            onClick={handleZoomIn}
            title="Přiblížit"
            className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="text-[10px] text-center font-medium text-slate-500 tabular-nums py-0.5">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={handleZoomOut}
            title="Oddálit"
            className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-200 my-0.5" />
          <button
            onClick={centerOnSelectedPerson}
            title="Vycentrovat na vybranou osobu"
            className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={fitToScreen}
            title="Zobrazit celý rodokmen na obrazovce"
            className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Clean Unboxed Legend (Bottom Left) */}
      <div className="hidden sm:flex absolute bottom-5 left-5 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-xl px-3.5 py-2 items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#e3effb] border border-[#7eb3e6] inline-block" />
          <span>Muž</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#fce9ef] border border-[#e39bb2] inline-block" />
          <span>Žena</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="text-amber-700 font-bold">⚭</span>
          <span>Manželství</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-800">
          <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
          <span>Doloženo v matrice</span>
        </div>
        <span className="text-slate-300" aria-hidden="true">|</span>
        <span className="text-slate-500 tabular-nums">
          {branchFocusMode && viewMode === 'generations' && visibleCount < personCount ? (
            <>
              Zobrazeno <strong className="text-slate-900">{visibleCount}</strong> z {personCount} osob
            </>
          ) : (
            <>
              Celkem <strong className="text-slate-900">{personCount}</strong> osob
            </>
          )}
        </span>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full ${viewMode === 'timeline' ? '' : 'cursor-grab active:cursor-grabbing'}`}
      >
        {viewMode === 'fan' ? (
          <FanChartView
            tree={tree}
            selectedPersonId={selectedPersonId || tree.rootPersonId}
            onSelectPerson={onSelectPerson}
          />
        ) : viewMode === 'timeline' ? (
          <TimelineView
            tree={tree}
            selectedPersonId={selectedPersonId}
            onSelectPerson={onSelectPerson}
          />
        ) : (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="relative w-0 h-0"
          >
            {/* Orthogonal SVG Connectors */}
            <svg
              className="absolute pointer-events-none overflow-visible"
              style={{ left: 0, top: 0, width: '1px', height: '1px' }}
            >
              {viewMode === 'generations' ? (
                <>
                  {/* 1. Orthogonal Family Bus Rails (Parent Couple -> Sibling Rail -> Child Cards) */}
                  {busGroups.map(group => {
                    const childPositions = group.childIds
                      .map(id => ({ id, pos: nodesLayout[id] }))
                      .filter(item => Boolean(item.pos));
                    if (childPositions.length === 0) return null;

                    const childCentersX = childPositions.map(c => c.pos.x + CARD_W / 2);
                    const minChildX = Math.min(...childCentersX);
                    const maxChildX = Math.max(...childCentersX);
                    const railLeft = Math.min(group.stemX, minChildX);
                    const railRight = Math.max(group.stemX, maxChildX);

                    const isParentSelected = Boolean(
                      selectedPersonId && group.parentIds.includes(selectedPersonId)
                    );
                    const isChildSelected = Boolean(
                      selectedPersonId && group.childIds.includes(selectedPersonId)
                    );
                    const isGroupHighlighted = isParentSelected || isChildSelected;
                    const baseStroke = isGroupHighlighted ? '#d97706' : '#94a3b8';
                    const baseWidth = isGroupHighlighted ? 2.2 : 1.75;

                    return (
                      <g key={group.key}>
                        {/* Vertical stem from marriage bridge (or single parent) down to sibling rail */}
                        <line
                          x1={group.stemX}
                          y1={group.stemY}
                          x2={group.stemX}
                          y2={group.busY}
                          stroke={baseStroke}
                          strokeWidth={baseWidth}
                          strokeLinecap="round"
                        />

                        {/* Horizontal sibling bus rail */}
                        {railRight - railLeft > 1 && (
                          <line
                            x1={railLeft}
                            y1={group.busY}
                            x2={railRight}
                            y2={group.busY}
                            stroke={baseStroke}
                            strokeWidth={baseWidth}
                            strokeLinecap="round"
                          />
                        )}

                        {/* Vertical drops into each child card */}
                        {childPositions.map(({ id, pos }) => {
                          const cx = pos.x + CARD_W / 2;
                          const highlightDrop =
                            isParentSelected || selectedPersonId === id;
                          return (
                            <line
                              key={`drop-${group.key}-${id}`}
                              x1={cx}
                              y1={group.busY}
                              x2={cx}
                              y2={pos.y}
                              stroke={highlightDrop ? '#d97706' : baseStroke}
                              strokeWidth={highlightDrop ? 2.2 : baseWidth}
                              strokeLinecap="round"
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* 2. Spouse Marriage Bridges */}
                  {spouseBridges.map(bridge => {
                    const isHighlighted =
                      selectedPersonId === bridge.leftId || selectedPersonId === bridge.rightId;
                    const strokeColor = isHighlighted ? '#d97706' : '#94a3b8';

                    if (bridge.isAdjacentSameRow) {
                      const sX = bridge.leftPos.x + CARD_W;
                      const eX = bridge.rightPos.x;
                      const y = bridge.leftPos.y + CARD_H / 2;
                      const midX = (sX + eX) / 2;

                      return (
                        <g key={bridge.key}>
                          <line
                            x1={sX}
                            y1={y}
                            x2={eX}
                            y2={y}
                            stroke={strokeColor}
                            strokeWidth={isHighlighted ? 2.4 : 2}
                          />
                          <circle
                            cx={midX}
                            cy={y}
                            r="9"
                            fill="#ffffff"
                            stroke={isHighlighted ? '#d97706' : '#cbd5e1'}
                            strokeWidth="1.5"
                          />
                          <text
                            x={midX}
                            y={y + 3.5}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="bold"
                            fill={isHighlighted ? '#b45309' : '#64748b'}
                          >
                            ⚭
                          </text>
                        </g>
                      );
                    }

                    // Non-adjacent spouse arch cleanly above row
                    const sX = bridge.leftPos.x + CARD_W / 2;
                    const sY = bridge.leftPos.y;
                    const eX = bridge.rightPos.x + CARD_W / 2;
                    const eY = bridge.rightPos.y;
                    const archY = Math.min(sY, eY) - 24;
                    const midX = (sX + eX) / 2;

                    return (
                      <g key={bridge.key}>
                        <path
                          d={`M ${sX} ${sY} L ${sX} ${archY} L ${eX} ${archY} L ${eX} ${eY}`}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="1.75"
                          strokeDasharray="4 3"
                        />
                        <circle
                          cx={midX}
                          cy={archY}
                          r="9"
                          fill="#ffffff"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                        />
                        <text
                          x={midX}
                          y={archY + 3.5}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill="#64748b"
                        >
                          ⚭
                        </text>
                      </g>
                    );
                  })}

                  {/* 3. Ghost Parent Dashed Connectors for Selected Card */}
                  {selectedPersonId && nodesLayout[selectedPersonId] && ghostParentCards.length > 0 && (
                    <g>
                      {ghostParentCards.map(ghost => {
                        const selPos = nodesLayout[selectedPersonId];
                        const startX = ghost.x + CARD_W / 2;
                        const startY = ghost.y + CARD_H;
                        const endX = selPos.x + CARD_W / 2;
                        const endY = selPos.y;
                        const midY = (startY + endY) / 2;
                        return (
                          <path
                            key={`ghost-line-${ghost.type}`}
                            d={`M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                        );
                      })}
                    </g>
                  )}
                </>
              ) : (
                /* Pedigree View Orthogonal Brackets */
                Object.values(tree.persons).map(p => {
                  const childPos = pedigreeLayout[p.id];
                  if (!childPos) return null;

                  const lines: React.ReactNode[] = [];
                  const fPos = p.fatherId ? pedigreeLayout[p.fatherId] : undefined;
                  const mPos = p.motherId ? pedigreeLayout[p.motherId] : undefined;

                  if (fPos || mPos) {
                    const startX = childPos.x + CARD_W;
                    const startY = childPos.y + CARD_H / 2;
                    const midX = startX + 38;

                    if (fPos) {
                      const fY = fPos.y + CARD_H / 2;
                      lines.push(
                        <path
                          key={`ped-f-${p.id}`}
                          d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${fY} L ${fPos.x} ${fY}`}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.75"
                        />
                      );
                    }
                    if (mPos) {
                      const mY = mPos.y + CARD_H / 2;
                      lines.push(
                        <path
                          key={`ped-m-${p.id}`}
                          d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${mY} L ${mPos.x} ${mY}`}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.75"
                        />
                      );
                    }
                    if (fPos && mPos) {
                      const fY = fPos.y + CARD_H / 2;
                      const mY = mPos.y + CARD_H / 2;
                      const badgeY = (fY + mY) / 2;
                      lines.push(
                        <g key={`ped-mar-${p.id}`}>
                          <circle cx={midX} cy={badgeY} r="9" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                          <text x={midX} y={badgeY + 3.5} textAnchor="middle" fontSize="10" fill="#b45309" fontWeight="bold">
                            ⚭
                          </text>
                        </g>
                      );
                    }
                  }

                  return lines;
                })
              )}
            </svg>

            {/* Ghost Add-Parent Cards (MyHeritage Style) */}
            {ghostParentCards.map(ghost => (
              <button
                key={`ghost-${ghost.type}`}
                type="button"
                onClick={() => selectedPersonId && onAddRelative(ghost.type, selectedPersonId)}
                style={{
                  position: 'absolute',
                  left: `${ghost.x}px`,
                  top: `${ghost.y}px`,
                  width: `${CARD_W}px`,
                  height: `${CARD_H}px`,
                }}
                className={`ghost-node-card rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition-all hover:scale-[1.02] shadow-xs ${
                  ghost.type === 'father'
                    ? 'border-sky-300 bg-sky-50/75 text-sky-800 hover:bg-sky-100/90 hover:border-sky-500'
                    : 'border-rose-300 bg-rose-50/75 text-rose-800 hover:bg-rose-100/90 hover:border-rose-500'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    ghost.type === 'father' ? 'bg-sky-200/80 text-sky-900' : 'bg-rose-200/80 text-rose-900'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </div>
                <span>{ghost.label}</span>
              </button>
            ))}

            {/* Person Cards (MyHeritage Clean Rectangular Cards) */}
            {Object.values(tree.persons).map(person => {
              const pos = activeLayout[person.id];
              if (!pos) return null;

              const isSelected = selectedPersonId === person.id;
              const isMatch = matchingPersonIds.has(person.id);
              const hasCitations = person.parishCitations && person.parishCitations.length > 0;
              const isFemale = person.gender === 'F';
              const showAvatarImg = Boolean(person.avatarUrl && !brokenAvatarIds[person.id]);
              const shortPlace = formatShortPlace(person.birthPlace || person.deathPlace || person.residence);

              return (
                <div
                  key={person.id}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${CARD_W}px`,
                    height: `${CARD_H}px`,
                  }}
                  className={`person-node-card group rounded-xl transition-all duration-150 select-none ${
                    isSelected ? 'z-30' : 'z-10 hover:z-20'
                  }`}
                >
                  {/* MyHeritage-style Per-Generation Spouse Branch Toggle Tab */}
                  {viewMode === 'generations' && branchToggles[person.id] && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleToggleSpouseBranch(branchToggles[person.id]);
                      }}
                      title={
                        branchToggles[person.id].isExpanded
                          ? `Skrýt rodičovskou větev (${branchToggles[person.id].branchLabel})`
                          : `Kliknutím zobrazíte větev: ${branchToggles[person.id].branchLabel} (${branchToggles[person.id].hiddenCount} osob)`
                      }
                      className={`absolute -top-6 left-1/2 -translate-x-1/2 z-30 h-6 px-2.5 rounded-t-lg border border-b-0 text-[10.5px] font-semibold flex items-center gap-1 whitespace-nowrap shadow-xs transition-all cursor-pointer tabular-nums ${
                        branchToggles[person.id].isExpanded
                          ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-900'
                      }`}
                    >
                      {branchToggles[person.id].isExpanded ? (
                        <>
                          <ChevronDown className="w-3 h-3 text-amber-700" />
                          <span>Skrýt větev</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3 h-3 text-amber-600" />
                          <span>Větev ({branchToggles[person.id].hiddenCount})</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Card Body */}
                  <div
                    onClick={() => onSelectPerson(person.id)}
                    className={`w-full h-full px-3 py-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 relative transition-all ${
                      isSelected
                        ? 'bg-white border-amber-500 ring-2 ring-amber-500/35 shadow-lg'
                        : isMatch
                          ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400/40 shadow-md'
                          : isFemale
                            ? 'bg-[#fdf2f5] border-[#edc3d0] hover:border-[#d57191] hover:shadow-md shadow-xs'
                            : 'bg-[#eef6fc] border-[#bad6f0] hover:border-[#5594d4] hover:shadow-md shadow-xs'
                    }`}
                  >
                    {/* Subtle Archive Book Verification Icon (no boxy pill) */}
                    {hasCitations && (
                      <span
                        title={`Doloženo v matrice (${person.parishCitations.length} záznam/y)`}
                        className="absolute top-2 right-2 text-emerald-700"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {/* Circular Portrait / Silhouette */}
                    <div
                      className={`w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center border ${
                        isFemale
                          ? 'bg-[#f8dbe4] border-[#e7b2c3] text-[#a94468]'
                          : 'bg-[#d8eafa] border-[#a9cceb] text-[#2b689e]'
                      }`}
                    >
                      {showAvatarImg ? (
                        <img
                          src={person.avatarUrl}
                          alt={`${person.firstName} ${person.lastName}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenAvatarIds(prev => ({ ...prev, [person.id]: true }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </div>

                    {/* Clean 3-line Identity & Dates */}
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="font-sans font-bold text-[13px] leading-snug text-slate-900 truncate">
                        {person.firstName} {person.lastName}
                      </h4>
                      {person.maidenName && (
                        <p className="text-[11px] leading-tight text-slate-500 truncate">
                          roz. {person.maidenName}
                        </p>
                      )}
                      <p className="text-[11.5px] font-medium text-slate-700 tabular-nums mt-0.5 truncate">
                        {formatLifespan(person)}
                      </p>
                      {shortPlace && (
                        <p className="text-[10.5px] text-slate-500 truncate">
                          {shortPlace}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Floating Quick-Action Bar (Only visible on hover or selected card!) */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 -bottom-8 z-40 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/95 text-white shadow-lg border border-slate-700 text-[10px] whitespace-nowrap transition-opacity duration-150 ${
                      isSelected
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
                    }`}
                  >
                    {!person.fatherId && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onAddRelative('father', person.id);
                        }}
                        title="Přidat nebo propojit otce"
                        className="px-1.5 py-0.5 hover:bg-sky-700/80 rounded font-medium transition-colors"
                      >
                        + Otec
                      </button>
                    )}
                    {!person.motherId && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onAddRelative('mother', person.id);
                        }}
                        title="Přidat nebo propojit matku"
                        className="px-1.5 py-0.5 hover:bg-rose-700/80 rounded font-medium transition-colors"
                      >
                        + Matka
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onAddRelative('spouse', person.id);
                      }}
                      title="Přidat nebo propojit manžela/ku"
                      className="px-1.5 py-0.5 hover:bg-amber-700/80 rounded font-medium transition-colors"
                    >
                      + Manžel
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onAddRelative('child', person.id);
                      }}
                      title="Přidat nebo propojit dítě"
                      className="px-1.5 py-0.5 hover:bg-emerald-700/80 rounded font-medium transition-colors"
                    >
                      + Dítě
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onOpenParishAssistant(person);
                      }}
                      title="Vyhledat v matrikách pro tuto osobu"
                      className="p-0.5 text-emerald-300 hover:text-white hover:bg-emerald-700/60 rounded transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                    </button>

                    {confirmingDeleteId === person.id ? (
                      <div className="flex items-center gap-1 pl-1">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDeletePerson(person.id);
                            setConfirmingDeleteId(null);
                          }}
                          className="px-1.5 py-0.5 bg-rose-600 text-white rounded font-bold hover:bg-rose-500"
                        >
                          Smazat
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmingDeleteId(null);
                          }}
                          className="px-1 py-0.5 bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
                        >
                          Ne
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setConfirmingDeleteId(person.id);
                        }}
                        title="Smazat osobu"
                        className="p-0.5 text-slate-400 hover:text-rose-300 hover:bg-rose-900/50 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Circular Sunburst Fan Chart View (Vějířový kruhový diagram)
 */
function FanChartView({
  tree,
  selectedPersonId,
  onSelectPerson,
}: {
  tree: FamilyTreeData;
  selectedPersonId: string;
  onSelectPerson: (id: string) => void;
}) {
  const rootPerson = tree.persons[selectedPersonId] || tree.persons[tree.rootPersonId];
  if (!rootPerson) return <div className="p-8 text-center text-slate-500">Žádná osoba nevybrána.</div>;

  interface FanSlot {
    person?: Person;
    gen: number;
    index: number;
    totalInGen: number;
    startAngle: number;
    endAngle: number;
    color: string;
  }

  const slots: FanSlot[] = [];

  function fillGeneration(pId: string | undefined, gen: number, index: number, total: number) {
    if (gen > 3) return;
    const p = pId ? tree.persons[pId] : undefined;

    const angleRange = 240;
    const baseAngle = -120;
    const step = angleRange / total;
    const startAngle = baseAngle + index * step;
    const endAngle = startAngle + step;

    let color = '#d97706';
    if (gen === 0) color = '#1e293b';
    else if (index < total / 2) color = '#1d4ed8';
    else color = '#be123c';

    slots.push({
      person: p,
      gen,
      index,
      totalInGen: total,
      startAngle,
      endAngle,
      color,
    });

    if (p) {
      fillGeneration(p.fatherId, gen + 1, index * 2, total * 2);
      fillGeneration(p.motherId, gen + 1, index * 2 + 1, total * 2);
    } else {
      fillGeneration(undefined, gen + 1, index * 2, total * 2);
      fillGeneration(undefined, gen + 1, index * 2 + 1, total * 2);
    }
  }

  fillGeneration(rootPerson.id, 0, 0, 1);

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  function describeArc(
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
  ) {
    const startInner = polarToCartesian(x, y, innerRadius, startAngle);
    const endInner = polarToCartesian(x, y, innerRadius, endAngle);
    const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
    const endOuter = polarToCartesian(x, y, outerRadius, endAngle);

    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', startInner.x, startInner.y,
      'L', startOuter.x, startOuter.y,
      'A', outerRadius, outerRadius, 0, arcSweep, 1, endOuter.x, endOuter.y,
      'L', endInner.x, endInner.y,
      'A', innerRadius, innerRadius, 0, arcSweep, 0, startInner.x, startInner.y,
      'Z',
    ].join(' ');
  }

  const ringWidth = 80;
  const innerBase = 70;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 pt-16">
      <div className="text-center mb-2 z-10">
        <h3 className="font-serif-title font-bold text-lg text-slate-900">
          Vějířový kruh předků: {rootPerson.firstName} {rootPerson.lastName}
        </h3>
        <p className="text-xs text-slate-500">
          4 generace předků (modrá = otcova linie, růžová = matčina linie)
        </p>
      </div>

      <div className="relative overflow-visible">
        <svg viewBox="-450 -450 900 900" className="w-[600px] h-[600px] max-w-full drop-shadow-md overflow-visible">
          {slots.map((slot, i) => {
            if (slot.gen === 0) {
              return (
                <g
                  key={i}
                  className="cursor-pointer group"
                  onClick={() => slot.person && onSelectPerson(slot.person.id)}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r={innerBase}
                    fill="#1e293b"
                    className="stroke-2 stroke-white hover:opacity-90 transition-opacity"
                  />
                  <text
                    x="0"
                    y="-10"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {slot.person?.firstName}
                  </text>
                  <text
                    x="0"
                    y="10"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {slot.person?.lastName}
                  </text>
                  <text x="0" y="26" textAnchor="middle" fill="#cbd5e1" fontSize="9" className="pointer-events-none">
                    {extractYear(slot.person?.birthDate)}
                  </text>
                </g>
              );
            }

            const innerR = innerBase + (slot.gen - 1) * ringWidth + 4;
            const outerR = innerR + ringWidth;
            const d = describeArc(0, 0, innerR, outerR, slot.startAngle, slot.endAngle - 1);

            const midAngle = (slot.startAngle + slot.endAngle) / 2;
            const midR = (innerR + outerR) / 2;
            const textPos = polarToCartesian(0, 0, midR, midAngle);

            return (
              <g
                key={i}
                className="cursor-pointer group transition-all"
                onClick={() => slot.person && onSelectPerson(slot.person.id)}
              >
                <path
                  d={d}
                  fill={slot.person ? slot.color : '#e2e8f0'}
                  opacity={slot.person ? (slot.gen === 1 ? 0.92 : slot.gen === 2 ? 0.8 : 0.68) : 0.35}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="hover:opacity-100 hover:brightness-110 transition-all"
                />
                {slot.person && (
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={slot.gen <= 2 ? '10' : '8'}
                    fontWeight="600"
                    transform={`rotate(${midAngle > 0 && midAngle < 180 ? midAngle - 90 : midAngle + 90}, ${textPos.x}, ${textPos.y})`}
                    className="pointer-events-none select-none"
                  >
                    {slot.person.firstName} {slot.person.lastName}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * Chronological Family Timeline View
 */
function TimelineView({
  tree,
  selectedPersonId,
  onSelectPerson,
}: {
  tree: FamilyTreeData;
  selectedPersonId: string | null;
  onSelectPerson: (id: string) => void;
}) {
  const timelineEvents = useMemo(() => {
    interface EventItem {
      year: number;
      dateStr: string;
      title: string;
      type: 'BIRTH' | 'DEATH' | 'CITATION';
      place?: string;
      personId: string;
      personName: string;
      details?: string;
    }

    const events: EventItem[] = [];

    Object.values(tree.persons).forEach(p => {
      const name = `${p.firstName} ${p.lastName}`;

      if (p.birthDate) {
        const yearMatch = p.birthDate.match(/(\d{4})/);
        if (yearMatch) {
          events.push({
            year: parseInt(yearMatch[1], 10),
            dateStr: p.birthDate,
            title: `Narození: ${name}`,
            type: 'BIRTH',
            place: p.birthPlace,
            personId: p.id,
            personName: name,
            details: p.occupation ? `Povolání: ${p.occupation}` : undefined,
          });
        }
      }

      if (p.deathDate) {
        const yearMatch = p.deathDate.match(/(\d{4})/);
        if (yearMatch) {
          events.push({
            year: parseInt(yearMatch[1], 10),
            dateStr: p.deathDate,
            title: `Úmrtí: ${name}`,
            type: 'DEATH',
            place: p.deathPlace,
            personId: p.id,
            personName: name,
          });
        }
      }

      p.parishCitations.forEach(cit => {
        const yearMatch = (cit.timeSpan || cit.dateAdded || '').match(/(\d{4})/);
        if (yearMatch) {
          events.push({
            year: parseInt(yearMatch[1], 10),
            dateStr: cit.timeSpan || cit.dateAdded,
            title: `Matriční zápis: ${cit.parish || cit.signature}`,
            type: 'CITATION',
            place: cit.archiveName,
            personId: p.id,
            personName: name,
            details: cit.originalText,
          });
        }
      });
    });

    events.sort((a, b) => a.year - b.year);
    return events;
  }, [tree]);

  return (
    <div className="w-full h-full overflow-y-auto pt-20 pb-16 px-6 max-w-4xl mx-auto select-text">
      <div className="mb-6">
        <h3 className="font-serif-title font-bold text-xl text-slate-900">
          Časová osa rodinné historie ({timelineEvents.length} událostí)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Chronologický přehled narození, úmrtí a archivních záznamů.
        </p>
      </div>

      <div className="relative border-l-2 border-slate-300 ml-4 pl-6 space-y-4">
        {timelineEvents.map((evt, idx) => (
          <div
            key={idx}
            onClick={() => onSelectPerson(evt.personId)}
            className={`relative group cursor-pointer p-4 rounded-xl border bg-white shadow-xs transition-all hover:shadow-md hover:border-amber-400 ${
              selectedPersonId === evt.personId ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200'
            }`}
          >
            <div
              className={`absolute -left-[35px] top-4 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white shadow-sm ${
                evt.type === 'BIRTH'
                  ? 'bg-sky-600'
                  : evt.type === 'DEATH'
                    ? 'bg-slate-700'
                    : 'bg-emerald-600'
              }`}
            >
              {evt.type === 'BIRTH' ? '★' : evt.type === 'DEATH' ? '†' : '§'}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-base text-slate-900 tabular-nums">
                {evt.year}
              </span>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {evt.dateStr}
              </span>
            </div>

            <h4 className="font-semibold text-slate-900 text-sm mt-1">
              {evt.title}
            </h4>

            {evt.place && (
              <p className="text-xs text-slate-500 mt-1">
                {evt.place}
              </p>
            )}

            {evt.details && (
              <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg italic border border-slate-100">
                „{evt.details}“
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
