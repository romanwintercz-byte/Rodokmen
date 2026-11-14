import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export function getConfiguredApiKey(): string {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    '';
  return raw.trim();
}

export function getGeminiClient() {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isRateLimitError(err: any): boolean {
  if (!err) return false;
  if (err?.status === 429 || err?.status === 'RESOURCE_EXHAUSTED' || err?.code === 429) return true;
  const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate-limit');
}

export function isMissingApiKeyError(err: any): boolean {
  if (!err) return false;
  if (err?.status === 401 || err?.status === 403) return true;
  const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
  return (
    msg.includes('MISSING_GEMINI_API_KEY') ||
    msg.includes('default credentials') ||
    msg.includes('API key') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('UNAUTHENTICATED')
  );
}

export async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && isRateLimitError(err)) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return await callGeminiWithRetry(fn, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

export function isTimeoutError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err?.message || '';
  return msg.includes('AI_TIMEOUT') || msg.includes('timed out') || msg.includes('ETIMEDOUT');
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

export function formatGeminiError(error: any): string {
  if (isRateLimitError(error)) {
    return 'Byla dočasně překročena bezplatná minutová kvóta požadavků (HTTP 429 - Rate limit na bezplatném plánu Gemini API). Počkejte prosím přibližně 30 až 60 sekund a zkuste požadavek odeslat znovu.';
  }
  if (isMissingApiKeyError(error)) {
    return 'Na serveru není nastavený platný GEMINI_API_KEY. Pokud aplikaci provozujete na Vercelu, přidejte proměnnou GEMINI_API_KEY v Settings → Environment Variables a spusťte Redeploy.';
  }
  if (isTimeoutError(error)) {
    return 'AI odpověď trvala příliš dlouho (časový limit serveru). Zkuste prosím akci zopakovat.';
  }
  const msg = error?.message || '';
  return msg || 'Nastala chyba při komunikaci s AI modelem.';
}

export function determineArchiveByLocation(location: string = '') {
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
      censusName: 'Sčítání lidu 1869–1921 & Policejní přihlášky (AHMP)',
      censusUrl: 'https://katalog.ahmp.cz/pragapublica/',
      tips: 'Zkontrolujte pražské matriky, Sčítací archy (1869–1921 podle č.p.) a digitalizované Policejní přihlášky k pobytu (1850–1914).'
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
      censusName: 'Sčítací operáty – eBadatelna SOA Praha',
      censusUrl: 'https://ebadatelna.soapraha.cz',
      tips: 'Matriky i Sčítací operáty středních Čech (1869–1921) jsou dostupné v systému eBadatelna SOA Praha. Na úvodní stránce zvolte sekci Matriky nebo Sčítací operáty.'
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
      censusName: 'Sčítací operáty MZA Brno (1857–1921)',
      censusUrl: 'https://www.mza.cz/scitacioperaty/',
      tips: 'Matriky hledejte v ActaPublica (MZA Brno) a sčítací operáty na samostatném portálu mza.cz/scitacioperaty podle politického okresu, obce a č.p.'
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
      censusName: 'Sčítání lidu – Portafontium (Západní Čechy)',
      censusUrl: 'https://www.portafontium.eu/searching/census',
      tips: 'Portál Portafontium nabízí jak matriky (searching/register), tak digitalizované sčítací operáty (searching/census) podle českých i německých názvů obcí.'
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
      censusName: 'Sčítací operáty – DigiArchiv SOA Třeboň',
      censusUrl: 'https://digi.ceskearchivy.cz',
      tips: 'V levém menu DigiArchivu zvolte „Matriky“ nebo kategorii „Sčítání lidu“ (1869–1921) a „Soupisy poddaných“.'
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
      censusName: 'Sčítání lidu – ARON Východočeské archivy',
      censusUrl: `https://aron.vychodoceskearchivy.cz/apu?q=${encodeURIComponent(location)}`,
      tips: 'Východočeské matriky i sčítací operáty okresních úřadů jsou dostupné na portálu ARON (vychodoceskearchivy.cz).'
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
      censusName: 'Sčítání lidu – Badatelna SOA Litoměřice',
      censusUrl: 'https://digi.soalitomerice.cz',
      tips: 'V badatelně pro severní Čechy hledejte jak matriky, tak fondy okresních úřadů se sčítacími operáty.'
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
      censusName: 'Sčítací operáty – Digitální archiv ZA Opava',
      censusUrl: 'https://digi.archives.cz',
      tips: 'Digitální archiv ZA Opava pokrývá matriky i sčítací operáty (filtr „Sčítání lidu“) pro Slezsko a severní/střední Moravu.'
    };
  }

  return {
    archiveName: 'eBadatelna SOA Praha / Rozcestník archivů ČR',
    webUrl: 'https://ebadatelna.soapraha.cz',
    searchUrl: `https://www.familysearch.org/cs/search/record/results?q.anyPlace=${encodeURIComponent(location)}`,
    censusName: 'Sčítací operáty MZA Brno / Portafontium / eBadatelna',
    censusUrl: 'https://www.mza.cz/scitacioperaty/',
    tips: 'Vyberte krajský archiv níže podle regionu obce pro matriky i sčítací operáty (1857–1921).'
  };
}

export async function runAnalyzeRecord(body: any) {
  const { imageBase64, mimeType, textExcerpt, recordType, parishHint } = body || {};
  const ai = getGeminiClient();
  const parts: any[] = [];

  if (imageBase64) {
    const cleanData = String(imageBase64).replace(/^data:[a-zA-Z0-9/]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanData,
      },
    });
  }

  const systemInstruction = `Jsi přední český genealog a archivář specializující se na české církevní matriky (narození/křty, oddavky, úmrtí) a sčítací operáty / sčítací archy ze sčítání lidu (1857–1921), staré písmo (německý i český kurent, novogotické kurzívy, švabach), latinské církevní záznamy a starou češtinu od 17. do 20. století v českých zemích.
Tvým úkolem je:
1. Přesně přepsat historický zápis z matriky nebo sčítacího operátu do moderního čitelného textu (diplomatický přepis i normalizovaný přepis).
2. Extrahovat všechny genealogické entity: jméno osoby (u sčítacího operátu hlavní osoby/hlavy domácnosti a ostatní členy domácnosti zapiš do notesAndContext a godparentsOrWitnesses), příjmení, rodné příjmení matky/nevěsty, pohlaví, datum události/narození (den, měsíc, rok), místo (farnost, obec, číslo popisné č.p.), povolání, náboženství, příčinu úmrtí (pokud jde o matriku zemřelých), jména rodičů, kmotři/svědci.
3. Poskytnout doporučení, jak tento záznam správně citovat a začlenit do rodokmenu.

Odpověz VÝHRADNĚ ve strukturovaném JSON formátu.`;

  const userPrompt = `Analyzuj prosím tento archivní záznam (matrika nebo sčítací operát).
Typ pramene: ${recordType || 'Neuvedeno (N/O/Z/SCITANI)'}
Farnost / obec / nápověda: ${parishHint || 'neuvedeno'}
${textExcerpt ? `Doplňující text / přepis ze skenu: ${textExcerpt}` : ''}
Pokud je přiložen obrázek, pozorně rozlušti rukopisný kurent, švabach nebo sčítací arch.`;

  parts.push({ text: userPrompt });

  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recordType: { type: Type.STRING, description: 'N (narození), O (oddavky), Z (zemřelí), SCITANI (sčítací operát) nebo GENERAL' },
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
  return JSON.parse(resultText);
}

function buildAdvisorFallback(personName: string, parishOrPlace: string, yearRange: string, reasonNotice?: string) {
  const archive = determineArchiveByLocation(parishOrPlace);
  return `${reasonNotice ? `> ⚠️ ${reasonNotice}\n\n` : ''}### 💡 Genealogická rada pro: **${personName || 'Hledaného předka'}**
**Lokalita:** ${parishOrPlace || 'neuvedeno'} (${archive.archiveName})  
**Období:** ${yearRange || 'neuvedeno'}

---

#### 1. Doporučený archivní portál pro tuto oblast:
- **Matriky:** [${archive.archiveName}](${archive.webUrl})
- **Sčítací operáty (1857–1921):** [${archive.censusName}](${archive.censusUrl})
- **Otevřít digitální badatelnu:** [Přejít do archivu pro „${parishOrPlace || 'obec'}“](${archive.searchUrl})
- **Specifikum archivu:** ${archive.tips}

#### 2. Kde hledat, pokud zápis v matrice chybí:
1. **Sčítací operáty (1857, 1869, 1880, 1890, 1900, 1910, 1921):** Obsahují kompletní přehled obyvatel konkrétního domu (č.p.) včetně přesného data a místa narození i domovské příslušnosti. Pomohou rychle zjistit, odkud se rodina přistěhovala.
2. **Svatba v rodné obci nevěsty:** Drtivá většina sňatků v českých zemích se konala ve farnosti nevěsty. Pokud znáte jen obec ženicha, hledejte nejprve narození jejich dětí – v zápisech křtů bývá uvedeno přesné rodné příjmení a rodiště matky (nevěsty).
3. **Rejstříky / Indexy oddaných (Index O):** Hledejte v indexech oddaných s tolerancí ±5 let kolem odhadovaného roku sňatku.
4. **Pozemkové a gruntovní knihy:** U rolnických a chalupnických rodů obsahují smlouvy o postoupení gruntu a svatební smlouvy s přesnými příbuzenskými vztahy.`;
}

export async function runAdvisor(body: any) {
  const { personName, parishOrPlace, yearRange, problemDescription } = body || {};

  if (!getConfiguredApiKey()) {
    return {
      success: true,
      advice: buildAdvisorFallback(
        personName,
        parishOrPlace,
        yearRange,
        'Na serveru není nastavený GEMINI_API_KEY (Vercel → Settings → Environment Variables → Redeploy). Níže jsou zobrazeny doporučené české archivy z interní databáze.'
      ),
      isFallback: true,
    };
  }

  const ai = getGeminiClient();

  const systemInstruction = `Jsi zkušený český rodopisec a archivní poradce. Pomáháš badatelům hledat v českých a moravských archivech (eBadatelna SOA Praha, ActaPublica MZA Brno, Portafontium, Třeboň, ARON Zámrsk, Litoměřice, Opava, AMP, FamilySearch, Národní archiv).
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
    const response = await withTimeout(
      callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          }
        })
      ),
      25000
    );
    return { success: true, advice: response.text };
  } catch (aiErr: any) {
    if (isRateLimitError(aiErr) || isMissingApiKeyError(aiErr) || isTimeoutError(aiErr)) {
      const reason = isMissingApiKeyError(aiErr)
        ? 'Na serveru není nastavený platný GEMINI_API_KEY (Vercel → Settings → Environment Variables → Redeploy). Níže jsou doporučené archivy z interní databáze.'
        : isTimeoutError(aiErr)
          ? 'AI poradce neodpověděl v časovém limitu. Níže jsou zobrazeny doporučené české archivy a sčítací operáty z interní databáze.'
          : undefined;
      return {
        success: true,
        advice: buildAdvisorFallback(personName, parishOrPlace, yearRange, reason),
        isFallback: true,
      };
    }
    throw aiErr;
  }
}

function buildAiSearchFallbackResponse(
  personName: string,
  maidenName: string,
  birthYear: string,
  location: string,
  eventType: string,
  notice: string
) {
  const archive = determineArchiveByLocation(location);
  const fallbackText = `### 🏛️ Archivní rešerše pro osobu: **${personName || 'Hledaný předek'}** ${maidenName ? `(roz. ${maidenName})` : ''}

**Hledaná lokalita:** ${location || 'Česká republika'}  
**Časové období:** okolo roku ${birthYear || 'neuvedeno'}  
**Hledaná událost:** ${eventType || 'Narození/křest'}  

---

#### 1. Příslušný archiv, farní správa a sčítací operáty:
- **Matriky:** [${archive.archiveName}](${archive.webUrl})
- **Sčítací operáty (1857–1921):** [${archive.censusName}](${archive.censusUrl})
- **Otevřít badatelnu:** [Přejít do archivu pro „${location || 'Česká republika'}“](${archive.searchUrl})
- **Specifikum archivního fondu:** ${archive.tips}

#### 2. Doporučené knihy a postup bádání (matriky i sčítání lidu):
1. **Sčítací operáty (1869, 1880, 1890, 1900, 1910, 1921):** Vyhledejte příslušný politický okres, obec a číslo popisné (č.p.). Získáte přehled všech osob žijících v domácnosti, jejich přesná data narození, rodiště a povolání.
2. **Rejstříky (Indexy N / O / Z):** Většina digitalizovaných matrik má abecední index podle příjmení. Prohledejte rejstřík pro roky ${birthYear ? `${Number(birthYear) - 5} až ${Number(birthYear) + 5}` : 'daného období'}.
3. **Číslo popisné (č.p.):** Zapište si číslo domu. Všechny další děti téže rodiny i záznamy ve sčítacích operátech bývají vedeny pod stejným číslem domu.
4. **Sňatek rodičů:** Svatba se v 95 % případů odehrávala v rodné vsi a farnosti **nevěsty** (matky), obvykle 1 až 4 roky před narozením nejstaršího potomka.

#### 3. Přehled oficiálních portálů pro matriky i sčítací operáty ČR:
- [eBadatelna SOA v Praze](https://ebadatelna.soapraha.cz) – Střední Čechy (matriky i sčítací operáty)
- [Sčítací operáty MZA Brno](https://www.mza.cz/scitacioperaty/) & [ActaPublica MZA Brno](https://www.mza.cz/actapublica/matrika/hledani) – Morava a část Vysočiny
- [Portafontium – Sčítání lidu](https://www.portafontium.eu/searching/census) & [Matriky](https://www.portafontium.eu/searching/register) – Západní Čechy
- [DigiArchiv SOA v Třeboni](https://digi.ceskearchivy.cz) – Jižní Čechy (matriky, sčítání lidu, soupisy poddaných)
- [ARON Východočeské archivy](https://aron.vychodoceskearchivy.cz) – Hradec Králové, Pardubice, Zámrsk
- [Digitální badatelna Litoměřice](https://digi.soalitomerice.cz) – Severní Čechy (matriky a sčítání lidu)
- [Digitální archiv ZA Opava](https://digi.archives.cz) – Slezsko a severní Morava (matriky a sčítání lidu)
- [Archiv hl. m. Prahy](https://katalog.ahmp.cz/pragapublica/) – Pražské matriky, sčítání lidu (1869–1921) a policejní přihlášky`;

  const uniqueSources = [
    { title: archive.archiveName, url: archive.searchUrl },
    { title: archive.censusName, url: archive.censusUrl },
    ...(archive.webUrl !== archive.searchUrl ? [{ title: 'Hlavní portál archivu', url: archive.webUrl }] : []),
    { title: 'Sčítací operáty MZA Brno', url: 'https://www.mza.cz/scitacioperaty/' },
    { title: 'eBadatelna SOA Praha', url: 'https://ebadatelna.soapraha.cz' }
  ].filter((item, idx, arr) => arr.findIndex(x => x.url === item.url) === idx);

  return {
    success: true,
    resultText: fallbackText,
    sources: uniqueSources,
    isFallback: true,
    notice,
  };
}

export async function runAiSearch(body: any) {
  const { personName, maidenName, birthYear, location, eventType } = body || {};

  if (!getConfiguredApiKey()) {
    return buildAiSearchFallbackResponse(
      personName,
      maidenName,
      birthYear,
      location,
      eventType,
      'Na serveru není nastavený GEMINI_API_KEY (Vercel → Settings → Environment Variables → Redeploy). Byly načteny přímé odkazy z interní databáze českých archivů.'
    );
  }

  const ai = getGeminiClient();

  const isCensusSearch = String(eventType || '').toLowerCase().includes('sčítac');

  const systemInstruction = isCensusSearch
    ? `Jsi přední český genealogický rešeršér a archivář specializovaný na digitalizované sčítací operáty a sčítání lidu (1857, 1869, 1880, 1890, 1900, 1910, 1921) v archivech ČR (mza.cz/scitacioperaty, Portafontium searching/census, eBadatelna SOA Praha, DigiArchiv Třeboň, ARON Zámrsk, SOA Litoměřice, ZA Opava, AHMP PragaPublica, FamilySearch).
Tvým úkolem je provést pro badatele cílenou rešerši sčítacích operátů:
1. Urči přesný archivní portál, historický politický a soudní okres pro zadanou obec.
2. Vyhledej dostupné ročníky sčítacích operátů (1857–1921), konkrétní fond, inv. č., karton nebo číslo snímku/strany, pokud jsou indexované online.
3. Připrav jasný strukturovaný výstup:
   - Příslušný online archiv pro sčítání lidu a politický/soudní okres
   - Konkrétní ročníky sčítání, fondy / signatury a případná čísla snímků nebo stran
   - Přímé ověřené odkazy (VÝHRADNĚ funkční oficiální URL: https://ebadatelna.soapraha.cz, https://www.mza.cz/scitacioperaty/, https://www.portafontium.eu/searching/census, https://digi.ceskearchivy.cz, https://aron.vychodoceskearchivy.cz, https://digi.soalitomerice.cz, https://digi.archives.cz, https://katalog.ahmp.cz/pragapublica/, případně konkrétní URL nalezené přes Google Search).
   - Praktický postup vyhledání podle obce a čísla popisného (č.p.).`
    : `Jsi přední český genealogický rešeršér a archivář specializovaný na online matriky České republiky (eBadatelna SOA Praha, ActaPublica MZA Brno, Portafontium SOA Plzeň, DigiArchiv Třeboň, ARON Zámrsk, Digitální badatelna Litoměřice, Digitální archiv Opava, Archiv hl. m. Prahy a FamilySearch).
Tvým úkolem je najít pro badatele KONKRÉTNÍ matriční knihu a KONKRÉTNÍ stránku / folio / snímek / indexovaný zápis dané osoby:
1. Aktivně pomocí Google Search prohledej online indexy, katalogy archivů a přepisy (FamilySearch, ActaPublica, Portafontium, DigiArchiv Třeboň, eBadatelna SOA Praha, ARON Zámrsk, Litoměřice, Opava, AHMP, Geni, Rodokmeny) pro zadané jméno, rok a obec.
2. Urči přesný státní oblastní archiv, příslušný římskokatolický (příp. evangelický/civilní) farní úřad (farnost), pod který obec v daném roce spadala.
3. Uveď KONKRÉTNÍ matriční knihu (signaturu / inv. č., např. „sign. Nelahozeves 04“, časový rozsah knihy, obsah obcí) a pokud se podaří dohledat konkrétní zápis online, VŽDY výslovně uveď:
   - přesné číslo stránky / folia / snímku / matričního zápisu
   - přesné datum narození/křtu, sňatku či úmrtí
   - číslo domu (č.p.) a jména rodičů / svědků z indexu.
   Pokud přesná stránka není veřejně indexována online, uveď přesnou knihu (signaturu + roky) a jak v ní pomocí indexu či chronologického řazení stránku rychle nalistovat.
4. Používej VÝHRADNĚ ověřené přímé odkazy z vyhledávání nebo oficiální URL archivů (https://ebadatelna.soapraha.cz, https://www.mza.cz/actapublica/matrika/hledani, https://www.portafontium.eu/searching/register, https://digi.ceskearchivy.cz, https://aron.vychodoceskearchivy.cz, https://digi.soalitomerice.cz, https://digi.archives.cz, https://katalog.ahmp.cz/pragapublica/ — NIKDY nepoužívej zastaralou doménu actapublica.eu ani vymyšlené sub-URL končící 404).`;

  const prompt = isCensusSearch
    ? `Vyhledej sčítací operáty (sčítání lidu 1857–1921) pro osobu a obec:
Jméno a příjmení: ${personName || ''} ${maidenName ? `(roz. ${maidenName})` : ''}
Období / rok: ${birthYear || '1857–1921'}
Obec / lokalita: ${location || 'Česká republika'}

Najdi příslušný archivní portál pro sčítací operáty, historický politický/soudní okres, dostupné ročníky sčítání, fondy/signatury a pokud jsou indexovány online, tak konkrétní snímky nebo strany.`
    : `Vyhledej v online matrikách a genealogických indexech konkrétní matriční knihu (signaturu) a stránku / folio / snímek pro tento záznam:
Jméno a příjmení: ${personName || ''} ${maidenName ? `(roz. ${maidenName})` : ''}
Událost: ${eventType || 'Narození/křest'}
Přibližný rok / datum: ${birthYear || 'neuvedeno'}
Obec / farnost: ${location || 'Česká republika'}

Zaměř se na:
1. Příslušnou farnost a oblastní archiv.
2. Konkrétní matriční knihu (signatura / inv. č. a rozsah let pro danou událost).
3. Konkrétní stránku, folio, číslo snímku nebo indexovaný matriční zápis, pokud je v online indexech (FamilySearch, archivy ČR) dohledatelný.`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [{ googleSearch: {} }],
        }
      }),
      22000
    );

    const webSources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .map((chunk: any) => ({
        title: chunk.web?.title || 'Archivní pramen',
        url: chunk.web?.uri || ''
      }))
      .filter((s: any) => Boolean(s.url));

    return {
      success: true,
      resultText: response.text,
      sources: webSources
    };
  } catch (primaryErr: any) {
    console.warn('[ai-search] primary Google Search call failed:', primaryErr?.status || '', primaryErr?.message || primaryErr);
    if (isMissingApiKeyError(primaryErr)) {
      return buildAiSearchFallbackResponse(
        personName,
        maidenName,
        birthYear,
        location,
        eventType,
        'Na serveru není nastavený platný GEMINI_API_KEY (Vercel → Settings → Environment Variables → Redeploy). Byly načteny přímé odkazy z interní databáze českých archivů.'
      );
    }

    if (isRateLimitError(primaryErr) || isTimeoutError(primaryErr)) {
      try {
        const textOnlyResponse = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            }
          }),
          10000
        );

        const archive = determineArchiveByLocation(location);
        return {
          success: true,
          resultText: textOnlyResponse.text,
          sources: [
            { title: archive.archiveName, url: archive.searchUrl },
            ...(isCensusSearch ? [{ title: archive.censusName, url: archive.censusUrl }] : []),
            ...(archive.webUrl !== archive.searchUrl ? [{ title: 'Hlavní portál archivu', url: archive.webUrl }] : [])
          ],
          notice: 'Rešerše byla vygenerována přímo AI modelem bez živého Google Search indexu (externí vyhledávání bylo dočasně zpomalené nebo v limitu). Konkrétní číslo stránky/snímku ověřte v uvedené knize.'
        };
      } catch (secondaryErr: any) {
        console.warn('[ai-search] secondary text fallback failed:', secondaryErr?.status || '', secondaryErr?.message || secondaryErr);
        return buildAiSearchFallbackResponse(
          personName,
          maidenName,
          birthYear,
          location,
          eventType,
          isTimeoutError(primaryErr)
            ? 'Vyhledávání AI na externím serveru trvalo příliš dlouho, proto byly zobrazeny ověřené přímé odkazy z interní databáze českých archivů.'
            : 'Rešerše byla sestavena z interní databáze českých archivů a matrik (minutová kvóta Gemini API byla dočasně vyčerpána – zkuste prosím vyhledání zopakovat za 30–60 s).'
        );
      }
    }
    throw primaryErr;
  }
}
