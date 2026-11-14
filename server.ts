import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Helper to identify Gemini 429 / RESOURCE_EXHAUSTED / Quota errors
 */
function isRateLimitError(err: any): boolean {
  if (!err) return false;
  if (err?.status === 429 || err?.status === 'RESOURCE_EXHAUSTED' || err?.code === 429) return true;
  const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate-limit');
}

/**
 * Handles rate limits (HTTP 429) gracefully with backoff retry
 */
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && isRateLimitError(err)) {
      console.log(`Gemini 429 rate limit encountered, waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return await callGeminiWithRetry(fn, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

function formatGeminiError(error: any): string {
  if (isRateLimitError(error)) {
    return 'Byla dočasně překročena bezplatná minutová kvóta požadavků (HTTP 429 - Rate limit na bezplatném plánu Gemini API). Počkejte prosím přibližně 30 až 60 sekund a zkuste požadavek odeslat znovu.';
  }
  return error?.message || 'Nastala chyba při komunikaci s AI modelem.';
}

/**
 * Maps Czech locations to their corresponding regional state archives & online portals
 */
function determineArchiveByLocation(location: string = '') {
  const loc = (location || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (
    loc.includes('praha') &&
    (loc.includes('mesto') || loc.includes('stare') || loc.includes('nove') || loc.includes('vinohrad') ||
     loc.includes('zizkov') || loc.includes('smichov') || loc.includes('karlin') || loc.includes('holesovic') ||
     loc.includes('liben') || loc.includes('vysehrad') || loc.includes('hl. m.') || loc === 'praha')
  ) {
    return {
      archiveName: 'Archiv hl. města Prahy (AHMP – PragaPublica)',
      webUrl: 'https://katalog.ahmp.cz/pragapublica/',
      searchUrl: 'https://katalog.ahmp.cz/pragapublica/',
      tips: 'Zkontrolujte pražské matriky a zejména digitalizované Policejní přihlášky k pobytu (1850–1914), kde jsou uvedeni všichni členové rodiny i s přesnými daty a domovskými obcemi.'
    };
  }
  if (
    loc.includes('nelahozeves') || loc.includes('kralupy') || loc.includes('kladno') || loc.includes('rakovnik') ||
    loc.includes('melnik') || loc.includes('kutna hora') || loc.includes('kolin') || loc.includes('nymburk') ||
    loc.includes('beroun') || loc.includes('pribram') || loc.includes('benesov') || loc.includes('mlada boleslav') ||
    loc.includes('praha-vychod') || loc.includes('praha-zapad') || loc.includes('slany') || loc.includes('stredocesk') ||
    loc.includes('drinov')
  ) {
    return {
      archiveName: 'eBadatelna SOA v Praze (Střední Čechy)',
      webUrl: 'https://ebadatelna.soapraha.cz',
      searchUrl: 'https://ebadatelna.soapraha.cz',
      tips: 'Matriky Nelahozevsi a celých středních Čech jsou digitalizovány v systému eBadatelna SOA Praha. Na úvodní stránce zvolte sekci Matriky a zadejte farnost nebo obec.'
    };
  }
  if (
    loc.includes('brno') || loc.includes('morav') || loc.includes('znojmo') || loc.includes('jihlava') ||
    loc.includes('trebic') || loc.includes('zdar') || loc.includes('breclav') || loc.includes('hodonin') ||
    loc.includes('kromeriz') || loc.includes('vyskov') || loc.includes('blansko') || loc.includes('uhersk') || loc.includes('zlin')
  ) {
    return {
      archiveName: 'ActaPublica – Moravský zemský archiv v Brně',
      webUrl: 'https://www.mza.cz/actapublica/matrika/hledani',
      searchUrl: 'https://www.mza.cz/actapublica/matrika/hledani',
      tips: 'Nový oficiální portál MZA Brno umožňuje přímé vyhledávání podle farnosti nebo obce. Každá matriční kniha i snímek má trvalý odkaz.'
    };
  }
  if (
    loc.includes('plzen') || loc.includes('klatovy') || loc.includes('domazlice') || loc.includes('tachov') ||
    loc.includes('rokycany') || loc.includes('karlovy vary') || loc.includes('cheb') || loc.includes('sokolov') ||
    loc.includes('susice') || loc.includes('stribro')
  ) {
    return {
      archiveName: 'Portafontium – SOA v Plzni (Západní Čechy)',
      webUrl: 'https://www.portafontium.eu',
      searchUrl: 'https://www.portafontium.eu/searching/register',
      tips: 'Portál Portafontium má vysoké rozlišení skenů. V sekci Matriky hledejte v poli „Místo“ podle českých i německých názvů obcí (např. Plzeň / Pilsen).'
    };
  }
  if (
    loc.includes('ceske budejovice') || loc.includes('cesky krumlov') || loc.includes('trebon') || loc.includes('jindrichuv hradec') ||
    loc.includes('pisek') || loc.includes('prachatice') || loc.includes('strakonice') || loc.includes('tabor') || loc.includes('jihocesk')
  ) {
    return {
      archiveName: 'DigiArchiv SOA v Třeboni (Jižní Čechy)',
      webUrl: 'https://digi.ceskearchivy.cz',
      searchUrl: 'https://digi.ceskearchivy.cz',
      tips: 'V levém menu zvolte „Matriky“ → „Římskokatolická církev“ a vyhledejte obec. K dispozici jsou i soupisy poddaných a sčítací operáty.'
    };
  }
  if (
    loc.includes('hradec') || loc.includes('pardubice') || loc.includes('chrudim') || loc.includes('nachod') ||
    loc.includes('jicin') || loc.includes('rychnov') || loc.includes('svitavy') || loc.includes('trutnov') ||
    loc.includes('zamrsk') || loc.includes('vychodocesk') || loc.includes('litomysl') || loc.includes('policka')
  ) {
    return {
      archiveName: 'ARON – SOA v Hradci Králové / Zámrsk (Východní Čechy)',
      webUrl: 'https://aron.vychodoceskearchivy.cz',
      searchUrl: `https://aron.vychodoceskearchivy.cz/apu?q=${encodeURIComponent(location)}`,
      tips: 'Východočeské matriky jsou dostupné na oficiálním portálu ARON (vychodoceskearchivy.cz) s možností přímého hledání farností i prohlížení indexů.'
    };
  }
  if (
    loc.includes('litomerice') || loc.includes('usti') || loc.includes('decin') || loc.includes('teplice') ||
    loc.includes('most') || loc.includes('chomutov') || loc.includes('louny') || loc.includes('liberec') ||
    loc.includes('jablonec') || loc.includes('ceska lipa') || loc.includes('severocesk') || loc.includes('zatec')
  ) {
    return {
      archiveName: 'Digitální badatelna SOA v Litoměřicích (Severní Čechy)',
      webUrl: 'https://digi.soalitomerice.cz',
      searchUrl: 'https://digi.soalitomerice.cz',
      tips: 'Nová badatelna pro severní Čechy. Většina matrik před rokem 1945 v pohraničí je vedena německým kurentem.'
    };
  }
  if (
    loc.includes('opava') || loc.includes('ostrava') || loc.includes('olomouc') || loc.includes('frydek') ||
    loc.includes('karvina') || loc.includes('novy jicin') || loc.includes('prerov') || loc.includes('prostejov') ||
    loc.includes('sumperk') || loc.includes('jesenik') || loc.includes('bruntal') || loc.includes('slezsk')
  ) {
    return {
      archiveName: 'Digitální archiv ZA v Opavě (Slezsko & Severní Morava)',
      webUrl: 'https://digi.archives.cz',
      searchUrl: 'https://digi.archives.cz',
      tips: 'Digitální archiv ZA Opava pokrývá celé Slezsko a severní/střední Moravu s přehledným stromem farností a signatur.'
    };
  }

  // Generic fallback
  return {
    archiveName: 'eBadatelna SOA Praha / Rozcestník archivů ČR',
    webUrl: 'https://ebadatelna.soapraha.cz',
    searchUrl: `https://www.familysearch.org/cs/search/record/results?q.anyPlace=${encodeURIComponent(location)}`,
    tips: 'Vyberte krajský archiv níže podle regionu obce nebo vyhledejte indexované záznamy na FamilySearch (vyžaduje bezplatné přihlášení).'
  };
}


app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

/**
 * Endpoint to transcribe and analyze historical parish records (Matriky)
 * Can handle handwritten Kurent, Latin, and Old Czech from image or text.
 */
app.post('/api/archives/analyze-record', async (req, res) => {
  try {
    const { imageBase64, mimeType, textExcerpt, recordType, parishHint } = req.body;

    const parts: any[] = [];

    if (imageBase64) {
      // Clean base64 if it includes prefix
      const cleanData = imageBase64.replace(/^data:[a-zA-Z0-9/]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanData,
        },
      });
    }

    const systemInstruction = `Jsi přední český genealog a archivář specializující se na české církevní matriky (narození/křty, oddavky, úmrtí), staré písmo (německý i český kurent, novogotické kurzívy, švabach), latinské církevní záznamy a starou češtinu od 17. do 20. století v českých zemích.
Tvým úkolem je:
1. Přesně přepsat historický zápis z matriky do moderního čitelného textu (diplomatický přepis i normalizovaný přepis).
2. Extrahovat všechny genealogické entity: jméno osoby, příjmení, rodné příjmení matky/nevěsty, pohlaví, datum události (den, měsíc, rok), místo (farnost, obec, číslo popisné č.p.), povolání, náboženství, příčinu úmrtí (pokud jde o matriku zemřelých), jména rodičů (otec + matka včetně jejích rodičů), kmotři/svědci.
3. Poskytnout doporučení, jak tento záznam správně citovat a začlenit do rodokmenu.

Odpověz VÝHRADNĚ ve strukturovaném JSON formátu.`;

    const userPrompt = `Analyzuj prosím tento matriční záznam.
Typ matriky: ${recordType || 'Neuvedeno (N/O/Z)'}
Farnost / nápověda: ${parishHint || 'neuvedeno'}
${textExcerpt ? `Doplňující text / přepis ze skenu: ${textExcerpt}` : ''}
Pokud je přiložen obrázek, pozorně rozlušti rukopisný kurent nebo latinu.`;

    parts.push({ text: userPrompt });

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recordType: { type: Type.STRING, description: 'N (narození), O (oddavky), Z (zemřelí) nebo GENERAL' },
              originalTranscription: { type: Type.STRING, description: 'Přesný přepis celého matričního zápisu' },
              languageDetected: { type: Type.STRING, description: 'Např. Kurent (němčina), Stará čeština, Latina' },
              confidence: { type: Type.NUMBER, description: 'Odhad jistoty přepisu od 0 do 100' },
              extractedPerson: {
                type: Type.OBJECT,
                properties: {
                  firstName: { type: Type.STRING },
                  lastName: { type: Type.STRING },
                  maidenName: { type: Type.STRING },
                  gender: { type: Type.STRING, description: 'M nebo F' },
                  birthDate: { type: Type.STRING },
                  birthPlace: { type: Type.STRING },
                  deathDate: { type: Type.STRING },
                  deathPlace: { type: Type.STRING },
                  houseNumber: { type: Type.STRING },
                  occupation: { type: Type.STRING },
                  religion: { type: Type.STRING },
                  causeOfDeath: { type: Type.STRING }
                }
              },
              parents: {
                type: Type.OBJECT,
                properties: {
                  fatherName: { type: Type.STRING },
                  fatherOccupation: { type: Type.STRING },
                  fatherOrigin: { type: Type.STRING },
                  motherName: { type: Type.STRING },
                  motherMaidenName: { type: Type.STRING },
                  motherOrigin: { type: Type.STRING }
                }
              },
              godparentsOrWitnesses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Kmotři nebo svědci se svými obcemi a povoláními'
              },
              citationSuggestion: {
                type: Type.OBJECT,
                properties: {
                  archiveName: { type: Type.STRING },
                  parish: { type: Type.STRING },
                  bookType: { type: Type.STRING },
                  signature: { type: Type.STRING },
                  folio: { type: Type.STRING }
                }
              },
              notesAndContext: { type: Type.STRING, description: 'Doplňující genealogický výklad, zajímavosti z farnosti, tipy na další bádání' },
              suggestedAction: { type: Type.STRING, description: 'CREATE_NEW nebo UPDATE_EXISTING' }
            },
            required: ['recordType', 'originalTranscription', 'extractedPerson', 'citationSuggestion', 'notesAndContext']
          }
        }
      })
    );

    const resultText = response.text || '{}';
    const parsed = JSON.parse(resultText);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error analyzing parish record:', error);
    res.status(500).json({
      success: false,
      error: formatGeminiError(error)
    });
  }
});

/**
 * Genealogical advisor & Parish finder endpoint
 */
app.post('/api/archives/advisor', async (req, res) => {
  try {
    const { personName, parishOrPlace, yearRange, problemDescription } = req.body;

    const systemInstruction = `Jsi zkušený český rodopisec a archivní poradce. Pomáháš badatelům hledat v českých a moravských archivech (ActaPublica, Portafontium, Třeboň, Zámrsk, Litoměřice, Opava, AMP, FamilySearch, Národní archiv).
Uživatel řeší problém s hledáním předka nebo matriky. Poskytni konkrétní, praktické rady:
1. Který přesný archiv a farní obvod pod danou obec spadal.
2. V jakých konkrétních knihách (matriky N, O, Z, rejstříky/indexy) a fondech hledat.
3. Kde hledat, pokud zápis v matrice chybí (např. svatba v rodné vsi nevěsty, gruntovní knihy, lánové rejstříky, sčítání lidu, konskripce).
4. Jak se příjmení mohlo v té době psát německy/foneticky.`;

    const prompt = `Badatel hledá:
Osoba: ${personName || 'neuvedeno'}
Místo / obec / farnost: ${parishOrPlace || 'neuvedeno'}
Časové období: ${yearRange || 'neuvedeno'}
Otázka / problém: ${problemDescription || 'Kde mám začít a v jakém archivu najdu matriky této obce?'}`;

    try {
      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction,
          }
        })
      );
      return res.json({ success: true, advice: response.text });
    } catch (aiErr: any) {
      if (isRateLimitError(aiErr)) {
        console.warn('Advisor hit Gemini rate limit/quota, generating expert archive fallback...');
        const archive = determineArchiveByLocation(parishOrPlace);
        const fallbackAdvice = `### 💡 Genealogická rada pro: **${personName || 'Hledaného předka'}**
**Lokalita:** ${parishOrPlace || 'neuvedeno'} (${archive.archiveName})  
**Období:** ${yearRange || 'neuvedeno'}

---

#### 1. Doporučený archivní portál pro tuto oblast:
- **Portál:** [${archive.archiveName}](${archive.webUrl})
- **Přímé vyhledání:** [Otevřít fondy pro „${parishOrPlace || 'obec'}“](${archive.searchUrl})
- **Specifikum archivu:** ${archive.tips}

#### 2. Kde hledat, pokud zápis v matrice chybí:
1. **Svatba v rodné obci nevěsty:** Drtivá většina sňatků v českých zemích se konala ve farnosti nevěsty. Pokud znáte jen obec ženicha, hledejte nejprve narození jejich dětí – v zápisech křtů bývá uvedeno přesné rodné příjmení a rodiště matky (nevěsty).
2. **Rejstříky / Indexy oddaných (Index O):** Hledejte v indexech oddaných s tolerancí ±5 let kolem odhadovaného roku sňatku.
3. **Policejní přihlášky a sčítání lidu (1869–1921):** V operátech sčítání lidu jsou zapsáni všichni členové domácnosti včetně přesných dat a míst narození.
4. **Pozemkové a gruntovní knihy:** U rolnických a chalupnických rodů obsahují smlouvy o postoupení gruntu a svatební smlouvy s přesnými příbuzenskými vztahy.

*(Poznámka: Rada byla sestavena z interní genealogické metodiky z důvodu dočasného vytížení bezplatné kvóty Gemini API).*`;

        return res.json({
          success: true,
          advice: fallbackAdvice,
          isFallback: true
        });
      }
      throw aiErr;
    }
  } catch (error: any) {
    console.error('Error in advisor endpoint:', error);
    res.status(500).json({
      success: false,
      error: formatGeminiError(error)
    });
  }
});

/**
 * Autonomous AI Parish Search Agent
 * Uses Gemini 3.8 Flash with Google Search Grounding to search online archives,
 * indexes, and registers for ancestors. Recovers with intelligent archival fallback on 429 quota.
 */
app.post('/api/archives/ai-search', async (req, res) => {
  try {
    const { personName, maidenName, birthYear, location, eventType } = req.body;

    const systemInstruction = `Jsi přední český genealogický rešeršér a archivář specializovaný na online matriky České republiky (ActaPublica SOA Praha a MZA Brno, Portafontium SOA Plzeň, DigiArchiv Třeboň, ARON Zámrsk, Vademecum Litoměřice, Digiteka Opava, Archiv hl. m. Prahy a FamilySearch).
Tvým úkolem je provést pro badatele podrobnou rešerši:
1. Urči přesný státní oblastní archiv a příslušný farní úřad (farnost).
2. Urči konkrétní matriční knihy a signatury (např. Nelahozeves 04, Narození 1835-1850).
3. Vyhledej indexované záznamy, zmínky a farní příslušnost obce.
4. Připrav jasný strukturovaný výstup:
   - Příslušný online archiv a farnost
   - Doporučené signatury a časové rozsahy knih
   - Přímé odkazy pro badatele
   - Nalezená genealogická data k začlenění do rodokmenu.`;

    const prompt = `Proveď rešerši pro osobu v českých matrikách:
Jméno a příjmení: ${personName || ''} ${maidenName ? `(roz. ${maidenName})` : ''}
Období / rok: ${birthYear || 'neuvedeno'}
Místo / obec: ${location || 'Česká republika'}
Hledaná událost: ${eventType || 'Narození/křest'}

Prohledej online zdroje a uveď konkrétní farnost, archivní portál, signatury knih a postup pro badatele.`;

    // Attempt 1: Gemini 3.8 Flash with Google Search Grounding
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        }
      });

      const webSources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        .map((chunk: any) => ({
          title: chunk.web?.title || 'Archivní pramen',
          url: chunk.web?.uri || ''
        }))
        .filter((s: any) => Boolean(s.url));

      return res.json({
        success: true,
        resultText: response.text,
        sources: webSources
      });
    } catch (primaryErr: any) {
      if (isRateLimitError(primaryErr)) {
        console.warn('AI search with search grounding hit 429 quota. Trying plain text model...');
        
        // Attempt 2: Try without Google Search tool (requires fewer quota tokens)
        try {
          const textOnlyResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction,
            }
          });

          const archive = determineArchiveByLocation(location);
          return res.json({
            success: true,
            resultText: textOnlyResponse.text,
            sources: [
              { title: archive.archiveName, url: archive.searchUrl },
              { title: 'Online archiv', url: archive.webUrl }
            ]
          });
        } catch (secondaryErr: any) {
          console.warn('Secondary AI search attempt also hit rate limit. Providing intelligent database fallback...');
          // Fallback: Generate structured Czech archival guide directly
          const archive = determineArchiveByLocation(location);
          const fallbackText = `### 🏛️ Archivní rešerše pro osobu: **${personName || 'Hledaný předek'}** ${maidenName ? `(roz. ${maidenName})` : ''}

**Hledaná lokalita:** ${location || 'Česká republika'}  
**Časové období:** okolo roku ${birthYear || 'neuvedeno'}  
**Hledaná událost:** ${eventType || 'Narození/křest'}  

---

#### 1. Příslušný archiv a farní správa:
- **Příslušný archivní portál:** [${archive.archiveName}](${archive.webUrl})
- **Otevřít matriky:** [Přejít do digitální badatelny pro „${location || 'Česká republika'}“](${archive.searchUrl})
- **Specifikum archivního fondu:** ${archive.tips}

#### 2. Doporučené knihy a postup bádání:
1. **Rejstříky (Indexy N / O / Z):** Většina digitalizovaných matrik má na začátku, na konci nebo v samostatném svazku abecední index podle příjmení. Prohledejte rejstřík pro roky ${birthYear ? `${Number(birthYear) - 5} až ${Number(birthYear) + 5}` : 'daného období'}.
2. **Kniha narozených a křtů (N):** Jakmile v indexu naleznete příjmení a folio (číslo strany), otevřete příslušnou knihu křtů.
3. **Číslo popisné (č.p.):** Zapište si číslo domu. Všechny další děti téže rodiny a úmrtí prarodičů bývají zapsány pod stejným číslem domu.
4. **Sňatek rodičů:** Svatba se v 95 % případů odehrávala v rodné vsi a farnosti **nevěsty** (matky), obvykle 1 až 4 roky před narozením nejstaršího potomka.

#### 3. Přehled oficiálních digitálních archivů ČR:
- [eBadatelna SOA v Praze](https://ebadatelna.soapraha.cz) – Střední Čechy (Kladno, Mělník, Slaný, Kolín, Beroun, Benešov...)
- [ActaPublica (MZA Brno)](https://www.mza.cz/actapublica/matrika/hledani) – Jižní a střední Morava, část Vysočiny
- [Portafontium (SOA Plzeň)](https://www.portafontium.eu/searching/register) – Západní Čechy (Plzeň, Klatovy, Karlovy Vary, Cheb)
- [DigiArchiv SOA v Třeboni](https://digi.ceskearchivy.cz) – Jižní Čechy (České Budějovice, Tábor, Krumlov)
- [ARON Východočeské archivy](https://aron.vychodoceskearchivy.cz) – Hradec Králové, Pardubice, Zámrsk
- [Digitální badatelna Litoměřice](https://digi.soalitomerice.cz) – Severní Čechy (Ústí, Teplice, Liberec, Louny)
- [Digitální archiv ZA Opava](https://digi.archives.cz) – Moravskoslezský a Olomoucký kraj
- [Archiv hl. m. Prahy](https://katalog.ahmp.cz/pragapublica/) – Pražské matriky a policejní přihlášky`;

          const uniqueSources = [
            { title: archive.archiveName, url: archive.searchUrl },
            ...(archive.webUrl !== archive.searchUrl ? [{ title: 'Hlavní portál archivu', url: archive.webUrl }] : []),
            { title: 'eBadatelna SOA Praha', url: 'https://ebadatelna.soapraha.cz' },
            { title: 'ActaPublica MZA Brno', url: 'https://www.mza.cz/actapublica/matrika/hledani' }
          ].filter((item, idx, arr) => arr.findIndex(x => x.url === item.url) === idx);

          return res.json({
            success: true,
            resultText: fallbackText,
            sources: uniqueSources,
            isFallback: true,
            notice: 'Rešerše byla sestavena z interní databáze českých archivů a matrik (bezplatná minutová kvóta Gemini API byla dočasně vyčerpána).'
          });
        }
      }
      throw primaryErr;
    }
  } catch (error: any) {
    console.error('Error in ai-search endpoint:', error);
    res.status(500).json({
      success: false,
      error: formatGeminiError(error)
    });
  }
});


// Mount Vite or serve static files
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rodokmen server běží na http://0.0.0.0:${PORT}`);
});
