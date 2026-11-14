import React, { useState } from 'react';
import { Person, FamilyTreeData, ParishCitation } from '../types/genealogy';
import { calculateRelationship } from '../utils/sharing';
import { 
  X, 
  User, 
  Calendar, 
  MapPin, 
  Briefcase, 
  BookOpen, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  Check, 
  Save,
  Link,
  Crown,
  Link2,
  Unlink,
  ArrowRight
} from 'lucide-react';

interface PersonDetailModalProps {
  person: Person | null;
  tree: FamilyTreeData;
  isOpen: boolean;
  onClose: () => void;
  onUpdatePerson: (updatedPerson: Person) => void;
  onDeletePerson: (personId: string) => void;
  onSetRootPerson: (personId: string) => void;
  onAddRelative: (relationType: 'father' | 'mother' | 'spouse' | 'child', targetPersonId: string) => void;
  onLinkExistingPerson?: (relationType: 'father' | 'mother' | 'spouse' | 'child', targetPersonId: string, existingPersonId: string) => void;
  onUnlinkRelation?: (personId: string, relationType: 'father' | 'mother' | 'spouse' | 'child', relatedPersonId: string) => void;
  onSelectRelative?: (personId: string) => void;
  onOpenParishAssistant: (person: Person) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  person,
  tree,
  isOpen,
  onClose,
  onUpdatePerson,
  onDeletePerson,
  onSetRootPerson,
  onAddRelative,
  onLinkExistingPerson,
  onUnlinkRelation,
  onSelectRelative,
  onOpenParishAssistant
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'citations' | 'family'>('info');
  const [formData, setFormData] = useState<Person>(() => person ? { ...person } : ({} as Person));
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [inlineLinkTarget, setInlineLinkTarget] = useState<'father' | 'mother' | 'spouse' | 'child' | null>(null);
  const [inlineSelectedId, setInlineSelectedId] = useState<string>('');

  // Reset confirmation state and sync formData when person changes
  React.useEffect(() => {
    if (person) {
      setFormData({ ...person });
      setIsConfirmingDelete(false);
      setInlineLinkTarget(null);
      setInlineSelectedId('');
    }
  }, [person]);

  // New citation form
  const [showAddCitation, setShowAddCitation] = useState(false);
  const [newCitation, setNewCitation] = useState<Partial<ParishCitation>>({
    archiveName: 'ActaPublica (SOA Praha)',
    parish: '',
    bookType: 'N',
    signature: '',
    folio: '',
    directUrl: '',
    originalText: '',
    verified: true
  });

  if (!isOpen || !person) return null;

  const isRoot = tree.rootPersonId === person.id;
  const relationshipToRoot = calculateRelationship(person.id, tree.rootPersonId, tree.persons);

  const handleSave = () => {
    // Preserve latest relational links from prop so profile edits never overwrite freshly linked spouses/parents/children
    onUpdatePerson({
      ...formData,
      fatherId: person.fatherId,
      motherId: person.motherId,
      spouseIds: person.spouseIds,
      childrenIds: person.childrenIds,
      parishCitations: formData.parishCitations || person.parishCitations
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const getEligibleForInlineLink = (rel: 'father' | 'mother' | 'spouse' | 'child') => {
    return Object.values(tree.persons)
      .filter(p => {
        if (p.id === person.id) return false;
        if (rel === 'father' || rel === 'mother') {
          return p.id !== person.fatherId && p.id !== person.motherId;
        }
        if (rel === 'spouse') {
          return !person.spouseIds?.includes(p.id);
        }
        if (rel === 'child') {
          return !person.childrenIds?.includes(p.id);
        }
        return true;
      })
      .sort((a, b) => {
        if (rel === 'father' && a.gender !== b.gender) return a.gender === 'M' ? -1 : 1;
        if (rel === 'mother' && a.gender !== b.gender) return a.gender === 'F' ? -1 : 1;
        if (rel === 'spouse' && a.gender !== b.gender) {
          return a.gender !== person.gender ? -1 : 1;
        }
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });
  };

  const handleConfirmInlineLink = (rel: 'father' | 'mother' | 'spouse' | 'child') => {
    if (!inlineSelectedId || !onLinkExistingPerson) return;
    onLinkExistingPerson(rel, person.id, inlineSelectedId);
    setInlineLinkTarget(null);
    setInlineSelectedId('');
  };

  const handleAddCitation = () => {
    if (!newCitation.signature && !newCitation.parish) return;

    const citation: ParishCitation = {
      id: `cit-${Date.now()}`,
      archiveName: newCitation.archiveName || 'Online archiv',
      parish: newCitation.parish || 'Neznámá farnost',
      bookType: newCitation.bookType || 'N',
      signature: newCitation.signature || '',
      folio: newCitation.folio || '',
      directUrl: newCitation.directUrl || '',
      originalText: newCitation.originalText || '',
      verified: true,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    const updated = {
      ...formData,
      parishCitations: [...(formData.parishCitations || []), citation]
    };
    setFormData(updated);
    onUpdatePerson(updated);
    setShowAddCitation(false);
    setNewCitation({
      archiveName: 'ActaPublica (SOA Praha)',
      parish: '',
      bookType: 'N',
      signature: '',
      folio: '',
      directUrl: '',
      originalText: '',
      verified: true
    });
  };

  const handleDeleteCitation = (citId: string) => {
    const updated = {
      ...formData,
      parishCitations: formData.parishCitations.filter(c => c.id !== citId)
    };
    setFormData(updated);
    onUpdatePerson(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner overflow-hidden ${
              formData.gender === 'F' ? 'bg-rose-900/60 text-rose-200' : 'bg-sky-900/60 text-sky-200'
            }`}>
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 opacity-80" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-title font-bold text-lg text-white">
                  {formData.firstName} {formData.lastName}
                </h3>
                {isRoot && (
                  <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                    <Crown className="w-3 h-3" />
                    <span>Výchozí osoba</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300 flex items-center gap-2">
                <span>Vztah k hlavní linii: <strong className="text-amber-200">{relationshipToRoot}</strong></span>
                {formData.parishCitations?.length > 0 && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    • <BookOpen className="w-3 h-3" /> {formData.parishCitations.length} záznamů v matrice
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 bg-stone-100 border-b border-stone-200 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'info'
                  ? 'bg-[#faf8f5] border-amber-800 text-amber-950 shadow-sm'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              Osobní údaje &amp; život
            </button>
            <button
              onClick={() => setActiveTab('citations')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'citations'
                  ? 'bg-[#faf8f5] border-amber-800 text-amber-950 shadow-sm'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              <span>Matriční zápisy</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                {formData.parishCitations?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'family'
                  ? 'bg-[#faf8f5] border-amber-800 text-amber-950 shadow-sm'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              Příbuzenské vazby
            </button>
          </div>

          <button
            onClick={() => onOpenParishAssistant(formData)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vyhledat v matrikách (AI)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: Personal Info */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Jméno:</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Příjmení:</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Rodné příjmení (za svobodna):</label>
                  <input
                    type="text"
                    value={formData.maidenName || ''}
                    onChange={e => setFormData({ ...formData, maidenName: e.target.value })}
                    placeholder="např. Čermáková"
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Pohlaví:</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                  >
                    <option value="M">Muž</option>
                    <option value="F">Žena</option>
                  </select>
                </div>
              </div>

              {/* Birth & Death */}
              <div className="p-3.5 bg-stone-100/70 border border-stone-200 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Datum narození (křtu):</label>
                    <input
                      type="text"
                      value={formData.birthDate || ''}
                      onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                      placeholder="např. 08.09.1841"
                      className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Místo narození &amp; č.p.:</label>
                    <input
                      type="text"
                      value={formData.birthPlace || ''}
                      onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                      placeholder="např. Nelahozeves č.p. 12"
                      className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Datum úmrtí:</label>
                    <input
                      type="text"
                      value={formData.deathDate || ''}
                      onChange={e => setFormData({ ...formData, deathDate: e.target.value, isDeceased: true })}
                      placeholder="např. 01.05.1904"
                      className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Místo úmrtí:</label>
                    <input
                      type="text"
                      value={formData.deathPlace || ''}
                      onChange={e => setFormData({ ...formData, deathPlace: e.target.value, isDeceased: true })}
                      placeholder="např. Praha"
                      className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                    />
                  </div>
                </div>
              </div>

              {/* Occupation & Residence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Povolání / stav:</label>
                  <input
                    type="text"
                    value={formData.occupation || ''}
                    onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="např. Mistr řeznický, mlynář"
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Náboženské vyznání:</label>
                  <input
                    type="text"
                    value={formData.religion || ''}
                    onChange={e => setFormData({ ...formData, religion: e.target.value })}
                    placeholder="např. Římskokatolické, Evangelické"
                    className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
              </div>

              {/* Notes / Bio */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Životopisné poznámky a paměti:</label>
                <textarea
                  rows={3}
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Záznamy z rodinné kroniky, gruntovních knih, vojenské služby..."
                  className="w-full px-3 py-2 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                />
              </div>

              {/* Portrait URL */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Odkaz na fotografii / portrét (URL):</label>
                <input
                  type="text"
                  value={formData.avatarUrl || ''}
                  onChange={e => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Parish Citations */}
          {activeTab === 'citations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif-title font-bold text-sm text-stone-900">
                    Doložené matriční zápisy &amp; archivní prameny
                  </h4>
                  <p className="text-xs text-stone-500">
                    Odkazy na konkrétní matriky, signatury, snímky a původní přepisy.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddCitation(!showAddCitation)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Přidat pramen</span>
                </button>
              </div>

              {/* Add citation inline form */}
              {showAddCitation && (
                <div className="bg-white p-4 rounded-xl border border-emerald-300 shadow-sm space-y-3">
                  <h5 className="font-semibold text-xs text-emerald-900">Nový matriční zápis</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Archiv:</label>
                      <input
                        type="text"
                        value={newCitation.archiveName}
                        onChange={e => setNewCitation({ ...newCitation, archiveName: e.target.value })}
                        placeholder="např. ActaPublica (SOA Praha)"
                        className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Farnost:</label>
                      <input
                        type="text"
                        value={newCitation.parish}
                        onChange={e => setNewCitation({ ...newCitation, parish: e.target.value })}
                        placeholder="např. Nelahozeves"
                        className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Typ knihy:</label>
                      <select
                        value={newCitation.bookType}
                        onChange={e => setNewCitation({ ...newCitation, bookType: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                      >
                        <option value="N">Narození / křty</option>
                        <option value="O">Oddaní / sňatky</option>
                        <option value="Z">Zemřelí</option>
                        <option value="SCITANI">Sčítací operát (sčítání lidu)</option>
                        <option value="INDEX">Rejstřík / Index</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Signatura:</label>
                      <input
                        type="text"
                        value={newCitation.signature}
                        onChange={e => setNewCitation({ ...newCitation, signature: e.target.value })}
                        placeholder="např. Nelahozeves 04"
                        className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">Folio / snímek:</label>
                      <input
                        type="text"
                        value={newCitation.folio}
                        onChange={e => setNewCitation({ ...newCitation, folio: e.target.value })}
                        placeholder="např. fol. 78, sn. 82"
                        className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Přímý odkaz na scan (URL):</label>
                    <input
                      type="text"
                      value={newCitation.directUrl}
                      onChange={e => setNewCitation({ ...newCitation, directUrl: e.target.value })}
                      placeholder="https://ebadatelna.soapraha.cz/..."
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Původní text zápisu (přepis):</label>
                    <textarea
                      rows={2}
                      value={newCitation.originalText}
                      onChange={e => setNewCitation({ ...newCitation, originalText: e.target.value })}
                      placeholder="Doslovný přepis zápisu z matriky..."
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCitation(false)}
                      className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                    >
                      Zrušit
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCitation}
                      className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg"
                    >
                      Uložit citaci
                    </button>
                  </div>
                </div>
              )}

              {/* Citations List */}
              {formData.parishCitations && formData.parishCitations.length > 0 ? (
                <div className="space-y-3">
                  {formData.parishCitations.map(cit => (
                    <div
                      key={cit.id}
                      className="p-4 bg-white border border-stone-200 rounded-xl shadow-sm space-y-2 relative group"
                    >
                      <button
                        onClick={() => handleDeleteCitation(cit.id)}
                        title="Smazat citaci"
                        className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {cit.bookType === 'N'
                            ? 'Křest'
                            : cit.bookType === 'O'
                              ? 'Oddavky'
                              : cit.bookType === 'Z'
                                ? 'Úmrtí'
                                : cit.bookType === 'SCITANI'
                                  ? 'Sčítací operát'
                                  : 'Index'}
                        </span>
                        <h5 className="font-serif-title font-bold text-xs text-stone-900">
                          {cit.parish} {cit.signature && `(${cit.signature})`}
                        </h5>
                        <span className="text-xs text-stone-400">• {cit.archiveName}</span>
                      </div>

                      {cit.folio && (
                        <p className="text-xs text-stone-600">
                          <strong>Umístění v knize:</strong> {cit.folio}
                        </p>
                      )}

                      {cit.originalText && (
                        <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 font-editorial text-xs text-stone-800 italic">
                          „{cit.originalText}“
                        </div>
                      )}

                      {cit.directUrl && (
                        <div className="pt-1">
                          <a
                            href={cit.directUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950"
                          >
                            <span>Otevřít digitální snímek v archivu</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-xs">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Zatím žádné doložené záznamy z online matrik pro tuto osobu.</p>
                  <p className="text-[11px] mt-1">
                    Využijte tlačítko <strong className="text-emerald-700">Vyhledat v matrikách (AI)</strong> výše k nalezení a přepisu.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Family Links */}
          {activeTab === 'family' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif-title font-bold text-sm text-stone-900">
                    Příbuzenské vztahy v rodokmenu
                  </h4>
                  <p className="text-xs text-stone-500">
                    Propojení rodičů, manželů a dětí bez duplicit.
                  </p>
                </div>
              </div>

              {/* Parents Section */}
              <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 shadow-xs">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
                  Rodiče
                </span>
                
                {/* Father */}
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 w-14 font-medium">Otec:</span>
                    {formData.fatherId && tree.persons[formData.fatherId] ? (
                      <div>
                        <span className="font-semibold text-stone-900">
                          {tree.persons[formData.fatherId].firstName} {tree.persons[formData.fatherId].lastName}
                        </span>
                        {tree.persons[formData.fatherId].birthDate && (
                          <span className="text-[11px] text-stone-400 ml-1.5">
                            (★ {tree.persons[formData.fatherId].birthDate})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-400 italic">Otec není zadán</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {formData.fatherId && tree.persons[formData.fatherId] ? (
                      <>
                        {onSelectRelative && (
                          <button
                            type="button"
                            onClick={() => onSelectRelative(formData.fatherId!)}
                            className="px-2 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                            title="Otevřít profil otce"
                          >
                            <span>Zobrazit</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {onUnlinkRelation && (
                          <button
                            type="button"
                            onClick={() => onUnlinkRelation(person.id, 'father', formData.fatherId!)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                            title="Odpojit otce z rodokmenu (bez smazání osoby)"
                          >
                            <Unlink className="w-3 h-3" />
                            <span>Odpojit</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => onAddRelative('father', person.id)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-700" />
                          <span>Nový otec</span>
                        </button>
                        {onLinkExistingPerson && (
                          <button
                            type="button"
                            onClick={() => {
                              setInlineLinkTarget(inlineLinkTarget === 'father' ? null : 'father');
                              setInlineSelectedId('');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Propojit existujícího</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {inlineLinkTarget === 'father' && !formData.fatherId && (
                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex flex-wrap items-center gap-2">
                    <select
                      value={inlineSelectedId}
                      onChange={e => setInlineSelectedId(e.target.value)}
                      className="flex-1 min-w-[180px] px-2.5 py-1.5 bg-white text-xs border border-emerald-300 rounded-lg"
                    >
                      <option value="">-- Vyberte otce ze stromu --</option>
                      {getEligibleForInlineLink('father').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.birthDate ? `(★ ${p.birthDate})` : ''} {p.gender === 'F' ? '[Ž]' : '[M]'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!inlineSelectedId}
                      onClick={() => handleConfirmInlineLink('father')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
                    >
                      Propojit jako otce
                    </button>
                  </div>
                )}

                {/* Mother */}
                <div className="flex items-center justify-between text-xs py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 w-14 font-medium">Matka:</span>
                    {formData.motherId && tree.persons[formData.motherId] ? (
                      <div>
                        <span className="font-semibold text-stone-900">
                          {tree.persons[formData.motherId].firstName} {tree.persons[formData.motherId].lastName}
                          {tree.persons[formData.motherId].maidenName && ` (roz. ${tree.persons[formData.motherId].maidenName})`}
                        </span>
                        {tree.persons[formData.motherId].birthDate && (
                          <span className="text-[11px] text-stone-400 ml-1.5">
                            (★ {tree.persons[formData.motherId].birthDate})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-400 italic">Matka není zadána</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {formData.motherId && tree.persons[formData.motherId] ? (
                      <>
                        {onSelectRelative && (
                          <button
                            type="button"
                            onClick={() => onSelectRelative(formData.motherId!)}
                            className="px-2 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                            title="Otevřít profil matky"
                          >
                            <span>Zobrazit</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {onUnlinkRelation && (
                          <button
                            type="button"
                            onClick={() => onUnlinkRelation(person.id, 'mother', formData.motherId!)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                            title="Odpojit matku z rodokmenu (bez smazání osoby)"
                          >
                            <Unlink className="w-3 h-3" />
                            <span>Odpojit</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => onAddRelative('mother', person.id)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-700" />
                          <span>Nová matka</span>
                        </button>
                        {onLinkExistingPerson && (
                          <button
                            type="button"
                            onClick={() => {
                              setInlineLinkTarget(inlineLinkTarget === 'mother' ? null : 'mother');
                              setInlineSelectedId('');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Propojit existující</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {inlineLinkTarget === 'mother' && !formData.motherId && (
                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex flex-wrap items-center gap-2">
                    <select
                      value={inlineSelectedId}
                      onChange={e => setInlineSelectedId(e.target.value)}
                      className="flex-1 min-w-[180px] px-2.5 py-1.5 bg-white text-xs border border-emerald-300 rounded-lg"
                    >
                      <option value="">-- Vyberte matku ze stromu --</option>
                      {getEligibleForInlineLink('mother').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.maidenName ? `(roz. ${p.maidenName})` : ''} {p.birthDate ? `(★ ${p.birthDate})` : ''} {p.gender === 'F' ? '[Ž]' : '[M]'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!inlineSelectedId}
                      onClick={() => handleConfirmInlineLink('mother')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
                    >
                      Propojit jako matku
                    </button>
                  </div>
                )}
              </div>

              {/* Spouses Section */}
              <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Manžel / Manželka
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAddRelative('spouse', person.id)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-700" />
                      <span>Nový manžel/ka</span>
                    </button>
                    {onLinkExistingPerson && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineLinkTarget(inlineLinkTarget === 'spouse' ? null : 'spouse');
                          setInlineSelectedId('');
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Propojit existující osobu</span>
                      </button>
                    )}
                  </div>
                </div>

                {inlineLinkTarget === 'spouse' && (
                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex flex-wrap items-center gap-2">
                    <select
                      value={inlineSelectedId}
                      onChange={e => setInlineSelectedId(e.target.value)}
                      className="flex-1 min-w-[180px] px-2.5 py-1.5 bg-white text-xs border border-emerald-300 rounded-lg"
                    >
                      <option value="">-- Vyberte manžela / manželku ze stromu --</option>
                      {getEligibleForInlineLink('spouse').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.maidenName ? `(roz. ${p.maidenName})` : ''} {p.birthDate ? `(★ ${p.birthDate})` : ''} {p.gender === 'F' ? '[Ž]' : '[M]'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!inlineSelectedId}
                      onClick={() => handleConfirmInlineLink('spouse')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
                    >
                      Propojit jako manžele
                    </button>
                  </div>
                )}

                {formData.spouseIds && formData.spouseIds.length > 0 ? (
                  <div className="space-y-1.5 divide-y divide-stone-100">
                    {formData.spouseIds.map(spId => {
                      const sp = tree.persons[spId];
                      if (!sp) return null;
                      return (
                        <div key={spId} className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                          <div>
                            <span className="font-semibold text-stone-900">
                              {sp.firstName} {sp.lastName}
                              {sp.maidenName && ` (roz. ${sp.maidenName})`}
                            </span>
                            {sp.birthDate && (
                              <span className="text-[11px] text-stone-400 ml-1.5">
                                (★ {sp.birthDate})
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {onSelectRelative && (
                              <button
                                type="button"
                                onClick={() => onSelectRelative(spId)}
                                className="px-2 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                                title="Otevřít profil"
                              >
                                <span>Zobrazit</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {onUnlinkRelation && (
                              <button
                                type="button"
                                onClick={() => onUnlinkRelation(person.id, 'spouse', spId)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                                title="Odpojit manželský svazek (bez smazání osoby)"
                              >
                                <Unlink className="w-3 h-3" />
                                <span>Odpojit</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">Žádný sňatek neevidován.</p>
                )}
              </div>

              {/* Children Section */}
              <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Děti / Potomci
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAddRelative('child', person.id)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-700" />
                      <span>Nové dítě</span>
                    </button>
                    {onLinkExistingPerson && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineLinkTarget(inlineLinkTarget === 'child' ? null : 'child');
                          setInlineSelectedId('');
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Propojit existující</span>
                      </button>
                    )}
                  </div>
                </div>

                {inlineLinkTarget === 'child' && (
                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex flex-wrap items-center gap-2">
                    <select
                      value={inlineSelectedId}
                      onChange={e => setInlineSelectedId(e.target.value)}
                      className="flex-1 min-w-[180px] px-2.5 py-1.5 bg-white text-xs border border-emerald-300 rounded-lg"
                    >
                      <option value="">-- Vyberte dítě ze stromu --</option>
                      {getEligibleForInlineLink('child').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.maidenName ? `(roz. ${p.maidenName})` : ''} {p.birthDate ? `(★ ${p.birthDate})` : ''} {p.gender === 'F' ? '[Ž]' : '[M]'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!inlineSelectedId}
                      onClick={() => handleConfirmInlineLink('child')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
                    >
                      Propojit jako dítě
                    </button>
                  </div>
                )}

                {formData.childrenIds && formData.childrenIds.length > 0 ? (
                  <div className="space-y-1.5 divide-y divide-stone-100">
                    {formData.childrenIds.map(cId => {
                      const ch = tree.persons[cId];
                      if (!ch) return null;
                      return (
                        <div key={cId} className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                          <div>
                            <span className="font-semibold text-stone-900">
                              {ch.firstName} {ch.lastName}
                            </span>
                            {ch.birthDate && (
                              <span className="text-[11px] text-stone-400 ml-1.5">
                                (★ {ch.birthDate})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {onSelectRelative && (
                              <button
                                type="button"
                                onClick={() => onSelectRelative(cId)}
                                className="px-2 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                                title="Otevřít profil"
                              >
                                <span>Zobrazit</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {onUnlinkRelation && (
                              <button
                                type="button"
                                onClick={() => onUnlinkRelation(person.id, 'child', cId)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                                title="Odpojit dítě z rodokmenu (bez smazání osoby)"
                              >
                                <Unlink className="w-3 h-3" />
                                <span>Odpojit</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">Žádné děti neevidovány.</p>
                )}
              </div>

              {/* Helpful Hint */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2.5">
                <Link2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-amber-900">
                  <strong>Pravidlo bez duplicit:</strong> Pokud je matka již ve stromu zapsána jako manželka otce, v dialogu <em>„Přidat / Propojit matku“</em> přepněte na záložku <em>„🔗 Vybrat existující osobu“</em> a zvolte ji ze seznamu. Aplikace automaticky sladí vazby tak, aby žádná osoba nebyla v rodokmenu dvakrát.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isRoot && !isConfirmingDelete && (
              <button
                type="button"
                onClick={() => onSetRootPerson(person.id)}
                className="px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-200 font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Nastavit jako hlavní</span>
              </button>
            )}

            {isConfirmingDelete ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-300 px-3 py-1.5 rounded-xl animate-in fade-in">
                <span className="text-xs font-semibold text-rose-900">
                  Opravdu smazat?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onDeletePerson(person.id);
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
                >
                  Ano, smazat
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium text-xs rounded-lg transition-colors"
                >
                  Zrušit
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100 font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Smazat osobu</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSavedNotice && (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Uloženo!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Uložit změny</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
