import React, { useState, useMemo } from 'react';
import { Person, Gender, FamilyTreeData } from '../types/genealogy';
import { X, UserPlus, Link2, Search, User, Check, AlertCircle } from 'lucide-react';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationType?: 'father' | 'mother' | 'spouse' | 'child' | 'standalone';
  targetPerson?: Person;
  tree: FamilyTreeData;
  onAddPerson: (newPerson: Omit<Person, 'id' | 'spouseIds' | 'childrenIds' | 'parishCitations'>) => void;
  onLinkExistingPerson: (
    relationType: 'father' | 'mother' | 'spouse' | 'child',
    targetPersonId: string,
    existingPersonId: string
  ) => void;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  isOpen,
  onClose,
  relationType = 'standalone',
  targetPerson,
  tree,
  onAddPerson,
  onLinkExistingPerson
}) => {
  // Mode: Create new person vs Link existing person from tree
  const [mode, setMode] = useState<'create' | 'link'>('create');
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');
  const [existingSearch, setExistingSearch] = useState<string>('');

  const defaultGender: Gender = relationType === 'father' ? 'M' : relationType === 'mother' ? 'F' : 'M';
  const defaultLastName = relationType === 'father' || relationType === 'child' ? (targetPerson?.lastName || '') : '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(defaultLastName);
  const [maidenName, setMaidenName] = useState('');
  const [gender, setGender] = useState<Gender>(defaultGender);
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState(targetPerson?.birthPlace || '');
  const [deathDate, setDeathDate] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [isDeceased, setIsDeceased] = useState(true);
  const [occupation, setOccupation] = useState('');
  const [religion, setReligion] = useState('Římskokatolické');
  const [notes, setNotes] = useState('');

  // Reset form when target person or relationType or isOpen changes
  React.useEffect(() => {
    if (isOpen) {
      setMode('create');
      setSelectedExistingId('');
      setExistingSearch('');
      setFirstName('');
      setLastName(relationType === 'father' || relationType === 'child' ? (targetPerson?.lastName || '') : '');
      setMaidenName('');
      setGender(relationType === 'father' ? 'M' : relationType === 'mother' ? 'F' : 'M');
      setBirthDate('');
      setBirthPlace(targetPerson?.birthPlace || '');
      setDeathDate('');
      setDeathPlace('');
      setIsDeceased(true);
      setOccupation('');
      setReligion('Římskokatolické');
      setNotes('');
    }
  }, [isOpen, targetPerson?.id, relationType]);

  const relationTitles: Record<string, string> = {
    father: `Přidat otce pro: ${targetPerson?.firstName} ${targetPerson?.lastName}`,
    mother: `Přidat matku pro: ${targetPerson?.firstName} ${targetPerson?.lastName}`,
    spouse: `Přidat manžela/ku pro: ${targetPerson?.firstName} ${targetPerson?.lastName}`,
    child: `Přidat potomka pro: ${targetPerson?.firstName} ${targetPerson?.lastName}`,
    standalone: 'Přidat novou osobu do rodokmenu'
  };

  // Eligible existing persons in tree to link
  const availableExistingPersons = useMemo(() => {
    if (!targetPerson || relationType === 'standalone') return [];

    const all = Object.values(tree.persons).filter(p => p.id !== targetPerson.id);

    // Filter out persons already having this relationship
    return all.filter(p => {
      if (relationType === 'father') {
        return p.id !== targetPerson.fatherId && p.id !== targetPerson.motherId;
      }
      if (relationType === 'mother') {
        return p.id !== targetPerson.fatherId && p.id !== targetPerson.motherId;
      }
      if (relationType === 'spouse') {
        return !targetPerson.spouseIds?.includes(p.id);
      }
      if (relationType === 'child') {
        return !targetPerson.childrenIds?.includes(p.id);
      }
      return true;
    }).sort((a, b) => {
      // Prioritize matching expected gender
      if (relationType === 'father' && a.gender !== b.gender) return a.gender === 'M' ? -1 : 1;
      if (relationType === 'mother' && a.gender !== b.gender) return a.gender === 'F' ? -1 : 1;
      return a.lastName.localeCompare(b.lastName);
    });
  }, [tree, targetPerson, relationType]);

  // Filtered by search input
  const filteredExistingPersons = useMemo(() => {
    if (!existingSearch.trim()) return availableExistingPersons;
    const q = existingSearch.toLowerCase().trim();
    return availableExistingPersons.filter(p => {
      const full = `${p.firstName} ${p.lastName} ${p.maidenName || ''} ${p.birthPlace || ''} ${p.occupation || ''}`.toLowerCase();
      return full.includes(q);
    });
  }, [availableExistingPersons, existingSearch]);

  // Detect potential duplicate already in tree while typing in create mode
  const matchingExistingCandidate = useMemo(() => {
    if (mode !== 'create' || relationType === 'standalone' || !firstName.trim()) return null;
    const fn = firstName.trim().toLowerCase();
    const ln = lastName.trim().toLowerCase();
    return availableExistingPersons.find(p => {
      const pFn = p.firstName.trim().toLowerCase();
      const pLn = p.lastName.trim().toLowerCase();
      return pFn === fn && (!ln || pLn === ln || (p.maidenName || '').trim().toLowerCase() === ln);
    }) || null;
  }, [mode, relationType, firstName, lastName, availableExistingPersons]);

  if (!isOpen) return null;

  // Handle Form Submit for New Person
  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    onAddPerson({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      maidenName: maidenName.trim() || undefined,
      gender,
      birthDate: birthDate.trim() || undefined,
      birthPlace: birthPlace.trim() || undefined,
      deathDate: deathDate.trim() || undefined,
      deathPlace: deathPlace.trim() || undefined,
      isDeceased,
      occupation: occupation.trim() || undefined,
      religion: religion.trim() || undefined,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  // Handle Linking Existing Person
  const handleLinkExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingId || !targetPerson || relationType === 'standalone') return;

    onLinkExistingPerson(relationType, targetPerson.id, selectedExistingId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-800/60 rounded-xl">
              <UserPlus className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-base text-white">
                {relationTitles[relationType] || 'Nová osoba'}
              </h3>
              <p className="text-xs text-amber-200/80">
                {relationType === 'standalone'
                  ? 'Vložte novou osobu do rodokmenu'
                  : 'Vytvořte novou osobu nebo propojte již existujícího příbuzného ze stromu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs (when adding to a target person) */}
        {relationType !== 'standalone' && targetPerson && (
          <div className="px-6 pt-3 bg-stone-100 border-b border-stone-200 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                mode === 'create'
                  ? 'bg-[#faf8f5] border-amber-800 text-amber-950 shadow-sm'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-800" />
              <span>➕ Vytvořit novou osobu</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('link')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                mode === 'link'
                  ? 'bg-[#faf8f5] border-emerald-700 text-emerald-950 shadow-sm'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>🔗 Propojit existující osobu ({availableExistingPersons.length})</span>
            </button>
          </div>
        )}

        {/* MODE 1: Create New Person Form */}
        {mode === 'create' ? (
          <form onSubmit={handleSubmitNew} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
            {matchingExistingCandidate && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2 text-emerald-950">
                  <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    Osoba <strong>{matchingExistingCandidate.firstName} {matchingExistingCandidate.lastName}</strong> už v rodokmenu je. Chcete ji jen propojit bez duplicity?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('link');
                    setSelectedExistingId(matchingExistingCandidate.id);
                    setExistingSearch(matchingExistingCandidate.firstName);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shrink-0"
                >
                  Propojit
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Jméno: *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="např. František"
                  className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Příjmení:</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="např. Dvořák"
                  className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Rodné příjmení (za svobodna):</label>
                <input
                  type="text"
                  value={maidenName}
                  onChange={e => setMaidenName(e.target.value)}
                  placeholder="např. Beková"
                  className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Pohlaví:</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                  className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                >
                  <option value="M">Muž</option>
                  <option value="F">Žena</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-stone-100 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Datum narození:</label>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    placeholder="např. 19.09.1814"
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Místo narození &amp; č.p.:</label>
                  <input
                    type="text"
                    value={birthPlace}
                    onChange={e => setBirthPlace(e.target.value)}
                    placeholder="např. Dřínov č.p. 8"
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Datum úmrtí:</label>
                  <input
                    type="text"
                    value={deathDate}
                    onChange={e => setDeathDate(e.target.value)}
                    placeholder="např. 28.03.1894"
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Místo úmrtí:</label>
                  <input
                    type="text"
                    value={deathPlace}
                    onChange={e => setDeathPlace(e.target.value)}
                    placeholder="např. Kladno"
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Povolání:</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                  placeholder="např. Mistr řeznický"
                  className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Vyznání:</label>
                <input
                  type="text"
                  value={religion}
                  onChange={e => setReligion(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-200 rounded-xl transition-colors"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                Vytvořit osobu
              </button>
            </div>
          </form>
        ) : (
          /* MODE 2: Link Existing Person from Tree */
          <form onSubmit={handleLinkExisting} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900">
              <p className="font-semibold flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-emerald-700" />
                <span>Propojení bez duplicit:</span>
              </p>
              <p className="mt-1 text-emerald-800 text-[11px] leading-relaxed">
                Vyberte osobu, která již v rodokmenu existuje. Aplikace ji propojí s osobou{' '}
                <strong>{targetPerson?.firstName} {targetPerson?.lastName}</strong> jako{' '}
                {relationType === 'father'
                  ? 'otce'
                  : relationType === 'mother'
                  ? 'matku'
                  : relationType === 'spouse'
                  ? 'manžela/ku'
                  : 'potomka'}.
              </p>
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={existingSearch}
                onChange={e => setExistingSearch(e.target.value)}
                placeholder="Filtrovat podle jména, příjmení, obce..."
                className="w-full pl-9 pr-3 py-2 bg-white text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-700/30"
              />
            </div>

            {/* List of Persons */}
            <div className="border border-stone-200 rounded-xl bg-white max-h-56 overflow-y-auto divide-y divide-stone-100">
              {filteredExistingPersons.length > 0 ? (
                filteredExistingPersons.map(p => {
                  const isSelected = selectedExistingId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedExistingId(p.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 border-l-4 border-l-emerald-600'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            p.gender === 'F'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {p.gender === 'F' ? 'Ž' : 'M'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-xs text-stone-900">
                            {p.firstName} {p.lastName}{' '}
                            {p.maidenName && (
                              <span className="text-stone-500 font-normal italic">
                                (roz. {p.maidenName})
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-stone-500">
                            {p.birthDate ? `★ ${p.birthDate}` : ''}{' '}
                            {p.birthPlace ? `(${p.birthPlace})` : ''}{' '}
                            {p.occupation ? `• ${p.occupation}` : ''}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="p-1 bg-emerald-600 text-white rounded-full">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-stone-400">
                  Nenalezena žádná dostupná osoba odpovídající hledání.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-200 rounded-xl transition-colors"
              >
                Zrušit
              </button>
              <button
                type="submit"
                disabled={!selectedExistingId}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-40"
              >
                Propojit v rodokmenu
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
