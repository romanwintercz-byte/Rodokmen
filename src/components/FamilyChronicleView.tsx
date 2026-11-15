import React, { useState } from 'react';
import { FamilyTreeData, Person } from '../types/genealogy';
import { 
  ArrowLeft, 
  Printer, 
  BookOpen, 
  User, 
  Calendar, 
  MapPin, 
  Briefcase, 
  ExternalLink,
  Crown,
  Pencil,
  Check,
  X
} from 'lucide-react';

interface FamilyChronicleViewProps {
  tree: FamilyTreeData;
  onBackToGraph: () => void;
  onSelectPerson: (personId: string) => void;
  onRenameTree?: (newName: string) => void;
}

export const FamilyChronicleView: React.FC<FamilyChronicleViewProps> = ({
  tree,
  onBackToGraph,
  onSelectPerson,
  onRenameTree
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(tree.treeName);
  const personsList = Object.values(tree.persons);
  const rootPerson = tree.persons[tree.rootPersonId];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f7f4ec] text-stone-900 font-editorial pb-16">
      
      {/* Top action toolbar (hidden on print) */}
      <div className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-md text-white px-6 py-3 shadow-md flex items-center justify-between print:hidden">
        <button
          onClick={onBackToGraph}
          className="flex items-center gap-2 text-xs font-semibold text-amber-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zpět do interaktivního grafu</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">
            Formátováno pro tisk na A4 / uložení do PDF
          </span>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Vytisknout kroniku (PDF)</span>
          </button>
        </div>
      </div>

      {/* Main Chronicle Container */}
      <div className="max-w-4xl mx-auto px-6 pt-10 space-y-12 print:px-0 print:pt-0">
        
        {/* Title Cover Page */}
        <div className="text-center py-12 border-b-2 border-stone-300 print:py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-900 text-amber-100 rounded-2xl flex items-center justify-center shadow-md print:border print:border-stone-800">
            <Crown className="w-8 h-8" />
          </div>
          <span className="text-xs tracking-[0.25em] font-sans font-bold text-amber-900 uppercase">
            Pamětní rodová kronika
          </span>
          {isEditingName && onRenameTree ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                const trimmed = nameDraft.trim();
                if (trimmed) onRenameTree(trimmed);
                setIsEditingName(false);
              }}
              className="flex items-center justify-center gap-2 mt-2 mb-3 print:hidden"
            >
              <input
                type="text"
                autoFocus
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setNameDraft(tree.treeName);
                    setIsEditingName(false);
                  }
                }}
                className="font-serif-title font-bold text-2xl md:text-3xl text-stone-950 bg-white border border-amber-500 rounded-xl px-3 py-1.5 text-center w-full max-w-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30"
              />
              <button
                type="submit"
                title="Uložit název"
                className="p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameDraft(tree.treeName);
                  setIsEditingName(false);
                }}
                title="Zrušit"
                className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 mt-2 mb-3">
              <h1 className="font-serif-title font-bold text-3xl md:text-4xl text-stone-950">
                {tree.treeName}
              </h1>
              {onRenameTree && (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(tree.treeName);
                    setIsEditingName(true);
                  }}
                  title="Upravit název rodokmenu"
                  className="p-1.5 text-stone-400 hover:text-amber-800 hover:bg-amber-100/70 rounded-lg transition-colors print:hidden"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <p className="font-sans text-xs text-stone-600 max-w-xl mx-auto italic">
            {tree.description}
          </p>

          <div className="mt-8 font-sans text-xs text-stone-500 space-y-1">
            <p>Sestavil: <strong>{tree.author || 'Rodinný badatel'}</strong></p>
            <p>Vytvořeno: {new Date(tree.lastModified).toLocaleDateString('cs-CZ')}</p>
            <p className="text-[11px] text-amber-900 font-semibold pt-2">
              Evidováno celkem {personsList.length} osob a doložených zápisů z matrik
            </p>
          </div>
        </div>

        {/* Index / Summary List */}
        <div className="p-6 bg-white/70 border border-stone-200 rounded-2xl shadow-sm print:bg-transparent print:border-none print:p-0">
          <h3 className="font-serif-title font-bold text-lg text-stone-900 mb-4 border-b border-stone-200 pb-2">
            Přehled zaznamenaných osob rodu
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans text-xs">
            {personsList.map(p => (
              <div 
                key={p.id}
                onClick={() => onSelectPerson(p.id)}
                className="flex items-center justify-between p-2 rounded-lg bg-stone-50/70 border border-stone-200/60 hover:bg-amber-50 cursor-pointer print:bg-transparent"
              >
                <div>
                  <span className="font-bold text-stone-900">
                    {p.firstName} {p.lastName}
                  </span>
                  {p.maidenName && <span className="text-stone-500 italic"> (roz. {p.maidenName})</span>}
                  {p.occupation && <p className="text-[11px] text-stone-500">{p.occupation}</p>}
                </div>
                <div className="text-right text-[11px] text-stone-600 font-mono">
                  {p.birthDate ? p.birthDate.split('.').pop() : '?'}–
                  {p.deathDate ? p.deathDate.split('.').pop() : (p.isDeceased ? '†' : 'žije')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Medallions for Each Person */}
        <div className="space-y-8">
          <h2 className="font-serif-title font-bold text-2xl text-stone-900 border-b-2 border-stone-300 pb-2">
            Osobní medailonky a matriční prameny
          </h2>

          {personsList.map(person => {
            const father = person.fatherId ? tree.persons[person.fatherId] : undefined;
            const mother = person.motherId ? tree.persons[person.motherId] : undefined;
            const spouses = person.spouseIds.map(id => tree.persons[id]).filter(Boolean);
            const children = person.childrenIds.map(id => tree.persons[id]).filter(Boolean);

            return (
              <div
                key={person.id}
                id={`person-${person.id}`}
                className="p-6 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-4 break-inside-avoid print:shadow-none print:border-stone-300 print:mb-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl overflow-hidden font-bold flex items-center justify-center text-lg shadow-inner ${
                      person.gender === 'F' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 opacity-75" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif-title font-bold text-xl text-stone-950">
                        {person.firstName} {person.lastName}
                        {person.maidenName && (
                          <span className="text-stone-500 font-normal italic text-sm ml-2">
                            (roz. {person.maidenName})
                          </span>
                        )}
                      </h3>
                      {person.occupation && (
                        <p className="font-sans text-xs font-semibold text-amber-900 flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5 opacity-70" />
                          <span>{person.occupation}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {person.parishCitations?.length > 0 && (
                    <span className="font-sans text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold flex items-center gap-1 print:border-stone-300">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{person.parishCitations.length} záznamy v matrice</span>
                    </span>
                  )}
                </div>

                {/* Vital stats grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/60 print:bg-transparent">
                  <div>
                    <span className="text-stone-400 font-semibold block text-[10px] uppercase">Narození:</span>
                    <p className="font-semibold text-stone-900">
                      {person.birthDate || 'Datum neznámé'}
                    </p>
                    {person.birthPlace && (
                      <p className="text-stone-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{person.birthPlace}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-stone-400 font-semibold block text-[10px] uppercase">Úmrtí:</span>
                    <p className="font-semibold text-stone-900">
                      {person.deathDate || (person.isDeceased ? 'Zemřel(a)' : 'Žije')}
                    </p>
                    {person.deathPlace && (
                      <p className="text-stone-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{person.deathPlace}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Biography & Notes */}
                {person.notes && (
                  <div className="text-xs text-stone-700 leading-relaxed italic bg-amber-50/40 p-3 rounded-xl border border-amber-200/40">
                    „{person.notes}“
                  </div>
                )}

                {/* Family relationships */}
                <div className="font-sans text-xs space-y-1.5 pt-1 text-stone-600 border-t border-stone-100">
                  <p>
                    <strong className="text-stone-800">Rodiče:</strong>{' '}
                    {father ? `${father.firstName} ${father.lastName}` : 'Neznámý otec'} a{' '}
                    {mother ? `${mother.firstName} ${mother.lastName} ${mother.maidenName ? `(roz. ${mother.maidenName})` : ''}` : 'Neznámá matka'}
                  </p>

                  {spouses.length > 0 && (
                    <p>
                      <strong className="text-stone-800">Manželství:</strong>{' '}
                      {spouses.map(s => `${s.firstName} ${s.lastName}`).join(', ')}
                    </p>
                  )}

                  {children.length > 0 && (
                    <p>
                      <strong className="text-stone-800">Děti:</strong>{' '}
                      {children.map(c => `${c.firstName} ${c.lastName}`).join(', ')}
                    </p>
                  )}
                </div>

                {/* Parish Citations with Transcriptions */}
                {person.parishCitations && person.parishCitations.length > 0 && (
                  <div className="pt-3 border-t border-stone-200 space-y-3">
                    <h4 className="font-serif-title font-bold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-800" />
                      <span>Matriční zápisy a citace</span>
                    </h4>

                    {person.parishCitations.map(cit => (
                      <div
                        key={cit.id}
                        className="p-3 bg-stone-50 rounded-xl border border-stone-200 font-sans text-xs space-y-1.5 print:bg-transparent"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">
                            {cit.parish} — {cit.signature || 'Signatura neuvedena'} ({cit.archiveName})
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
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
                        </div>

                        {cit.folio && (
                          <p className="text-stone-600 text-[11px]">
                            <strong>Strana / snímek:</strong> {cit.folio}
                          </p>
                        )}

                        {cit.originalText && (
                          <div className="p-2 bg-white rounded border border-stone-200/80 font-editorial text-xs text-stone-800 italic print:bg-transparent">
                            „{cit.originalText}“
                          </div>
                        )}

                        {cit.directUrl && (
                          <p className="text-[10px] text-amber-800 truncate print:text-stone-500">
                            Odkaz do archivu: {cit.directUrl}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-10 text-center font-sans text-xs text-stone-400 border-t border-stone-300">
          <p>© {new Date().getFullYear()} {tree.treeName} • Vygenerováno aplikací Rodokmen &amp; Matriky Online</p>
        </div>

      </div>
    </div>
  );
};
