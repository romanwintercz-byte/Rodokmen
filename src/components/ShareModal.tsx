import React, { useState } from 'react';
import { FamilyTreeData } from '../types/genealogy';
import { encodeTreeToUrl } from '../utils/sharing';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Printer, 
  Eye, 
  FileJson, 
  Download,
  Users,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: FamilyTreeData;
  onOpenChronicle: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  tree,
  onOpenChronicle
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isJsonCopied, setIsJsonCopied] = useState(false);

  if (!isOpen) return null;

  const shareableUrl = encodeTreeToUrl(tree);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareableUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(tree, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tree.treeName.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'rodokmen'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] w-full max-w-xl rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-800/60 rounded-xl">
              <Share2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-lg text-white">
                Sdílení rodokmenu s rodinou
              </h3>
              <p className="text-xs text-amber-200/80">
                Pošlete odkaz příbuzným, vytiskněte rodovou kroniku nebo stáhněte zálohu
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Shareable Link Box */}
          <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-800" />
              <h4 className="font-serif-title font-bold text-sm text-stone-900">
                Přímý odkaz pro rodinu
              </h4>
            </div>
            <p className="text-xs text-stone-600">
              Kdokoliv otevře tento odkaz, uvidí váš kompletní rodokmen se všemi osobami, fotografiemi i odkazy do online matrik. Nevyžaduje žádné přihlašování.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 font-mono truncate focus:outline-none"
              />
              <button
                onClick={handleCopyUrl}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Zkopírováno!' : 'Kopírovat odkaz'}</span>
              </button>
            </div>

            {isCopied && (
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Odkaz byl zkopírován. Můžete jej poslat e-mailem, přes WhatsApp nebo Messenger.</span>
              </p>
            )}
          </div>

          {/* Printable Chronicle Book */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-800" />
                <h4 className="font-serif-title font-bold text-sm text-stone-900">
                  Tisk rodinné kroniky (Kniha rodu / PDF)
                </h4>
              </div>
              <span className="text-[10px] bg-amber-200/60 text-amber-950 font-semibold px-2 py-0.5 rounded-full">
                Vhodné k tisku
              </span>
            </div>
            <p className="text-xs text-stone-600">
              Vygeneruje reprezentativní pergamenovou knihu předků s medailonky, časovou osou, fotkami a výpisy z matrik, připravenou k tisku na papír A4 nebo exportu do PDF.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenChronicle();
                }}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition-all"
              >
                <Eye className="w-4 h-4 text-amber-300" />
                <span>Otevřít knihu rodu k prohlížení a tisku</span>
              </button>
            </div>
          </div>

          {/* JSON Backup Download */}
          <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <h5 className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-stone-500" />
                <span>Záloha ve formátu JSON</span>
              </h5>
              <p className="text-[11px] text-stone-500">
                Kompletní datový soubor se všemi informacemi a vazbami pro archivaci.
              </p>
            </div>
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Stáhnout JSON</span>
            </button>
          </div>

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
