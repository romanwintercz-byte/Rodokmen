import React, { useState, useEffect } from 'react';
import { Person, CzechArchivePortal, AIAnalysisResult } from '../types/genealogy';
import { CZECH_ARCHIVE_PORTALS, findMatchingArchives, buildArchiveSearchUrl } from '../data/czechArchives';
import { 
  X, 
  Search, 
  ExternalLink, 
  BookOpen, 
  Sparkles, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  UserPlus, 
  RefreshCw,
  MapPin,
  Compass,
  ArrowRight
} from 'lucide-react';

interface ParishAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPerson?: Person;
  onApplyExtractedData: (result: AIAnalysisResult, targetPersonId?: string) => void;
}

export const ParishAssistantModal: React.FC<ParishAssistantModalProps> = ({
  isOpen,
  onClose,
  targetPerson,
  onApplyExtractedData
}) => {
  const [activeTab, setActiveTab] = useState<'ai-search' | 'ai-transcribe' | 'archives' | 'advisor'>('ai-search');
  
  // Tab 1: Autonomous AI Parish Search Agent
  const [searchPersonName, setSearchPersonName] = useState(targetPerson ? `${targetPerson.firstName} ${targetPerson.lastName}` : 'Antonín Dvořák');
  const [searchMaidenName, setSearchMaidenName] = useState(targetPerson?.maidenName || '');
  const [searchYear, setSearchYear] = useState(targetPerson?.birthDate ? (targetPerson.birthDate.split('.').pop() || '1841') : '1841');
  const [searchLocationAgent, setSearchLocationAgent] = useState(targetPerson?.birthPlace || 'Nelahozeves');
  const [searchEventType, setSearchEventType] = useState<'Narození/křest' | 'Sňatek' | 'Úmrtí' | 'Sčítací operát (sčítání lidu)'>('Narození/křest');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);
  const [aiSearchSources, setAiSearchSources] = useState<{ title: string; url: string }[]>([]);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);
  const [aiSearchNotice, setAiSearchNotice] = useState<string | null>(null);
  const [aiSearchIsFallback, setAiSearchIsFallback] = useState(false);

  // Tab 2: Archives Directory
  const [searchLocation, setSearchLocation] = useState(targetPerson?.birthPlace || targetPerson?.residence || '');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState<'all' | 'matriky' | 'scitani'>('all');
  
  // Tab 3: AI Transcribe & Extract
  const [recordType, setRecordType] = useState<'N' | 'O' | 'Z' | 'SCITANI'>('N');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [textExcerpt, setTextExcerpt] = useState('');
  const [parishHint, setParishHint] = useState(targetPerson?.birthPlace || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Tab 4: Advisor
  const [advisorName, setAdvisorName] = useState(targetPerson ? `${targetPerson.firstName} ${targetPerson.lastName}` : '');
  const [advisorPlace, setAdvisorPlace] = useState(targetPerson?.birthPlace || '');
  const [advisorYear, setAdvisorYear] = useState(targetPerson?.birthDate || '1850');
  const [advisorQuestion, setAdvisorQuestion] = useState('Nemohu najít sňatek rodičů v matrice narození potomka. Kde mám hledat?');
  const [isAdvising, setIsAdvising] = useState(false);
  const [advisorAdvice, setAdvisorAdvice] = useState<string | null>(null);

  // Sync form inputs whenever targetPerson or modal visibility changes
  useEffect(() => {
    if (!isOpen) return;
    if (targetPerson) {
      setSearchPersonName(`${targetPerson.firstName} ${targetPerson.lastName}`.trim());
      setSearchMaidenName(targetPerson.maidenName || '');
      const yr = targetPerson.birthDate ? targetPerson.birthDate.match(/\b(1[6-9]\d{2}|20\d{2})\b/)?.[1] : '';
      setSearchYear(yr || '');
      setSearchLocationAgent(targetPerson.birthPlace || targetPerson.residence || '');
      setSearchLocation(targetPerson.birthPlace || targetPerson.residence || '');
      setParishHint(targetPerson.birthPlace || '');
      setAdvisorName(`${targetPerson.firstName} ${targetPerson.lastName}`.trim());
      setAdvisorPlace(targetPerson.birthPlace || '');
      setAdvisorYear(yr || targetPerson.birthDate || '1850');
    }
  }, [targetPerson, isOpen]);

  const renderInlineMarkdown = (text: string): React.ReactNode[] => {
    // Parse [label](https://...) and **bold** inline segments safely
    const tokenRegex = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*)/g;
    const parts = text.split(tokenRegex);
    return parts.map((part, idx) => {
      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={idx}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-800 hover:text-emerald-950 underline decoration-emerald-400 underline-offset-2 font-semibold inline-flex items-center gap-0.5"
          >
            <span>{linkMatch[1]}</span>
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
          </a>
        );
      }
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return (
          <strong key={idx} className="font-semibold text-stone-900">
            {boldMatch[1]}
          </strong>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const renderMarkdownContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-stone-800 leading-relaxed font-sans">
        {lines.map((rawLine, idx) => {
          const line = rawLine.trimEnd();
          if (line.trim() === '---') {
            return <hr key={idx} className="border-stone-200 my-2.5" />;
          }
          if (line.startsWith('### ')) {
            return (
              <h5 key={idx} className="font-serif-title font-bold text-sm text-stone-900 pt-1">
                {renderInlineMarkdown(line.slice(4))}
              </h5>
            );
          }
          if (line.startsWith('#### ')) {
            return (
              <h6 key={idx} className="font-bold text-xs text-amber-950 pt-2">
                {renderInlineMarkdown(line.slice(5))}
              </h6>
            );
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-1" />;
          }
          if (line.startsWith('> ')) {
            return (
              <div
                key={idx}
                className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-900 font-medium"
              >
                {renderInlineMarkdown(line.slice(2))}
              </div>
            );
          }
          if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="pl-3 flex items-start gap-1.5">
                <span className="text-amber-700 font-bold">•</span>
                <div className="flex-1">{renderInlineMarkdown(line.slice(2))}</div>
              </div>
            );
          }
          const numberedMatch = line.match(/^(\d+\.)\s+(.*)$/);
          if (numberedMatch) {
            return (
              <div key={idx} className="pl-2 flex items-start gap-1.5">
                <span className="text-amber-800 font-bold shrink-0">{numberedMatch[1]}</span>
                <div className="flex-1">{renderInlineMarkdown(numberedMatch[2])}</div>
              </div>
            );
          }
          return <div key={idx}>{renderInlineMarkdown(line)}</div>;
        })}
      </div>
    );
  };

  const buildLocalArchiveFallback = (
    name: string,
    maiden: string,
    year: string,
    loc: string,
    evType: string
  ) => {
    const isCensus = evType.toLowerCase().includes('sčítac');
    const matchedAll = findMatchingArchives(loc || '');
    const prioritized = isCensus
      ? [
          ...matchedAll.filter(p => p.category === 'scitani'),
          ...matchedAll.filter(p => p.category !== 'scitani'),
        ]
      : matchedAll;
    const primary =
      prioritized[0] ||
      (isCensus
        ? CZECH_ARCHIVE_PORTALS.find(p => p.category === 'scitani') || CZECH_ARCHIVE_PORTALS[0]
        : CZECH_ARCHIVE_PORTALS[0]);
    const searchQuery = loc || name || 'Česká republika';
    const directUrl = buildArchiveSearchUrl(primary, searchQuery);

    const text = `### 🏛️ Archivní rozcestník pro osobu: **${name || 'Hledaný předek'}** ${maiden ? `(roz. ${maiden})` : ''}

**Hledaná lokalita:** ${loc || 'Česká republika'}  
**Časové období:** okolo roku ${year || 'neuvedeno'}  
**Hledaný pramen:** ${evType || 'Narození/křest'}  

---

#### 1. Doporučený archivní portál:
- **Příslušný archiv:** [${primary.name}](${directUrl}) (${primary.region})
- **Pokrytí:** ${primary.coverage}
- **Tip pro bádání:** ${primary.tips}

#### 2. Postup vyhledání (matriky i sčítací operáty):
1. Otevřete archivní badatelnu přes odkaz výše.
2. **Pro matriky:** Vyhledejte farnost podle obce **${loc || 'vašeho předka'}** a zkontrolujte **Indexy (rejstříky)** pro období **${year || 'dané doby'}** (±5 let).
3. **Pro sčítací operáty (1857, 1869, 1880, 1890, 1900, 1910, 1921):** Zvolte politický/soudní okres, obec a číslo popisné domu (č.p.) – na jednom sčítacím archu najdete všechny členy domácnosti s daty a místy narození.

#### 3. Přehled oficiálních portálů (Matriky & Sčítací operáty):
- [eBadatelna SOA v Praze](https://ebadatelna.soapraha.cz) – Střední Čechy (matriky i sčítací operáty)
- [Sčítací operáty MZA Brno](https://www.mza.cz/scitacioperaty/) & [ActaPublica MZA Brno](https://www.mza.cz/actapublica/matrika/hledani) – Morava a část Vysočiny
- [Portafontium – Sčítání lidu](https://www.portafontium.eu/searching/census) & [Matriky](https://www.portafontium.eu/searching/register) – Západní Čechy
- [DigiArchiv SOA v Třeboni](https://digi.ceskearchivy.cz) – Jižní Čechy (matriky, sčítání lidu, soupisy poddaných)
- [ARON Východočeské archivy](https://aron.vychodoceskearchivy.cz) – Východní Čechy (Zámrsk / HK)
- [Digitální badatelna Litoměřice](https://digi.soalitomerice.cz) – Severní Čechy (matriky a sčítání lidu)
- [Digitální archiv ZA Opava](https://digi.archives.cz) – Slezsko a severní Morava (matriky a sčítání lidu)
- [Archiv hl. m. Prahy](https://katalog.ahmp.cz/pragapublica/) – Praha (matriky, sčítání lidu 1869–1921 a policejní přihlášky)`;

    const sources = (prioritized.length > 0 ? prioritized.slice(0, 4) : CZECH_ARCHIVE_PORTALS.slice(0, 4)).map(portal => ({
      title: portal.name,
      url: buildArchiveSearchUrl(portal, searchQuery)
    }));

    return {
      text,
      sources: sources.length > 0 ? sources : [{ title: primary.name, url: directUrl }]
    };
  };

  // Run Autonomous AI Search
  const handleRunAiSearch = async () => {
    setIsAiSearching(true);
    setAiSearchError(null);
    setAiSearchResult(null);
    setAiSearchSources([]);
    setAiSearchNotice(null);
    setAiSearchIsFallback(false);

    try {
      const res = await fetch('/api/archives/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: searchPersonName,
          maidenName: searchMaidenName,
          birthYear: searchYear,
          location: searchLocationAgent,
          eventType: searchEventType
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (res.status === 404) {
          const fallback = buildLocalArchiveFallback(
            searchPersonName,
            searchMaidenName,
            searchYear,
            searchLocationAgent,
            searchEventType
          );
          setAiSearchResult(fallback.text);
          setAiSearchSources(fallback.sources);
          setAiSearchNotice(
            'Backendový AI server není na této adrese aktivní (HTTP 404 – pravděpodobně jste na statické/sdílené verzi URL). Byly načteny přímé odkazy z interní databáze českých archivů.'
          );
          setAiSearchIsFallback(true);
          return;
        }
        setAiSearchError(`Server vrátil neočekávanou odpověď (HTTP ${res.status}). Zkuste prosím akci za chvíli zopakovat.`);
        return;
      }

      const data = await res.json();
      if (data.success && data.resultText) {
        setAiSearchResult(data.resultText);
        setAiSearchSources(data.sources || []);
        setAiSearchNotice(data.notice || null);
        setAiSearchIsFallback(Boolean(data.isFallback));
      } else {
        setAiSearchError(data.error || `Nepodařilo se dokončit vyhledávání (HTTP ${res.status}).`);
      }
    } catch (err: any) {
      setAiSearchError(
        `Chyba spojení se serverem při rešerši v matrikách${err?.message ? ` (${err.message})` : ''}. Pokud probíhala aktualizace aplikace, obnovte prosím stránku.`
      );
    } finally {
      setIsAiSearching(false);
    }
  };

  if (!isOpen) return null;

  const filteredArchives = findMatchingArchives(searchLocation).filter(portal =>
    archiveCategoryFilter === 'all' ? true : portal.category === archiveCategoryFilter
  );

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setImageFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Sample Kurent Text Presets
  const loadPreset = (presetType: 'křest' | 'oddavky' | 'úmrtí' | 'scitani') => {
    if (presetType === 'křest') {
      setRecordType('N');
      setParishHint('Nelahozeves (eBadatelna SOA Praha)');
      setTextExcerpt(
        'Dne 8. Septembris 1841 narozen a 9. křtěn Antonín Leopold. ' +
        'Otec: František Dvořák, mistr řeznický a hospodský v Nelahozevsi č. 12, syn Jana Dvořáka chalupníka z Třeboradic č. 14 a Anny roz. Štěpánkové ze Slaného. ' +
        'Matka: Anna, dcera Josefa Beka, panského šafáře v Nelahozevsi č. 2 a Kateřiny roz. Čermákové z Nové Vsi. ' +
        'Kmotři: Antonín Zdeněk, sládek v Nelahozevsi; Barbora Šťastná, sládková z Nelahozevsi. Křtil P. František Josef Řehoř.'
      );
    } else if (presetType === 'oddavky') {
      setRecordType('O');
      setParishHint('Praha, kostel sv. Štěpána');
      setTextExcerpt(
        'Dne 17. listopadu 1873 oddáni v chrámu Páně sv. Štěpána. ' +
        'Ženich: Antonín Dvořák, varhaník a hudební skladatel v Praze č. 564, syn Františka Dvořáka řezníka a Anny roz. Bekové, 32 let, svobodný. ' +
        'Nevěsta: Anna Čermáková, dcera Jana Čermáka zlatníka na Novém Městě pražském a Marie roz. Klotzové, 19 let, svobodná. ' +
        'Svědkové: Adolf Čech, kapelník prozatímního divadla v Praze; Karel Bendl, skladatel.'
      );
    } else if (presetType === 'scitani') {
      setRecordType('SCITANI');
      setParishHint('Praha II – Nové Město č.p. 564, Sčítací operát 1900');
      setTextExcerpt(
        'Sčítací arch (Sčítání lidu ke dni 31. prosince 1900), Královské hlavní město Praha II, Žitná ulice č.p. 564. ' +
        'Byt č. 3: 1) Dvořák Antonín, hlava rodiny, nar. 8. 9. 1841 v Nelahozevsi (okres Kralupy), ženatý, ředitel konzervatoře a skladatel, náboženství římskokatolické, domovská příslušnost Praha. ' +
        '2) Dvořáková Anna roz. Čermáková, manželka, nar. 11. 12. 1854 v Praze. ' +
        '3) Dvořáková Otýlie, dcera, nar. 6. 6. 1878 v Praze; 4) Dvořáková Magdalena, dcera, nar. 17. 8. 1881 v Praze; 5) Dvořák Otakar, syn, nar. 9. 2. 1885 v Praze.'
      );
    } else {
      setRecordType('Z');
      setParishHint('Nelahozeves č. 12');
      setTextExcerpt(
        'Dne 12. srpna 1846 zemřela a 14. srpna pochována Aloisie Dvořáková, dcera Františka Dvořáka řezníka v Nelahozevsi č. 12 a Anny roz. Bekové. ' +
        'Věk: 1 rok a 3 měsíce. Příčina smrti: Psotník (Fraisen / eclampsia infantum). Zaopatřil P. Řehoř, pochována na farním hřbitově u sv. Ondřeje.'
      );
    }
  };

  // Run AI Analysis
  const handleAnalyze = async () => {
    if (!imageFile && !textExcerpt.trim()) {
      setAnalysisError('Prosím nahrajte snímek matriky nebo vložte text zápisu (můžete využít i vzorová data níže).');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/archives/analyze-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageFile,
          mimeType: imageMime,
          textExcerpt: textExcerpt,
          recordType: recordType,
          parishHint: parishHint
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (response.status === 404) {
          setAnalysisError('Backendový AI server není na této adrese dostupný (HTTP 404). Funkce AI přepisu vyžaduje spuštěný aplikační server (Development URL).');
        } else {
          setAnalysisError(`Server vrátil neočekávanou odpověď (HTTP ${response.status}).`);
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        setAnalysisResult(data.data);
      } else {
        setAnalysisError(data.error || 'Nepodařilo se záznam analyzovat.');
      }
    } catch (err: any) {
      console.error(err);
      setAnalysisError('Chyba spojení se serverem při analýze záznamu.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Advisor
  const handleConsultAdvisor = async () => {
    setIsAdvising(true);
    setAdvisorAdvice(null);
    try {
      const res = await fetch('/api/archives/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: advisorName,
          parishOrPlace: advisorPlace,
          yearRange: advisorYear,
          problemDescription: advisorQuestion
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const matched = findMatchingArchives(advisorPlace || '');
        const primary = matched[0] || CZECH_ARCHIVE_PORTALS[0];
        setAdvisorAdvice(
          `⚠️ Backendový AI server není na této adrese aktivní (HTTP ${res.status}).\n\nDoporučený archiv pro lokalitu „${advisorPlace || 'Česká republika'}“:\n• ${primary.name} (${primary.webUrl})\n• Tip: ${primary.tips}`
        );
        return;
      }
      const data = await res.json();
      if (data.success && data.advice) {
        setAdvisorAdvice(data.advice);
      } else if (data.error) {
        setAdvisorAdvice(`⚠️ ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setAdvisorAdvice('⚠️ Nepodařilo se spojit se serverem.');
    } finally {
      setIsAdvising(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-serif-title font-bold text-lg text-amber-100 flex items-center gap-2">
                <span>Online Matriky &amp; AI Asistent</span>
                <span className="text-[10px] bg-amber-500/30 border border-amber-400/30 px-2 py-0.5 rounded-full text-amber-200 font-sans uppercase tracking-wider">
                  Gemini 4 Flash
                </span>
              </h2>
              <p className="text-xs text-stone-300">
                Vyhledávání v českých digitálních archivech, luštění kurentu a automatické doplňování rodokmenu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-stone-100 border-b border-stone-200 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ai-search')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 shrink-0 ${
              activeTab === 'ai-search'
                ? 'bg-[#faf8f5] border-amber-700 text-amber-950 shadow-sm'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Search className="w-4 h-4 text-emerald-700" />
            <span>AI Automatické vyhledávání</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-transcribe')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 shrink-0 ${
              activeTab === 'ai-transcribe'
                ? 'bg-[#faf8f5] border-amber-700 text-amber-950 shadow-sm'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>Rozluštit kurent ze skenu</span>
          </button>

          <button
            onClick={() => setActiveTab('archives')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 shrink-0 ${
              activeTab === 'archives'
                ? 'bg-[#faf8f5] border-amber-700 text-amber-950 shadow-sm'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Compass className="w-4 h-4 text-stone-600" />
            <span>Rozcestník archivů ČR</span>
          </button>

          <button
            onClick={() => setActiveTab('advisor')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-2 border-b-2 shrink-0 ${
              activeTab === 'advisor'
                ? 'bg-[#faf8f5] border-amber-700 text-amber-950 shadow-sm'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-stone-600" />
            <span>Genealogický rádce (AI)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* TAB: Autonomous AI Parish Search Agent */}
          {activeTab === 'ai-search' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-emerald-950 shadow-sm">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-200" />
                </div>
                <div>
                  <h4 className="font-serif-title font-bold text-sm text-emerald-950 mb-1">
                    Může AI prohledávat matriky za vás? Ano!
                  </h4>
                  <p className="text-emerald-900/90 leading-relaxed">
                    AI agent vyhledává v online databázích, indexech českých matrik a katalozích archivů.
                    Zadejte osobu a obec: AI určí příslušnou farnost a archiv (ActaPublica, Portafontium, Třeboň atd.),
                    vyhledá konkrétní matriční knihy a signatury, prověří indexovaná jména a připraví přímé odkazy a záznamy pro váš rodokmen.
                  </p>
                </div>
              </div>

              {/* Search Form */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h3 className="font-serif-title font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
                  Zadání pro AI genealogického agenta
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Jméno a příjmení předka: *</label>
                    <input
                      type="text"
                      value={searchPersonName}
                      onChange={e => setSearchPersonName(e.target.value)}
                      placeholder="např. Antonín Dvořák"
                      className="w-full px-3 py-2 bg-stone-50 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Rodné příjmení (u žen):</label>
                    <input
                      type="text"
                      value={searchMaidenName}
                      onChange={e => setSearchMaidenName(e.target.value)}
                      placeholder="např. Čermáková, Beková"
                      className="w-full px-3 py-2 bg-stone-50 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Hledaná událost / pramen:</label>
                    <select
                      value={searchEventType}
                      onChange={e => setSearchEventType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-stone-50 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700/30"
                    >
                      <option value="Narození/křest">★ Narození / křest</option>
                      <option value="Sňatek">⚭ Sňatek (oddavky)</option>
                      <option value="Úmrtí">† Úmrtí (pohřeb)</option>
                      <option value="Sčítací operát (sčítání lidu)">📋 Sčítací operát (1857–1921)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Obec / lokalita v ČR: *</label>
                    <input
                      type="text"
                      value={searchLocationAgent}
                      onChange={e => setSearchLocationAgent(e.target.value)}
                      placeholder="např. Nelahozeves, Dřínov, Klatovy, Třeboň"
                      className="w-full px-3 py-2 bg-stone-50 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Přibližný rok / období:</label>
                    <input
                      type="text"
                      value={searchYear}
                      onChange={e => setSearchYear(e.target.value)}
                      placeholder="např. 1841 nebo 1830–1850"
                      className="w-full px-3 py-2 bg-stone-50 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span>Příklady:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchPersonName('Antonín Dvořák');
                        setSearchLocationAgent('Nelahozeves');
                        setSearchYear('1841');
                        setSearchEventType('Narození/křest');
                      }}
                      className="text-emerald-800 hover:underline font-medium"
                    >
                      Antonín Dvořák (1841)
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchPersonName('František Dvořák');
                        setSearchLocationAgent('Dřínov');
                        setSearchYear('1814');
                        setSearchEventType('Narození/křest');
                      }}
                      className="text-emerald-800 hover:underline font-medium"
                    >
                      František Dvořák (1814)
                    </button>
                  </div>

                  <button
                    onClick={handleRunAiSearch}
                    disabled={isAiSearching}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isAiSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                        <span>AI prohledává online matriky a archivy...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 text-emerald-200" />
                        <span>Spustit vyhledávání v matrikách (AI Agent)</span>
                      </>
                    )}
                  </button>
                </div>

                {aiSearchError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{aiSearchError}</span>
                  </div>
                )}
              </div>

              {/* AI Search Results Box */}
              {aiSearchResult && (
                <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h4 className="font-serif-title font-bold text-sm text-stone-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Výsledek rešerše pro: {searchPersonName} ({searchLocationAgent})</span>
                    </h4>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                      aiSearchIsFallback
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : aiSearchNotice
                          ? 'bg-sky-100 text-sky-900 border border-sky-200'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {aiSearchIsFallback
                        ? '🏛️ Archivní rozcestník ČR'
                        : aiSearchNotice
                          ? '✨ AI model (bez živého indexu)'
                          : 'Zpracováno AI & Google Search'}
                    </span>
                  </div>

                  {aiSearchNotice && (
                    <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold">{aiSearchNotice}</p>
                        {aiSearchIsFallback && (
                          <p className="text-[11px] text-amber-800">
                            Níže naleznete odkazy do online archivů. Pro vyhledání konkrétní knihy a čísla stránky je potřeba funkční AI připojení.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Grounded Web Sources */}
                  {aiSearchSources.length > 0 && (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                      <span className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                        Dohledané archivní fondy a prameny:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {aiSearchSources.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-stone-200 hover:border-emerald-300 rounded-lg text-xs font-medium transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-700" />
                            <span className="truncate max-w-xs">{s.title || s.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formatted Analysis Content */}
                  <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-100">
                    {renderMarkdownContent(aiSearchResult)}
                  </div>

                  {/* Quick Action: Pass to Transcriber & Tree */}
                  <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                    <span className="text-xs text-stone-500">
                      Našli jste konkrétní stranu či zápis? Můžete jej nechat AI přepsat do detailu.
                    </span>
                    <button
                      onClick={() => {
                        setTextExcerpt(`Nalezeno AI rešerší: ${searchPersonName}, ${searchLocationAgent}, ${searchYear}. ${aiSearchResult.slice(0, 300)}...`);
                        setParishHint(searchLocationAgent);
                        setActiveTab('ai-transcribe');
                      }}
                      className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>Otevřít v AI rozluštění &amp; zapsat do stromu</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai-transcribe' && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Automatické doplňování rodokmenu z matrik:</strong>
                  <p className="mt-0.5 text-amber-900/90">
                    Nahrajte fotografii nebo výstřižek matriční strany psané kurentem, staročeštinou či latinou (nebo vložte text). AI model přesně přeloží zápis, extrahuje data o narození, rodičích, chalupě a kmotrech a jediným kliknutím je doplní do grafu!
                  </p>
                </div>
              </div>

              {/* Input Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Input controls */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Typ archivního pramene:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setRecordType('N')}
                        className={`py-1.5 px-2.5 text-xs font-medium rounded-lg border transition-all ${
                          recordType === 'N'
                            ? 'bg-amber-800 text-white border-amber-800'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        ★ Narození
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordType('O')}
                        className={`py-1.5 px-2.5 text-xs font-medium rounded-lg border transition-all ${
                          recordType === 'O'
                            ? 'bg-amber-800 text-white border-amber-800'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        ⚭ Oddavky
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordType('Z')}
                        className={`py-1.5 px-2.5 text-xs font-medium rounded-lg border transition-all ${
                          recordType === 'Z'
                            ? 'bg-amber-800 text-white border-amber-800'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        † Úmrtí
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordType('SCITANI')}
                        className={`py-1.5 px-2.5 text-xs font-medium rounded-lg border transition-all ${
                          recordType === 'SCITANI'
                            ? 'bg-cyan-800 text-white border-cyan-800'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        📋 Sčítání
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Farnost / archiv / obec (nápověda pro AI):
                    </label>
                    <input
                      type="text"
                      placeholder="např. Nelahozeves (SOA Praha - ActaPublica)"
                      value={parishHint}
                      onChange={e => setParishHint(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                    />
                  </div>

                  {/* Upload Image Box */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nahrát snímek z online archivu (fotka / scan zápisu):
                    </label>
                    <div className="border-2 border-dashed border-stone-300 hover:border-amber-600 rounded-xl p-4 text-center bg-white transition-all">
                      {imageFile ? (
                        <div className="relative inline-block">
                          <img
                            src={imageFile}
                            alt="Matriční zápis"
                            className="max-h-36 rounded-lg object-contain mx-auto shadow-sm"
                          />
                          <button
                            onClick={() => setImageFile(null)}
                            className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-2">
                          <Upload className="w-6 h-6 text-stone-400" />
                          <span className="text-xs text-stone-700 font-medium">
                            Klikněte pro výběr obrázku nebo přetáhněte soubor
                          </span>
                          <span className="text-[10px] text-stone-400">
                            PNG, JPG, WEBP z ActaPublica, Portafontium, Třeboně apod.
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Text or notes excerpt */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-700">
                        Nebo zadejte textový přepis / výňatek:
                      </label>
                      <div className="flex gap-1.5 text-[10px]">
                        <span className="text-stone-400">Ukázky:</span>
                        <button
                          type="button"
                          onClick={() => loadPreset('křest')}
                          className="text-amber-800 hover:underline font-medium"
                        >
                          Křest
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => loadPreset('oddavky')}
                          className="text-amber-800 hover:underline font-medium"
                        >
                          Svatba
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => loadPreset('úmrtí')}
                          className="text-amber-800 hover:underline font-medium"
                        >
                          Úmrtí
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => loadPreset('scitani')}
                          className="text-cyan-800 hover:underline font-medium"
                        >
                          Sčítací operát
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      value={textExcerpt}
                      onChange={e => setTextExcerpt(e.target.value)}
                      placeholder="Vložte text zápisu nebo poznámky ze zkoumané matriky..."
                      className="w-full px-3 py-2 bg-white text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700"
                    />
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-900 hover:to-stone-900 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
                        <span>Luštím kurent a analyzuji záznam...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Rozluštit a analyzovat zápis (Gemini AI)</span>
                      </>
                    )}
                  </button>

                  {analysisError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{analysisError}</span>
                    </div>
                  )}
                </div>

                {/* Right: AI Output & One-Click Tree Auto-fill */}
                <div className="space-y-4">
                  {analysisResult ? (
                    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Výsledek analýzy</span>
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                          {analysisResult.languageDetected}
                        </span>
                      </div>

                      {/* Transcribed Text */}
                      <div>
                        <h4 className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                          Diplomatický přepis zápisu:
                        </h4>
                        <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/70 font-editorial text-xs text-stone-800 leading-relaxed italic">
                          „{analysisResult.originalTranscription}“
                        </div>
                      </div>

                      {/* Extracted Structured Entities */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
                          <span className="text-[10px] text-stone-400 block">Jméno a příjmení:</span>
                          <span className="font-semibold text-stone-900">
                            {analysisResult.extractedPerson.firstName} {analysisResult.extractedPerson.lastName}
                            {analysisResult.extractedPerson.maidenName && ` (roz. ${analysisResult.extractedPerson.maidenName})`}
                          </span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
                          <span className="text-[10px] text-stone-400 block">Datum &amp; Místo:</span>
                          <span className="font-semibold text-stone-900">
                            {analysisResult.extractedPerson.birthDate || analysisResult.extractedPerson.deathDate || 'Neznámé'}
                            {analysisResult.extractedPerson.birthPlace && `, ${analysisResult.extractedPerson.birthPlace}`}
                            {analysisResult.extractedPerson.houseNumber && ` č.p. ${analysisResult.extractedPerson.houseNumber}`}
                          </span>
                        </div>

                        {analysisResult.parents && (analysisResult.parents.fatherName || analysisResult.parents.motherName) && (
                          <div className="col-span-2 bg-stone-50 p-2 rounded-lg border border-stone-100 space-y-1">
                            <span className="text-[10px] text-stone-400 block">Rodiče v matrice:</span>
                            {analysisResult.parents.fatherName && (
                              <div className="text-stone-800">
                                <strong className="font-medium text-stone-900">Otec:</strong> {analysisResult.parents.fatherName}
                                {analysisResult.parents.fatherOccupation && ` (${analysisResult.parents.fatherOccupation})`}
                              </div>
                            )}
                            {analysisResult.parents.motherName && (
                              <div className="text-stone-800">
                                <strong className="font-medium text-stone-900">Matka:</strong> {analysisResult.parents.motherName}
                                {analysisResult.parents.motherMaidenName && ` roz. ${analysisResult.parents.motherMaidenName}`}
                              </div>
                            )}
                          </div>
                        )}

                        {analysisResult.godparentsOrWitnesses && analysisResult.godparentsOrWitnesses.length > 0 && (
                          <div className="col-span-2 bg-stone-50 p-2 rounded-lg border border-stone-100">
                            <span className="text-[10px] text-stone-400 block">Kmotři / Svědci:</span>
                            <span className="text-stone-700 text-[11px]">
                              {analysisResult.godparentsOrWitnesses.join('; ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Context & Notes */}
                      {analysisResult.notesAndContext && (
                        <div className="text-xs text-stone-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50">
                          <strong className="text-amber-900 font-semibold block mb-0.5">Genealogické souvislosti:</strong>
                          <p>{analysisResult.notesAndContext}</p>
                        </div>
                      )}

                      {/* One-click Action Button */}
                      <button
                        onClick={() => {
                          onApplyExtractedData(analysisResult, targetPerson?.id);
                          onClose();
                        }}
                        className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                      >
                        <UserPlus className="w-4 h-4 text-emerald-200" />
                        <span>Doplnit automaticky do rodokmenu</span>
                      </button>
                    </div>
                  ) : (
                    <div className="h-full min-h-[300px] border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-stone-400">
                      <FileText className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-xs font-medium text-stone-600">
                        Zde se po analýze zobrazí rozluštěný přepis a extrahovaná genealogická data.
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1 max-w-xs">
                        Následně stačí jedno kliknutí a osoba, rodiče a přesná archivní citace budou přidány do stromu.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Archives Directory */}
          {activeTab === 'archives' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200">
                <div className="w-full md:w-auto flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Vyhledat obec, farnost, okres nebo sčítací operát (např. Nelahozeves, Brno, 1921)..."
                    value={searchLocation}
                    onChange={e => setSearchLocation(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-stone-50 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setArchiveCategoryFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      archiveCategoryFilter === 'all'
                        ? 'bg-stone-800 text-white border-stone-800'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Vše
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveCategoryFilter('matriky')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      archiveCategoryFilter === 'matriky'
                        ? 'bg-amber-800 text-white border-amber-800'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Matriky
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveCategoryFilter('scitani')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      archiveCategoryFilter === 'scitani'
                        ? 'bg-cyan-800 text-white border-cyan-800'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Sčítací operáty
                  </button>
                  {searchLocation && (
                    <button
                      onClick={() => setSearchLocation('')}
                      className="text-xs text-stone-500 hover:text-stone-800 font-medium pl-1"
                    >
                      Zrušit
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Portals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArchives.map(portal => (
                  <div
                    key={portal.id}
                    className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif-title font-bold text-sm text-stone-900">
                          {portal.name}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${portal.badgeColor}`}>
                          {portal.region}
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 mt-2">
                        {portal.description}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                        <div>
                          <strong className="text-stone-700">Pokrytí:</strong> {portal.coverage}
                        </div>
                        <div className="text-amber-900 bg-amber-50/60 p-1.5 rounded">
                          💡 <strong className="font-medium">Tip:</strong> {portal.tips}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <a
                        href={buildArchiveSearchUrl(portal, searchLocation || 'Nelahozeves')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 transition-colors"
                      >
                        <span>Vyhledat v archivu</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <a
                        href={portal.webUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-stone-400 hover:text-stone-600"
                      >
                        Hlavní stránka portálu
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Advisor (AI Brick Wall Helper) */}
          {activeTab === 'advisor' && (
            <div className="space-y-5">
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                <h3 className="font-serif-title font-bold text-sm text-stone-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-800" />
                  <span>Genealogický rádce: Řešení slepých uliček v bádání</span>
                </h3>
                <p className="text-xs text-stone-600">
                  Zasekli jste se při hledání předka? Chybí zápis v matrice? Zeptejte se umělé inteligence specializované na české archivy a historické prameny.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">Jméno předka:</label>
                    <input
                      type="text"
                      value={advisorName}
                      onChange={e => setAdvisorName(e.target.value)}
                      placeholder="např. Jan Dvořák"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">Obec / panství:</label>
                    <input
                      type="text"
                      value={advisorPlace}
                      onChange={e => setAdvisorPlace(e.target.value)}
                      placeholder="např. Třeboradice / Líbeznice"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">Období / rok:</label>
                    <input
                      type="text"
                      value={advisorYear}
                      onChange={e => setAdvisorYear(e.target.value)}
                      placeholder="např. 1770–1800"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Váš dotaz / popis problému:
                  </label>
                  <textarea
                    rows={3}
                    value={advisorQuestion}
                    onChange={e => setAdvisorQuestion(e.target.value)}
                    placeholder="Popište, co hledáte a co se nedaří najít..."
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
                  />
                </div>

                <button
                  onClick={handleConsultAdvisor}
                  disabled={isAdvising}
                  className="py-2 px-4 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isAdvising ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Hledám archivní řešení...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>Poradit se s genealogem (AI)</span>
                    </>
                  )}
                </button>
              </div>

              {advisorAdvice && (
                <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3 animate-in fade-in">
                  <h4 className="font-serif-title font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
                    Doporučený postup archivního bádání:
                  </h4>
                  <div className="text-xs text-stone-700 leading-relaxed">
                    {renderMarkdownContent(advisorAdvice)}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
          <span>České online matriky: SOA Praha, MZA Brno, SOA Plzeň, Třeboň, Zámrsk, Litoměřice, Opava, AMP</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium rounded-lg transition-colors"
          >
            Zavřít
          </button>
        </div>

      </div>
    </div>
  );
};
