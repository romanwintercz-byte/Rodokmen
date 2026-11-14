import React, { useState, useEffect } from 'react';
import { FamilyTreeData, Person, AIAnalysisResult, Gender } from './types/genealogy';
import { INITIAL_SAMPLE_TREE } from './data/sampleTree';
import { decodeTreeFromUrl } from './utils/sharing';
import { FamilyTreeCanvas } from './components/FamilyTreeCanvas';
import { ParishAssistantModal } from './components/ParishAssistantModal';
import { PersonDetailModal } from './components/PersonDetailModal';
import { AddPersonModal } from './components/AddPersonModal';
import { GedcomModal } from './components/GedcomModal';
import { ShareModal } from './components/ShareModal';
import { FamilyChronicleView } from './components/FamilyChronicleView';
import { 
  BookOpen, 
  Share2, 
  Download, 
  Plus, 
  Crown, 
  RotateCcw, 
  FileText, 
  Sparkles,
  TreePine,
  CheckCircle2,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'rodokmen_matriky_data_v1';

export default function App() {
  // Load tree from URL hash if shared, otherwise from localStorage, or default sample
  const [tree, setTree] = useState<FamilyTreeData>(() => {
    const urlTree = decodeTreeFromUrl();
    if (urlTree) return urlTree;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading saved tree', e);
      }
    }
    return INITIAL_SAMPLE_TREE;
  });

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(tree.rootPersonId || 'p1');
  const [viewMode, setViewMode] = useState<'generations' | 'pedigree' | 'fan' | 'timeline'>('generations');
  
  // Modals
  const [isParishModalOpen, setIsParishModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGedcomModalOpen, setIsGedcomModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isChronicleViewOpen, setIsChronicleViewOpen] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Quick Add Context
  const [addRelationType, setAddRelationType] = useState<'father' | 'mother' | 'spouse' | 'child' | 'standalone'>('standalone');
  const [addTargetPersonId, setAddTargetPersonId] = useState<string | undefined>(undefined);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Persist to local storage whenever tree changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  }, [tree]);

  // Selected person object
  const selectedPerson = selectedPersonId ? tree.persons[selectedPersonId] || null : null;

  // Open person editor
  const handleSelectPerson = (id: string) => {
    setSelectedPersonId(id);
    setIsPersonModalOpen(true);
  };

  // Trigger adding a relative
  const handleTriggerAddRelative = (
    relationType: 'father' | 'mother' | 'spouse' | 'child',
    targetPersonId: string
  ) => {
    setAddRelationType(relationType);
    setAddTargetPersonId(targetPersonId);
    setIsAddModalOpen(true);
  };

  // Add person logic with relational linking and automatic co-parent detection
  const handleAddPerson = (
    newPersonData: Omit<Person, 'id' | 'spouseIds' | 'childrenIds' | 'parishCitations'>
  ) => {
    const newId = `p-${Date.now()}`;
    const newPerson: Person = {
      ...newPersonData,
      id: newId,
      spouseIds: [],
      childrenIds: [],
      parishCitations: []
    };

    setTree(prev => {
      const updatedPersons = { ...prev.persons, [newId]: newPerson };

      if (addTargetPersonId && updatedPersons[addTargetPersonId]) {
        const target = { ...updatedPersons[addTargetPersonId] };

        if (addRelationType === 'father') {
          target.fatherId = newId;
          newPerson.childrenIds = Array.from(new Set([...newPerson.childrenIds, target.id]));

          // AUTOMATIC CO-PARENT SPOUSE LINK:
          // If child already has a mother, automatically link this father and mother as spouses!
          if (target.motherId && updatedPersons[target.motherId]) {
            const mother = { ...updatedPersons[target.motherId] };
            mother.spouseIds = Array.from(new Set([...(mother.spouseIds || []), newId]));
            newPerson.spouseIds = Array.from(new Set([...newPerson.spouseIds, mother.id]));
            // Also link any siblings with same mother who don't have father set
            (mother.childrenIds || []).forEach(siblingId => {
              if (updatedPersons[siblingId] && !updatedPersons[siblingId].fatherId) {
                updatedPersons[siblingId] = { ...updatedPersons[siblingId], fatherId: newId };
                newPerson.childrenIds = Array.from(new Set([...newPerson.childrenIds, siblingId]));
              }
            });
            updatedPersons[target.motherId] = mother;
          }
        } else if (addRelationType === 'mother') {
          target.motherId = newId;
          newPerson.childrenIds = Array.from(new Set([...newPerson.childrenIds, target.id]));

          // AUTOMATIC CO-PARENT SPOUSE LINK:
          // If child already has a father, automatically link this mother and father as spouses!
          if (target.fatherId && updatedPersons[target.fatherId]) {
            const father = { ...updatedPersons[target.fatherId] };
            father.spouseIds = Array.from(new Set([...(father.spouseIds || []), newId]));
            newPerson.spouseIds = Array.from(new Set([...newPerson.spouseIds, father.id]));
            // Also link any siblings with same father who don't have mother set
            (father.childrenIds || []).forEach(siblingId => {
              if (updatedPersons[siblingId] && !updatedPersons[siblingId].motherId) {
                updatedPersons[siblingId] = { ...updatedPersons[siblingId], motherId: newId };
                newPerson.childrenIds = Array.from(new Set([...newPerson.childrenIds, siblingId]));
              }
            });
            updatedPersons[target.fatherId] = father;
          }
        } else if (addRelationType === 'spouse') {
          target.spouseIds = Array.from(new Set([...(target.spouseIds || []), newId]));
          newPerson.spouseIds = [target.id];

          // Co-parenting: If target already has children who lack this parent, link them
          if (target.gender === 'M' && newPerson.gender === 'F') {
            (target.childrenIds || []).forEach(cId => {
              const child = updatedPersons[cId];
              if (child && !child.motherId) {
                updatedPersons[cId] = { ...child, motherId: newId };
                newPerson.childrenIds = Array.from(new Set([...newPerson.childrenIds, cId]));
              }
            });
          } else if (target.gender === 'F' && newPerson.gender === 'M') {
            (target.childrenIds || []).forEach(cId => {
              const child = updatedPersons[cId];
              if (child && !child.fatherId) {
                updatedPersons[cId] = { ...child, fatherId: newId };
                newPerson.childrenIds = Array.from(new Set([...newPerson.childrenIds, cId]));
              }
            });
          }
        } else if (addRelationType === 'child') {
          target.childrenIds = Array.from(new Set([...(target.childrenIds || []), newId]));
          if (target.gender === 'F') {
            newPerson.motherId = target.id;
            // If mother has a spouse, auto-link father
            if (target.spouseIds && target.spouseIds.length === 1) {
              const spId = target.spouseIds[0];
              const sp = updatedPersons[spId];
              if (sp && sp.gender === 'M') {
                newPerson.fatherId = spId;
                updatedPersons[spId] = {
                  ...sp,
                  childrenIds: Array.from(new Set([...(sp.childrenIds || []), newId]))
                };
              }
            }
          } else {
            newPerson.fatherId = target.id;
            // If father has a spouse, auto-link mother
            if (target.spouseIds && target.spouseIds.length === 1) {
              const spId = target.spouseIds[0];
              const sp = updatedPersons[spId];
              if (sp && sp.gender === 'F') {
                newPerson.motherId = spId;
                updatedPersons[spId] = {
                  ...sp,
                  childrenIds: Array.from(new Set([...(sp.childrenIds || []), newId]))
                };
              }
            }
          }
        }

        updatedPersons[addTargetPersonId] = target;
      }

      return {
        ...prev,
        persons: updatedPersons,
        lastModified: new Date().toISOString()
      };
    });

    setSelectedPersonId(newId);
    showToast(`Osoba ${newPerson.firstName} ${newPerson.lastName} byla přidána.`);
  };

  // Link existing person in the tree as relative
  const handleLinkExistingPerson = (
    relationType: 'father' | 'mother' | 'spouse' | 'child',
    targetPersonId: string,
    existingPersonId: string
  ) => {
    if (targetPersonId === existingPersonId) return;

    setTree(prev => {
      const updatedPersons = { ...prev.persons };
      const target = updatedPersons[targetPersonId] ? { ...updatedPersons[targetPersonId] } : null;
      const existing = updatedPersons[existingPersonId] ? { ...updatedPersons[existingPersonId] } : null;

      if (!target || !existing) return prev;

      if (relationType === 'father') {
        target.fatherId = existing.id;
        existing.childrenIds = Array.from(new Set([...(existing.childrenIds || []), target.id]));

        // Auto-link co-parent spouse if mother exists
        if (target.motherId && updatedPersons[target.motherId]) {
          const mother = { ...updatedPersons[target.motherId] };
          mother.spouseIds = Array.from(new Set([...(mother.spouseIds || []), existing.id]));
          existing.spouseIds = Array.from(new Set([...(existing.spouseIds || []), mother.id]));
          // Also link any siblings with same mother who don't have father set
          (mother.childrenIds || []).forEach(siblingId => {
            if (updatedPersons[siblingId] && !updatedPersons[siblingId].fatherId) {
              updatedPersons[siblingId] = { ...updatedPersons[siblingId], fatherId: existing.id };
              existing.childrenIds = Array.from(new Set([...(existing.childrenIds || []), siblingId]));
            }
          });
          updatedPersons[target.motherId] = mother;
        }
      } else if (relationType === 'mother') {
        target.motherId = existing.id;
        existing.childrenIds = Array.from(new Set([...(existing.childrenIds || []), target.id]));

        // Auto-link co-parent spouse if father exists
        if (target.fatherId && updatedPersons[target.fatherId]) {
          const father = { ...updatedPersons[target.fatherId] };
          father.spouseIds = Array.from(new Set([...(father.spouseIds || []), existing.id]));
          existing.spouseIds = Array.from(new Set([...(existing.spouseIds || []), father.id]));
          // Also link any siblings with same father who don't have mother set
          (father.childrenIds || []).forEach(siblingId => {
            if (updatedPersons[siblingId] && !updatedPersons[siblingId].motherId) {
              updatedPersons[siblingId] = { ...updatedPersons[siblingId], motherId: existing.id };
              existing.childrenIds = Array.from(new Set([...(existing.childrenIds || []), siblingId]));
            }
          });
          updatedPersons[target.fatherId] = father;
        }
      } else if (relationType === 'spouse') {
        target.spouseIds = Array.from(new Set([...(target.spouseIds || []), existing.id]));
        existing.spouseIds = Array.from(new Set([...(existing.spouseIds || []), target.id]));

        // Mutual co-parenting for empty parent fields
        if (target.gender === 'M' && existing.gender === 'F') {
          (target.childrenIds || []).forEach(cId => {
            if (updatedPersons[cId] && !updatedPersons[cId].motherId) {
              updatedPersons[cId] = { ...updatedPersons[cId], motherId: existing.id };
              existing.childrenIds = Array.from(new Set([...(existing.childrenIds || []), cId]));
            }
          });
          (existing.childrenIds || []).forEach(cId => {
            if (updatedPersons[cId] && !updatedPersons[cId].fatherId) {
              updatedPersons[cId] = { ...updatedPersons[cId], fatherId: target.id };
              target.childrenIds = Array.from(new Set([...(target.childrenIds || []), cId]));
            }
          });
        } else if (target.gender === 'F' && existing.gender === 'M') {
          (target.childrenIds || []).forEach(cId => {
            if (updatedPersons[cId] && !updatedPersons[cId].fatherId) {
              updatedPersons[cId] = { ...updatedPersons[cId], fatherId: existing.id };
              existing.childrenIds = Array.from(new Set([...(existing.childrenIds || []), cId]));
            }
          });
          (existing.childrenIds || []).forEach(cId => {
            if (updatedPersons[cId] && !updatedPersons[cId].motherId) {
              updatedPersons[cId] = { ...updatedPersons[cId], motherId: target.id };
              target.childrenIds = Array.from(new Set([...(target.childrenIds || []), cId]));
            }
          });
        }
      } else if (relationType === 'child') {
        target.childrenIds = Array.from(new Set([...(target.childrenIds || []), existing.id]));
        if (target.gender === 'F') {
          existing.motherId = target.id;
          if (target.spouseIds?.length === 1 && !existing.fatherId) {
            const spId = target.spouseIds[0];
            if (updatedPersons[spId]) {
              existing.fatherId = spId;
              updatedPersons[spId] = {
                ...updatedPersons[spId],
                childrenIds: Array.from(new Set([...(updatedPersons[spId].childrenIds || []), existing.id]))
              };
            }
          }
        } else {
          existing.fatherId = target.id;
          if (target.spouseIds?.length === 1 && !existing.motherId) {
            const spId = target.spouseIds[0];
            if (updatedPersons[spId]) {
              existing.motherId = spId;
              updatedPersons[spId] = {
                ...updatedPersons[spId],
                childrenIds: Array.from(new Set([...(updatedPersons[spId].childrenIds || []), existing.id]))
              };
            }
          }
        }
      }

      updatedPersons[targetPersonId] = target;
      updatedPersons[existingPersonId] = existing;

      return {
        ...prev,
        persons: updatedPersons,
        lastModified: new Date().toISOString()
      };
    });

    showToast(`Osoba byla úspěšně propojena v rodokmenu.`);
  };

  // Disconnect / unlink relation without deleting person
  const handleUnlinkRelation = (
    personId: string,
    relationType: 'father' | 'mother' | 'spouse' | 'child',
    relatedPersonId: string
  ) => {
    setTree(prev => {
      const updatedPersons = { ...prev.persons };
      const current = updatedPersons[personId] ? { ...updatedPersons[personId] } : null;
      const related = updatedPersons[relatedPersonId] ? { ...updatedPersons[relatedPersonId] } : null;

      if (!current) return prev;

      if (relationType === 'father') {
        current.fatherId = undefined;
        if (related && related.childrenIds) {
          related.childrenIds = related.childrenIds.filter(id => id !== personId);
          updatedPersons[relatedPersonId] = related;
        }
      } else if (relationType === 'mother') {
        current.motherId = undefined;
        if (related && related.childrenIds) {
          related.childrenIds = related.childrenIds.filter(id => id !== personId);
          updatedPersons[relatedPersonId] = related;
        }
      } else if (relationType === 'spouse') {
        if (current.spouseIds) {
          current.spouseIds = current.spouseIds.filter(id => id !== relatedPersonId);
        }
        if (related && related.spouseIds) {
          related.spouseIds = related.spouseIds.filter(id => id !== personId);
          updatedPersons[relatedPersonId] = related;
        }
      } else if (relationType === 'child') {
        if (current.childrenIds) {
          current.childrenIds = current.childrenIds.filter(id => id !== relatedPersonId);
        }
        if (related) {
          if (related.fatherId === personId) related.fatherId = undefined;
          if (related.motherId === personId) related.motherId = undefined;
          updatedPersons[relatedPersonId] = related;
        }
      }

      updatedPersons[personId] = current;

      return {
        ...prev,
        persons: updatedPersons,
        lastModified: new Date().toISOString()
      };
    });

    showToast('Příbuzenská vazba byla odpojena.');
  };

  // Update existing person
  const handleUpdatePerson = (updatedPerson: Person) => {
    setTree(prev => ({
      ...prev,
      persons: {
        ...prev.persons,
        [updatedPerson.id]: updatedPerson
      },
      lastModified: new Date().toISOString()
    }));
  };

  // Delete person and clean up references
  const handleDeletePerson = (personId: string) => {
    setTree(prev => {
      const updated = { ...prev.persons };
      delete updated[personId];

      // Remove references in remaining persons
      Object.keys(updated).forEach(id => {
        const p = { ...updated[id] };
        if (p.fatherId === personId) p.fatherId = undefined;
        if (p.motherId === personId) p.motherId = undefined;
        if (p.spouseIds) {
          p.spouseIds = p.spouseIds.filter(spId => spId !== personId);
        }
        if (p.childrenIds) {
          p.childrenIds = p.childrenIds.filter(cId => cId !== personId);
        }
        updated[id] = p;
      });

      const remainingIds = Object.keys(updated);
      const newRoot = prev.rootPersonId === personId ? remainingIds[0] || '' : prev.rootPersonId;

      return {
        ...prev,
        rootPersonId: newRoot,
        persons: updated,
        lastModified: new Date().toISOString()
      };
    });

    if (selectedPersonId === personId) {
      setSelectedPersonId(null);
    }
    setIsPersonModalOpen(false);
    showToast('Osoba byla úspěšně smazána z rodokmenu.');
  };

  // Set new root person
  const handleSetRootPerson = (personId: string) => {
    setTree(prev => ({
      ...prev,
      rootPersonId: personId,
      lastModified: new Date().toISOString()
    }));
    showToast('Byla nastavena nová výchozí osoba rodokmenu.');
  };

  // Automatic fill / merge from AI Parish Record Analysis
  const handleApplyExtractedData = (result: AIAnalysisResult, targetPersonId?: string) => {
    const ext = result.extractedPerson;
    const cit = result.citationSuggestion;

    const newCitation = {
      id: `cit-${Date.now()}`,
      archiveName: cit.archiveName || 'Online archiv',
      parish: cit.parish || ext.birthPlace || 'Česká farnost',
      bookType: (result.recordType as any) || 'N',
      signature: cit.signature || '',
      folio: cit.folio || '',
      directUrl: '',
      originalText: result.originalTranscription,
      verified: true,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    setTree(prev => {
      const updatedPersons = { ...prev.persons };

      // Case 1: Merge into existing person if target specified
      if (targetPersonId && updatedPersons[targetPersonId]) {
        const existing = { ...updatedPersons[targetPersonId] };
        if (ext.firstName && !existing.firstName) existing.firstName = ext.firstName;
        if (ext.lastName && !existing.lastName) existing.lastName = ext.lastName;
        if (ext.maidenName && !existing.maidenName) existing.maidenName = ext.maidenName;
        if (ext.birthDate && !existing.birthDate) existing.birthDate = ext.birthDate;
        if (ext.birthPlace && !existing.birthPlace) existing.birthPlace = ext.birthPlace;
        if (ext.deathDate && !existing.deathDate) existing.deathDate = ext.deathDate;
        if (ext.deathPlace && !existing.deathPlace) existing.deathPlace = ext.deathPlace;
        if (ext.occupation && !existing.occupation) existing.occupation = ext.occupation;

        existing.parishCitations = [...(existing.parishCitations || []), newCitation];
        updatedPersons[targetPersonId] = existing;

        return {
          ...prev,
          persons: updatedPersons,
          lastModified: new Date().toISOString()
        };
      }

      // Case 2: Create new person node from record
      const newPersonId = `p-${Date.now()}`;
      const newPerson: Person = {
        id: newPersonId,
        firstName: ext.firstName || 'Neznámé jméno',
        lastName: ext.lastName || '',
        maidenName: ext.maidenName,
        gender: (ext.gender as Gender) || 'M',
        birthDate: ext.birthDate,
        birthPlace: ext.birthPlace ? `${ext.birthPlace}${ext.houseNumber ? ` č.p. ${ext.houseNumber}` : ''}` : undefined,
        deathDate: ext.deathDate,
        deathPlace: ext.deathPlace,
        isDeceased: Boolean(ext.deathDate || ext.deathPlace || (result.recordType === 'Z')),
        occupation: ext.occupation,
        religion: ext.religion || 'Římskokatolické',
        notes: result.notesAndContext,
        spouseIds: [],
        childrenIds: [],
        parishCitations: [newCitation]
      };

      updatedPersons[newPersonId] = newPerson;

      // Also create Father node if parents extracted
      if (result.parents?.fatherName) {
        const fatherId = `p-father-${Date.now()}`;
        const fatherParts = result.parents.fatherName.split(' ');
        const fatherFirstName = fatherParts[0] || 'Otec';
        const fatherLastName = fatherParts.slice(1).join(' ') || newPerson.lastName;

        const fatherPerson: Person = {
          id: fatherId,
          firstName: fatherFirstName,
          lastName: fatherLastName,
          gender: 'M',
          birthPlace: result.parents.fatherOrigin,
          occupation: result.parents.fatherOccupation,
          isDeceased: true,
          spouseIds: [],
          childrenIds: [newPersonId],
          parishCitations: []
        };
        updatedPersons[fatherId] = fatherPerson;
        newPerson.fatherId = fatherId;
      }

      // Also create Mother node if mother extracted
      if (result.parents?.motherName) {
        const motherId = `p-mother-${Date.now()}`;
        const motherParts = result.parents.motherName.split(' ');
        const motherFirstName = motherParts[0] || 'Matka';
        const motherLastName = result.parents.motherMaidenName || motherParts.slice(1).join(' ') || '';

        const motherPerson: Person = {
          id: motherId,
          firstName: motherFirstName,
          lastName: newPerson.lastName,
          maidenName: result.parents.motherMaidenName,
          gender: 'F',
          birthPlace: result.parents.motherOrigin,
          isDeceased: true,
          spouseIds: [],
          childrenIds: [newPersonId],
          parishCitations: []
        };
        updatedPersons[motherId] = motherPerson;
        newPerson.motherId = motherId;
      }

      return {
        ...prev,
        persons: updatedPersons,
        lastModified: new Date().toISOString()
      };
    });

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 }
    });

    showToast('Data z matriky byla úspěšně přepsána a vložena do rodokmenu!');
  };

  // Reset to original authentic sample tree
  const handleResetToSample = () => {
    setTree(INITIAL_SAMPLE_TREE);
    setSelectedPersonId(INITIAL_SAMPLE_TREE.rootPersonId);
    setIsConfirmingReset(false);
    showToast('Ukázkový rodokmen byl obnoven.');
  };

  // If in printable chronicle book view mode
  if (isChronicleViewOpen) {
    return (
      <FamilyChronicleView
        tree={tree}
        onBackToGraph={() => setIsChronicleViewOpen(false)}
        onSelectPerson={id => {
          setSelectedPersonId(id);
          setIsChronicleViewOpen(false);
          setIsPersonModalOpen(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#faf8f5] text-stone-900 font-sans">
      
      {/* Top Application Header */}
      <header className="h-16 px-5 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 text-white flex items-center justify-between border-b border-stone-800 shadow-md shrink-0 z-30">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-md border border-amber-400/30">
            <TreePine className="w-6 h-6 text-amber-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif-title font-bold text-base text-amber-100 tracking-wide">
                Rodokmen &amp; Matriky Online
              </h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-semibold">
                GEDCOM 5.5.1
              </span>
            </div>
            <p className="text-xs text-stone-300 truncate max-w-sm">
              {tree.treeName} • <span className="text-amber-200/90">{Object.keys(tree.persons).length} osob</span>
            </p>
          </div>
        </div>

        {/* Center: Online Matriky & AI Prominent Button */}
        <div className="hidden lg:flex items-center">
          <button
            onClick={() => setIsParishModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-lg border border-emerald-400/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-emerald-200" />
            <span>Hledat v online matrikách &amp; AI přepis</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Add */}
          <button
            onClick={() => {
              setAddRelationType('standalone');
              setAddTargetPersonId(undefined);
              setIsAddModalOpen(true);
            }}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg border border-stone-700 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Nová osoba</span>
          </button>

          {/* GEDCOM */}
          <button
            onClick={() => setIsGedcomModalOpen(true)}
            title="Export a import formátu GEDCOM"
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg border border-stone-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">GEDCOM</span>
          </button>

          {/* Share */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            title="Sdílet rodokmen s rodinou"
            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Sdílet s rodinou</span>
          </button>

          {/* Chronicle book view */}
          <button
            onClick={() => setIsChronicleViewOpen(true)}
            title="Zobrazit knihu rodu pro tisk a čtení"
            className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg border border-stone-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Reset sample */}
          {isConfirmingReset ? (
            <div className="flex items-center gap-1 bg-amber-950/90 border border-amber-600 px-2 py-1 rounded-lg text-xs">
              <span className="text-[11px] text-amber-200">Obnovit ukázku?</span>
              <button
                onClick={handleResetToSample}
                className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold"
              >
                Ano
              </button>
              <button
                onClick={() => setIsConfirmingReset(false)}
                className="px-1.5 py-0.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded text-[10px]"
              >
                Ne
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmingReset(true)}
              title="Obnovit ukázkový rodokmen"
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg border border-stone-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 relative overflow-hidden">
        <FamilyTreeCanvas
          tree={tree}
          selectedPersonId={selectedPersonId}
          onSelectPerson={handleSelectPerson}
          onAddRelative={handleTriggerAddRelative}
          onDeletePerson={handleDeletePerson}
          onOpenParishAssistant={person => {
            setSelectedPersonId(person?.id || null);
            setIsParishModalOpen(true);
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </main>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-stone-900/95 backdrop-blur-md text-white text-xs font-medium rounded-xl shadow-xl border border-stone-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODALS */}
      
      {/* 1. Online Matriky & AI Assistant Modal */}
      {isParishModalOpen && (
        <ParishAssistantModal
          isOpen={isParishModalOpen}
          onClose={() => setIsParishModalOpen(false)}
          targetPerson={selectedPerson || undefined}
          onApplyExtractedData={handleApplyExtractedData}
        />
      )}

      {/* 2. Person Detail / Inspector Drawer */}
      {isPersonModalOpen && selectedPerson && (
        <PersonDetailModal
          isOpen={isPersonModalOpen}
          onClose={() => setIsPersonModalOpen(false)}
          person={selectedPerson}
          tree={tree}
          onUpdatePerson={handleUpdatePerson}
          onDeletePerson={handleDeletePerson}
          onSetRootPerson={handleSetRootPerson}
          onAddRelative={handleTriggerAddRelative}
          onLinkExistingPerson={handleLinkExistingPerson}
          onUnlinkRelation={handleUnlinkRelation}
          onSelectRelative={handleSelectPerson}
          onOpenParishAssistant={person => {
            setSelectedPersonId(person.id);
            setIsParishModalOpen(true);
          }}
        />
      )}

      {/* 3. Add Person Modal */}
      {isAddModalOpen && (
        <AddPersonModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          relationType={addRelationType}
          targetPerson={addTargetPersonId ? tree.persons[addTargetPersonId] : undefined}
          tree={tree}
          onAddPerson={handleAddPerson}
          onLinkExistingPerson={handleLinkExistingPerson}
        />
      )}

      {/* 4. GEDCOM Export & Import Modal */}
      {isGedcomModalOpen && (
        <GedcomModal
          isOpen={isGedcomModalOpen}
          onClose={() => setIsGedcomModalOpen(false)}
          tree={tree}
          onImportTree={importedTree => {
            setTree(importedTree);
            setSelectedPersonId(importedTree.rootPersonId);
            showToast(`Importováno ${Object.keys(importedTree.persons).length} osob z GEDCOM!`);
          }}
        />
      )}

      {/* 5. Share with Family Modal */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          tree={tree}
          onOpenChronicle={() => setIsChronicleViewOpen(true)}
        />
      )}

    </div>
  );
}
