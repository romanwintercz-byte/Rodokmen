import React, { useState } from 'react';
import { FamilyTreeData } from '../types/genealogy';
import { exportToGedcom, downloadGedcomFile, importFromGedcom } from '../utils/gedcom';
import { 
  X, 
  Download, 
  Upload, 
  FileCode, 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GedcomModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FamilyTreeData;
  onImportTree: (importedTree: FamilyTreeData) => void;
}

export const GedcomModal: React.FC<GedcomModalProps> = ({
  isOpen,
  onClose,
  tree,
  onImportTree
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isCopied, setIsCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedSummary, setImportedSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const gedcomText = exportToGedcom(tree);
  const personCount = Object.keys(tree.persons).length;

  const handleDownload = () => {
    const filename = `${tree.treeName.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'rodokmen'}.ged`;
    downloadGedcomFile(tree, filename);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(gedcomText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportedSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.includes('0 HEAD')) {
          setImportError('Vybraný soubor neobsahuje platnou hlavičku GEDCOM (0 HEAD).');
          return;
        }

        const newTree = importFromGedcom(text);
        const count = Object.keys(newTree.persons).length;
        if (count === 0) {
          setImportError('V souboru nebyly nalezeny žádné osoby (záznamy INDI).');
          return;
        }

        onImportTree(newTree);
        setImportedSummary(`Úspěšně importováno ${count} osob!`);
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.7 }
        });
      } catch (err: any) {
        console.error(err);
        setImportError('Chyba při čtení GEDCOM souboru: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl">
              <FileCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-lg text-white">
                Export &amp; Import do formátu GEDCOM
              </h3>
              <p className="text-xs text-stone-300">
                Světový genealogický standard 5.5.1 kompatibilní s MyHeritage, Gramps, Ancestry a FamilySearch
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

        {/* Tab switcher */}
        <div className="px-6 pt-3 bg-stone-100 border-b border-stone-200 flex gap-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-[#faf8f5] border-amber-800 text-amber-950 shadow-sm'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Download className="w-4 h-4 text-amber-800" />
            <span>Exportovat rodokmen (.ged)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-[#faf8f5] border-amber-800 text-amber-950 shadow-sm'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Upload className="w-4 h-4 text-amber-800" />
            <span>Importovat existující GEDCOM</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 space-y-1">
                <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Připraveno k exportu: {personCount} osob a doložené prameny z matrik</span>
                </div>
                <p className="text-amber-800/90 text-[11px]">
                  Soubor je kódován v UTF-8 s BOM značkou, která zajistí správné zobrazení českých háčků a čárek (č, ř, ž, š, ě) v jakémkoliv genealogickém programu.
                </p>
              </div>

              {/* GEDCOM Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-stone-700">
                    Náhled vygenerovaného GEDCOM kódu:
                  </label>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Zkopírováno' : 'Kopírovat do schránky'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={gedcomText}
                  className="w-full p-3 bg-stone-900 text-amber-100 font-mono text-[11px] rounded-xl border border-stone-800 focus:outline-none select-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-stone-500">
                  Formát: <strong>GEDCOM 5.5.1 UTF-8</strong>
                </span>

                <button
                  onClick={handleDownload}
                  className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4" />
                  <span>Stáhnout soubor .GED</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-stone-300 hover:border-amber-700 rounded-2xl p-8 text-center bg-white transition-all">
                <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  <Upload className="w-10 h-10 text-stone-400" />
                  <span className="font-serif-title font-bold text-sm text-stone-800">
                    Vyberte soubor GEDCOM (.ged) ze svého počítače
                  </span>
                  <span className="text-xs text-stone-500 max-w-sm">
                    Můžete importovat rodokmen vyexportovaný z MyHeritage, Gramps, Ancestry, FamilySearch nebo jakéhokoliv genealogického softwaru.
                  </span>
                  <div className="mt-3 px-4 py-2 bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-amber-900 transition-colors">
                    Procházet soubory
                  </div>
                  <input
                    type="file"
                    accept=".ged,.gedcom"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {importedSummary && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{importedSummary}</span>
                </div>
              )}

              {importError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-stone-600 hover:bg-stone-200 font-medium rounded-lg"
          >
            Zavřít
          </button>
        </div>

      </div>
    </div>
  );
};
