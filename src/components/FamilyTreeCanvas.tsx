import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Person, FamilyTreeData } from '../types/genealogy';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Plus, 
  BookOpen, 
  User, 
  UserCheck, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Sparkles,
  Layers,
  CircleDot,
  Compass,
  Search,
  Filter,
  Trash2
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

export const FamilyTreeCanvas: React.FC<FamilyTreeCanvasProps> = ({
  tree,
  selectedPersonId,
  onSelectPerson,
  onAddRelative,
  onDeletePerson,
  onOpenParishAssistant,
  viewMode,
  onViewModeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Zoom handlers (centered on viewport center)
  const handleZoomIn = () => {
    setZoom(prev => {
      const next = Math.min(prev * 1.2, 2.2);
      if (containerRef.current) {
        const cx = containerRef.current.clientWidth / 2;
        const cy = containerRef.current.clientHeight / 2;
        setPan(p => ({
          x: cx - (cx - p.x) * (next / prev),
          y: cy - (cy - p.y) * (next / prev)
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
          y: cy - (cy - p.y) * (next / prev)
        }));
      }
      return next;
    });
  };

  // Mouse drag panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking the background canvas
    if ((e.target as HTMLElement).closest('.person-node-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom (centered around mouse pointer)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => {
      const next = Math.max(0.35, Math.min(2.5, prev * zoomFactor));
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        setPan(p => ({
          x: mouseX - (mouseX - p.x) * (next / prev),
          y: mouseY - (mouseY - p.y) * (next / prev)
        }));
      }
      return next;
    });
  };

  // Compute ancestral generation depths relative to root person
  const personGenerations = useMemo(() => {
    const generations: Record<string, number> = {};
    const rootId = tree.rootPersonId;

    // Traverse upwards (ancestors)
    const queue: { id: string; gen: number }[] = [{ id: rootId, gen: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      generations[id] = gen;

      const p = tree.persons[id];
      if (!p) continue;

      // Parents are gen + 1
      if (p.fatherId && !visited.has(p.fatherId)) {
        queue.push({ id: p.fatherId, gen: gen + 1 });
      }
      if (p.motherId && !visited.has(p.motherId)) {
        queue.push({ id: p.motherId, gen: gen + 1 });
      }
      // Children are gen - 1
      p.childrenIds.forEach(cId => {
        if (!visited.has(cId)) {
          queue.push({ id: cId, gen: gen - 1 });
        }
      });
      // Spouses share same generation
      p.spouseIds.forEach(spId => {
        if (!visited.has(spId)) {
          queue.push({ id: spId, gen: gen });
        }
      });
    }

    // Default for any unlinked persons
    Object.keys(tree.persons).forEach(id => {
      if (generations[id] === undefined) generations[id] = 0;
    });

    return generations;
  }, [tree]);

  // Hierarchical node layout calculation for generation view
  const nodesLayout = useMemo(() => {
    const persons = Object.values(tree.persons);
    // Group by generation
    const byGen: Record<number, Person[]> = {};
    persons.forEach(p => {
      const gen = personGenerations[p.id] ?? 0;
      if (!byGen[gen]) byGen[gen] = [];
      byGen[gen].push(p);
    });

    const genKeys = Object.keys(byGen).map(Number).sort((a, b) => b - a); // Higher generations on top

    const nodePositions: Record<string, { x: number; y: number; gen: number }> = {};
    const cardWidth = 270;
    const cardSpacingX = 50;
    const genSpacingY = 220;

    let currentY = 80;

    genKeys.forEach(gen => {
      const group = byGen[gen];
      const totalWidth = group.length * cardWidth + (group.length - 1) * cardSpacingX;
      let startX = -totalWidth / 2;

      group.forEach((p, idx) => {
        nodePositions[p.id] = {
          x: startX + idx * (cardWidth + cardSpacingX),
          y: currentY,
          gen
        };
      });

      currentY += genSpacingY;
    });

    return nodePositions;
  }, [tree, personGenerations]);

  // Pedigree Layout (Ahnentafel tree up to 4 generations)
  const pedigreeLayout = useMemo(() => {
    if (viewMode !== 'pedigree') return {};
    const rootId = selectedPersonId || tree.rootPersonId;
    const pos: Record<string, { x: number; y: number; gen: number }> = {};

    function placeAncestors(id: string | undefined, gen: number, yIndex: number, totalSlots: number) {
      if (!id || gen > 3) return;
      const person = tree.persons[id];
      if (!person) return;

      const x = gen * 320;
      const slotHeight = 600 / totalSlots;
      const y = (yIndex + 0.5) * slotHeight - 300;

      pos[id] = { x, y, gen };

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

  // Bounding box of currently rendered tree
  const treeBounds = useMemo(() => {
    const currentLayout = viewMode === 'pedigree' ? pedigreeLayout : nodesLayout;
    const positions = Object.values(currentLayout);
    if (positions.length === 0) {
      return { minX: 0, maxX: 300, minY: 0, maxY: 300, width: 300, height: 300 };
    }
    const cardW = 270;
    const cardH = 200;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    positions.forEach(pos => {
      if (pos.x < minX) minX = pos.x;
      if (pos.x + cardW > maxX) maxX = pos.x + cardW;
      if (pos.y < minY) minY = pos.y;
      if (pos.y + cardH > maxY) maxY = pos.y + cardH;
    });

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(cardW, maxX - minX),
      height: Math.max(cardH, maxY - minY)
    };
  }, [viewMode, pedigreeLayout, nodesLayout]);

  // Center & Fit tree to visible screen so no cards are off-screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const viewportW = container.clientWidth || window.innerWidth;
    const viewportH = container.clientHeight || (window.innerHeight - 64);

    const { minX, minY, width: treeW, height: treeH } = treeBounds;

    // Margins: leave clear room for top toolbar (100px), bottom legend (80px), sides (60px)
    const paddingX = 60;
    const paddingTop = 100;
    const paddingBottom = 80;

    const availableW = Math.max(200, viewportW - paddingX * 2);
    const availableH = Math.max(200, viewportH - paddingTop - paddingBottom);

    const scaleX = availableW / treeW;
    const scaleY = availableH / treeH;

    // Determine target zoom, capped between 0.45 and 1.0
    const targetZoom = Math.min(1.0, Math.max(0.45, Math.min(scaleX, scaleY)));

    // Calculate center pan so the tree is centered horizontally and vertically
    const centeredPanX = (viewportW - treeW * targetZoom) / 2 - minX * targetZoom;
    const centeredPanY = paddingTop + Math.max(0, (availableH - treeH * targetZoom) / 3) - minY * targetZoom;

    setZoom(targetZoom);
    setPan({
      x: centeredPanX,
      y: centeredPanY
    });
  }, [treeBounds]);

  // Auto center on initial mount and when layout or view mode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 40);
    return () => clearTimeout(timer);
  }, [viewMode, fitToScreen]);

  // Auto center on window resize
  useEffect(() => {
    const handleResize = () => {
      fitToScreen();
    };
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
      const place = (p.birthPlace || '' + p.deathPlace || '').toLowerCase();
      const occu = (p.occupation || '').toLowerCase();
      if (fullName.includes(q) || place.includes(q) || occu.includes(q)) {
        set.add(p.id);
      }
    });
    return set;
  }, [tree, searchQuery]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#f4f0e6] select-none">
      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: View Mode Switcher */}
        <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md shadow-sm border border-stone-200/80 rounded-xl p-1 gap-1">
          <button
            onClick={() => onViewModeChange('generations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'generations'
                ? 'bg-amber-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Generační strom</span>
          </button>
          <button
            onClick={() => onViewModeChange('pedigree')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'pedigree'
                ? 'bg-amber-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Vývod z předků</span>
          </button>
          <button
            onClick={() => onViewModeChange('fan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'fan'
                ? 'bg-amber-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Vějířový kruh</span>
          </button>
          <button
            onClick={() => onViewModeChange('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'timeline'
                ? 'bg-amber-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Časová osa</span>
          </button>
        </div>

        {/* Search bar & Stats */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Hledat osobu, obec, povolání..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white/95 backdrop-blur-md text-xs border border-stone-200/80 rounded-xl shadow-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700/30 w-56 transition-all"
            />
            {searchQuery && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">
                {matchingPersonIds.size}
              </span>
            )}
          </div>

          {/* Parish Assistant Quick Trigger */}
          <button
            onClick={() => onOpenParishAssistant()}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-200" />
            <span>Hledat v matrikách &amp; AI</span>
          </button>
        </div>
      </div>

      {/* Floating Canvas Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md border border-stone-200/90 shadow-md rounded-xl p-1.5">
        <button
          onClick={handleZoomIn}
          title="Přiblížit (+)"
          className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Oddálit (-)"
          className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-stone-200 my-0.5" />
        <button
          onClick={fitToScreen}
          title="Vycentrovat a přizpůsobit rodokmen obrazovce"
          className="p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend / Status indicator */}
      <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-md border border-stone-200 shadow-sm rounded-xl px-3.5 py-2 flex items-center gap-4 text-xs text-stone-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          <span>Muž</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
          <span>Žena</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          <span className="font-medium text-emerald-800">Doloženo v matrice</span>
        </div>
        <div className="h-3 w-px bg-stone-200" />
        <span className="text-stone-400">
          Celkem: <strong className="text-stone-800">{Object.keys(tree.persons).length}</strong> osob
        </span>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {viewMode === 'fan' ? (
          <FanChartView
            tree={tree}
            selectedPersonId={selectedPersonId || tree.rootPersonId}
            onSelectPerson={onSelectPerson}
            zoom={zoom}
            pan={pan}
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
              transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            }}
            className="relative w-0 h-0"
          >
            {/* SVG Relationship Connector Lines */}
            <svg
              className="absolute pointer-events-none overflow-visible"
              style={{ left: 0, top: 0, width: '1px', height: '1px' }}
            >
              <defs>
                <linearGradient id="parentChildGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8d7b68" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#5c4d3c" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Render parent-child paths */}
              {Object.values(tree.persons).map(p => {
                const childPos = (viewMode === 'pedigree' ? pedigreeLayout : nodesLayout)[p.id];
                if (!childPos) return null;

                const lines: React.ReactNode[] = [];

                // Line to father
                if (p.fatherId) {
                  const fatherPos = (viewMode === 'pedigree' ? pedigreeLayout : nodesLayout)[p.fatherId];
                  if (fatherPos) {
                    const startX = fatherPos.x + 135;
                    const startY = fatherPos.y + 110;
                    const endX = childPos.x + 135;
                    const endY = childPos.y;
                    const midY = (startY + endY) / 2;

                    lines.push(
                      <path
                        key={`line-${p.fatherId}-${p.id}`}
                        d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="2"
                        strokeDasharray={p.parishCitations.length > 0 ? undefined : '4 3'}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                      />
                    );
                  }
                }

                // Line to mother
                if (p.motherId) {
                  const motherPos = (viewMode === 'pedigree' ? pedigreeLayout : nodesLayout)[p.motherId];
                  if (motherPos) {
                    const startX = motherPos.x + 135;
                    const startY = motherPos.y + 110;
                    const endX = childPos.x + 135;
                    const endY = childPos.y;
                    const midY = (startY + endY) / 2;

                    lines.push(
                      <path
                        key={`line-${p.motherId}-${p.id}`}
                        d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="2"
                        strokeDasharray={p.parishCitations.length > 0 ? undefined : '4 3'}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                      />
                    );
                  }
                }

                // Spouse connection
                p.spouseIds.forEach(spId => {
                  const spousePos = (viewMode === 'pedigree' ? pedigreeLayout : nodesLayout)[spId];
                  if (spousePos && spousePos.x > childPos.x) {
                    const sX = childPos.x + 270;
                    const sY = childPos.y + 45;
                    const eX = spousePos.x;
                    const eY = spousePos.y + 45;
                    lines.push(
                      <line
                        key={`spouse-${p.id}-${spId}`}
                        x1={sX}
                        y1={sY}
                        x2={eX}
                        y2={eY}
                        stroke="#b45309"
                        strokeWidth="2.5"
                        strokeDasharray="3 3"
                        className="opacity-80"
                      />
                    );
                  }
                });

                return lines;
              })}
            </svg>

            {/* Person Cards */}
            {Object.values(tree.persons).map(person => {
              const pos = (viewMode === 'pedigree' ? pedigreeLayout : nodesLayout)[person.id];
              if (!pos) return null;

              const isSelected = selectedPersonId === person.id;
              const isMatch = matchingPersonIds.has(person.id);
              const hasCitations = person.parishCitations && person.parishCitations.length > 0;

              return (
                <div
                  key={person.id}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: '270px',
                  }}
                  className={`person-node-card group rounded-xl transition-all duration-200 select-none ${
                    isSelected
                      ? 'ring-4 ring-amber-600/70 shadow-2xl scale-[1.03] z-30'
                      : 'hover:shadow-xl hover:scale-[1.01] shadow-md z-10'
                  } ${
                    isMatch ? 'ring-2 ring-emerald-500 shadow-emerald-200' : ''
                  }`}
                >
                  <div className={`p-3.5 rounded-xl border bg-white relative overflow-hidden ${
                    person.gender === 'F' ? 'border-rose-200/80' : 'border-blue-200/80'
                  }`}>
                    {/* Top color accent strip */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        person.gender === 'F' ? 'bg-rose-400' : 'bg-sky-600'
                      }`}
                    />

                    {/* Parish Archive Verified Badge */}
                    {hasCitations && (
                      <div
                        title={`Doloženo v matrice: ${person.parishCitations.length} záznam(ů)`}
                        className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-emerald-800"
                      >
                        <BookOpen className="w-3 h-3 text-emerald-600" />
                        <span>Matrika</span>
                      </div>
                    )}

                    {/* Header info */}
                    <div 
                      onClick={() => onSelectPerson(person.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 mt-1">
                        {/* Avatar / Portrait or silhouette */}
                        <div className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm shadow-inner ${
                          person.gender === 'F' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {person.avatarUrl ? (
                            <img
                              src={person.avatarUrl}
                              alt={person.firstName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 opacity-75" />
                          )}
                        </div>

                        {/* Name */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-serif-title font-bold text-sm text-stone-900 truncate">
                            {person.firstName} {person.lastName}
                          </h4>
                          {person.maidenName && (
                            <p className="text-[11px] text-stone-500 truncate italic">
                              roz. {person.maidenName}
                            </p>
                          )}
                          {person.occupation && (
                            <p className="text-[11px] text-amber-900 font-medium truncate flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5 opacity-70" />
                              {person.occupation}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Vital Dates & Places */}
                      <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] space-y-1 text-stone-600">
                        {/* Birth */}
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400 font-medium">★ Narození:</span>
                          <span className="font-medium text-stone-800 truncate ml-1">
                            {person.birthDate || 'neznámé'}
                          </span>
                        </div>
                        {person.birthPlace && (
                          <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 opacity-60 text-stone-400" />
                            <span>{person.birthPlace}</span>
                          </div>
                        )}

                        {/* Death */}
                        {(person.isDeceased || person.deathDate || person.deathPlace) && (
                          <>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-stone-400 font-medium">† Úmrtí:</span>
                              <span className="font-medium text-stone-800 truncate ml-1">
                                {person.deathDate || 'zemřel(a)'}
                              </span>
                            </div>
                            {person.deathPlace && (
                              <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 opacity-60 text-stone-400" />
                                <span>{person.deathPlace}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Add Relations Toolbar on Hover */}
                    <div className="mt-2.5 pt-1.5 border-t border-dashed border-stone-200 flex items-center justify-between gap-1 text-[10px] text-stone-500">
                      <div className="flex items-center gap-1">
                        {!person.fatherId && (
                          <button
                            onClick={() => onAddRelative('father', person.id)}
                            title="Přidat otce"
                            className="px-1.5 py-0.5 bg-stone-100 hover:bg-sky-100 hover:text-sky-800 rounded font-medium transition-colors"
                          >
                            + Otec
                          </button>
                        )}
                        {!person.motherId && (
                          <button
                            onClick={() => onAddRelative('mother', person.id)}
                            title="Přidat matku"
                            className="px-1.5 py-0.5 bg-stone-100 hover:bg-rose-100 hover:text-rose-800 rounded font-medium transition-colors"
                          >
                            + Matka
                          </button>
                        )}
                        <button
                          onClick={() => onAddRelative('spouse', person.id)}
                          title="Přidat manžela/ku"
                          className="px-1.5 py-0.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-800 rounded font-medium transition-colors"
                        >
                          + Manžel
                        </button>
                        <button
                          onClick={() => onAddRelative('child', person.id)}
                          title="Přidat potomka"
                          className="px-1.5 py-0.5 bg-stone-100 hover:bg-emerald-100 hover:text-emerald-800 rounded font-medium transition-colors"
                        >
                          + Dítě
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenParishAssistant(person)}
                          title="Vyhledat v matrikách pro tuto osobu"
                          className="p-1 text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        {confirmingDeleteId === person.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[9px]">
                            <span className="text-rose-700 font-semibold">Smazat?</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePerson(person.id);
                                setConfirmingDeleteId(null);
                              }}
                              className="px-1 py-0.2 bg-rose-600 text-white rounded font-bold hover:bg-rose-700"
                            >
                              Ano
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingDeleteId(null);
                              }}
                              className="px-1 py-0.2 bg-stone-200 text-stone-700 rounded hover:bg-stone-300"
                            >
                              Ne
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingDeleteId(person.id);
                            }}
                            title="Smazat osobu"
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
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
  zoom,
  pan
}: {
  tree: FamilyTreeData;
  selectedPersonId: string;
  onSelectPerson: (id: string) => void;
  zoom: number;
  pan: { x: number; y: number };
}) {
  const rootPerson = tree.persons[selectedPersonId] || tree.persons[tree.rootPersonId];
  if (!rootPerson) return <div className="p-8 text-center text-stone-500">Žádná osoba nevybrána.</div>;

  // Build 4-generation pedigree tree [gen 0, 1, 2, 3]
  // Gen 0: root (1)
  // Gen 1: father, mother (2)
  // Gen 2: ff, fm, mf, mm (4)
  // Gen 3: fff, ffm, fmf, fmm, mff, mfm, mmf, mmm (8)
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

    // Angle span from -160deg to +20deg (180deg semicircle fan) or full circle 360deg
    const angleRange = 240; // 240 degree elegant fan
    const baseAngle = -120;
    const step = angleRange / total;
    const startAngle = baseAngle + index * step;
    const endAngle = startAngle + step;

    // Quadrant color palette
    let color = '#d97706';
    if (gen === 0) color = '#78350f';
    else if (index < total / 2) color = '#1e40af'; // Father line (blue)
    else color = '#9f1239'; // Mother line (rose)

    slots.push({
      person: p,
      gen,
      index,
      totalInGen: total,
      startAngle,
      endAngle,
      color
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

  // SVG Arc generator
  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  }

  function describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
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
      'Z'
    ].join(' ');
  }

  const ringWidth = 80;
  const innerBase = 70;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-2 z-10">
        <h3 className="font-serif-title font-bold text-lg text-stone-800">
          Vějířový kruh předků pro: {rootPerson.firstName} {rootPerson.lastName}
        </h3>
        <p className="text-xs text-stone-500">
          Zobrazuje 4 generace předků v kruhovém diagramu (modrá = otcova linie, růžová = matčina linie)
        </p>
      </div>

      <div className="relative overflow-visible">
        <svg
          viewBox="-450 -450 900 900"
          className="w-[620px] h-[620px] max-w-full drop-shadow-md overflow-visible"
        >
          {slots.map((slot, i) => {
            if (slot.gen === 0) {
              // Center circle for root person
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
                    fill="#451a03"
                    className="stroke-2 stroke-white hover:opacity-90 transition-opacity"
                  />
                  <text
                    x="0"
                    y="-10"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="bold"
                    className="font-serif-title pointer-events-none"
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
                    className="font-serif-title pointer-events-none"
                  >
                    {slot.person?.lastName}
                  </text>
                  <text
                    x="0"
                    y="25"
                    textAnchor="middle"
                    fill="#fde68a"
                    fontSize="9"
                    className="pointer-events-none"
                  >
                    ★ {slot.person?.birthDate || ''}
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
                  fill={slot.person ? slot.color : '#e7e5e4'}
                  opacity={slot.person ? (slot.gen === 1 ? 0.9 : slot.gen === 2 ? 0.8 : 0.7) : 0.3}
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
                    className="pointer-events-none select-none font-serif-title"
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
  onSelectPerson
}: {
  tree: FamilyTreeData;
  selectedPersonId: string | null;
  onSelectPerson: (id: string) => void;
}) {
  // Extract all dated events across all persons
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

      // Parse birth
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
            details: p.occupation ? `Povolání: ${p.occupation}` : undefined
          });
        }
      }

      // Parse death
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
            personName: name
          });
        }
      }

      // Citations
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
            details: cit.originalText
          });
        }
      });
    });

    events.sort((a, b) => a.year - b.year);
    return events;
  }, [tree]);

  return (
    <div className="w-full h-full overflow-y-auto p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h3 className="font-serif-title font-bold text-xl text-stone-900">
          Časová osa rodinné historie ({timelineEvents.length} událostí)
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          Přehled významných životních milníků, narození, sňatků a archivních zápisů seřazených chronologicky.
        </p>
      </div>

      <div className="relative border-l-2 border-stone-300 ml-4 pl-6 space-y-6">
        {timelineEvents.map((evt, idx) => (
          <div
            key={idx}
            onClick={() => onSelectPerson(evt.personId)}
            className={`relative group cursor-pointer p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md hover:border-amber-400 ${
              selectedPersonId === evt.personId ? 'ring-2 ring-amber-700 border-amber-500' : 'border-stone-200'
            }`}
          >
            {/* Timeline bullet icon */}
            <div
              className={`absolute -left-[35px] top-4 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white shadow-sm ${
                evt.type === 'BIRTH'
                  ? 'bg-sky-600'
                  : evt.type === 'DEATH'
                  ? 'bg-stone-700'
                  : 'bg-emerald-600'
              }`}
            >
              {evt.type === 'BIRTH' ? '★' : evt.type === 'DEATH' ? '†' : '📜'}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-serif-title font-bold text-base text-amber-900">
                {evt.year}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                {evt.dateStr}
              </span>
            </div>

            <h4 className="font-semibold text-stone-900 text-sm mt-1">
              {evt.title}
            </h4>

            {evt.place && (
              <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-stone-400" />
                <span>{evt.place}</span>
              </p>
            )}

            {evt.details && (
              <p className="text-xs text-stone-600 mt-2 bg-stone-50 p-2 rounded-lg italic border border-stone-100">
                „{evt.details}“
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
