import { CzechArchivePortal } from '../types/genealogy';

export const CZECH_ARCHIVE_PORTALS: CzechArchivePortal[] = [
  {
    id: 'soapraha',
    name: 'eBadatelna SOA v Praze',
    region: 'Středočeský kraj (Střední Čechy)',
    coverage: 'Nelahozeves, Kralupy nad Vltavou, Slaný, Kladno, Mělník, Rakovník, Beroun, Benešov, Příbram, Kolín, Kutná Hora, Nymburk, Mladá Boleslav, Praha-východ, Praha-západ',
    webUrl: 'https://ebadatelna.soapraha.cz',
    searchUrlTemplate: 'https://ebadatelna.soapraha.cz',
    description: 'Digitální badatelna Státního oblastního archivu v Praze. Obsahuje kompletní digitalizované matriky Středočeského kraje (okresy kolem Prahy).',
    tips: 'Na úvodní stránce zvolte „Matriky“ a vyhledejte příslušnou farnost (např. pro Nelahozeves, Slaný, Kladno nebo Mělník).',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    category: 'matriky'
  },
  {
    id: 'actapublica',
    name: 'ActaPublica (MZA Brno)',
    region: 'Jihomoravský, Zlínský kraj a Vysočina',
    coverage: 'Brno, Blansko, Břeclav, Hodonín, Vyškov, Znojmo, Jihlava, Třebíč, Žďár nad Sázavou, Pelhřimov, Uherské Hradiště, Zlín, Kroměříž',
    webUrl: 'https://www.mza.cz/actapublica/matrika/hledani',
    searchUrlTemplate: 'https://www.mza.cz/actapublica/matrika/hledani',
    description: 'Archivní portál Moravského zemského archivu v Brně. Obsahuje digitalizované matriky pro jižní a střední Moravu i část Vysočiny.',
    tips: 'Ve vyhledávači zadejte název obce nebo farnosti. Každá matriční kniha i snímek má trvalý odkaz (permalink).',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    category: 'matriky'
  },
  {
    id: 'portafontium',
    name: 'Portafontium (SOA v Plzni)',
    region: 'Plzeňský a Karlovarský kraj',
    coverage: 'Plzeň, Klatovy, Domažlice, Tachov, Rokycany, Karlovy Vary, Sokolov, Cheb, Sušice, Stříbro + bavorské pohraničí',
    webUrl: 'https://www.portafontium.eu',
    searchUrlTemplate: 'https://www.portafontium.eu/searching/register',
    description: 'Bavorsko-česká digitalizovaná síť. Vynikající rozlišení skenů matrik západních Čech a historických listin.',
    tips: 'V sekci Matriky hledejte podle pole „Místo“ (fungují české i historické německé názvy obcí, např. Plzeň / Pilsen, Klatovy / Klattau).',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    category: 'matriky'
  },
  {
    id: 'trebon',
    name: 'DigiArchiv SOA v Třeboni',
    region: 'Jihočeský kraj',
    coverage: 'České Budějovice, Český Krumlov, Jindřichův Hradec, Písek, Prachatice, Strakonice, Tábor, Třeboň, Pelhřimov',
    webUrl: 'https://digi.ceskearchivy.cz',
    searchUrlTemplate: 'https://digi.ceskearchivy.cz',
    description: 'Digitální archiv SOA v Třeboni. Obsahuje matriky, soupisy poddaných, urbáře i sčítací operáty jižních Čech.',
    tips: 'V levém stromovém menu otevřete „Matriky“ → „Římskokatolická církev“ a zadejte obec. Nezapomeňte i na soupisy poddaných.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    category: 'matriky'
  },
  {
    id: 'zamrsk',
    name: 'ARON – SOA v Hradci Králové (Zámrsk)',
    region: 'Královéhradecký a Pardubický kraj',
    coverage: 'Hradec Králové, Pardubice, Chrudim, Jičín, Náchod, Rychnov nad Kněžnou, Svitavy, Trutnov, Ústí nad Orlicí, Zámrsk, Litomyšl, Polička',
    webUrl: 'https://aron.vychodoceskearchivy.cz',
    searchUrlTemplate: 'https://aron.vychodoceskearchivy.cz/apu?q={query}',
    description: 'Východočeské archivy (bývalý Zámrsk). Pokrývá kompletní digitalizované matriky východních Čech v systému ARON.',
    tips: 'Vyhledávat můžete přímo přes ARON podle názvu farnosti nebo obce (lze filtrovat pouze fondy matrik).',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    category: 'matriky'
  },
  {
    id: 'litomerice',
    name: 'Digitální badatelna SOA v Litoměřicích',
    region: 'Ústecký a Liberecký kraj',
    coverage: 'Litoměřice, Ústí nad Labem, Děčín, Teplice, Most, Chomutov, Louny, Liberec, Jablonec nad Nisou, Česká Lípa, Semily, Žatec',
    webUrl: 'https://digi.soalitomerice.cz',
    searchUrlTemplate: 'https://digi.soalitomerice.cz',
    description: 'Nový archivní portál pro severní Čechy (nahradil starší Vademecum). Mnoho záznamů pohraničí je v německém kurentu.',
    tips: 'Vyhledávejte podle českých i historických německých názvů obcí (např. Aussig, Brüx, Reichenberg).',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    category: 'matriky'
  },
  {
    id: 'opava',
    name: 'Digitální archiv ZA v Opavě',
    region: 'Moravskoslezský a Olomoucký kraj',
    coverage: 'Opava, Ostrava, Olomouc, Bruntál, Frýdek-Místek, Karviná, Nový Jičín, Přerov, Prostějov, Šumperk, Jeseník, Těšín',
    webUrl: 'https://digi.archives.cz',
    searchUrlTemplate: 'https://digi.archives.cz',
    description: 'Digitalizované matriční fondy pro Slezsko, Ostravsko a severní/střední Moravu.',
    tips: 'V matrikách naleznete kromě katolických i četné evangelické matriky a záznamy těšínského Slezska.',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    category: 'matriky'
  },
  {
    id: 'amp',
    name: 'Archivní katalog Archivu hl. m. Prahy',
    region: 'Hlavní město Praha',
    coverage: 'Praha, Staré Město, Nové Město, Malá Strana, Hradčany, Vyšehrad, Smíchov, Vinohrady, Karlín, Žižkov, Holešovice, Libeň, Dejvice, Nusle',
    webUrl: 'https://katalog.ahmp.cz/pragapublica/',
    searchUrlTemplate: 'https://katalog.ahmp.cz/pragapublica/',
    description: 'Kompletní matriky historických pražských farností a digitalizované Policejní přihlášky k pobytu (1850–1914).',
    tips: 'Pro hledání v Praze doporučujeme i „Soupis pražského obyvatelstva“ a Policejní přihlášky, kde jsou uvedena data narození i původ z venkova.',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    category: 'matriky'
  },
  {
    id: 'familysearch',
    name: 'FamilySearch (Česká republika)',
    region: 'Celá Česká republika & Svět',
    coverage: 'Celosvětová databáze církevních a civilních matrik, indexovaná jména z českých a moravských matrik',
    webUrl: 'https://www.familysearch.org/cs/search/collection/1804263',
    searchUrlTemplate: 'https://www.familysearch.org/cs/search/record/results?q.anyPlace={query}',
    description: 'Mezinárodní genealogická databáze (vyžaduje bezplatné přihlášení). Řada českých matrik je zde strojově i ručně indexovaná podle jmen.',
    tips: 'Po bezplatném přihlášení můžete prohledávat přímo podle jména a příjmení předka.',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    category: 'matriky'
  },
  {
    id: 'zidovske',
    name: 'Národní archiv – Židovské matriky',
    region: 'Židovské náboženské obce v ČR',
    coverage: 'Historické židovské matriky z Čech, Moravy a Slezska (fond HBF)',
    webUrl: 'https://vademecum.nacr.cz/vademecum/',
    searchUrlTemplate: 'https://vademecum.nacr.cz/vademecum/',
    description: 'Digitalizované matriky Židovských náboženských obcí v Českých zemích do roku 1949.',
    tips: 'Obsahuje matriky narozených, obřízek, sňatků i úmrtí židovských obcí.',
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300',
    category: 'matriky'
  },
  {
    id: 'mza-scitani',
    name: 'Sčítací operáty – MZA Brno (Morava)',
    region: 'Sčítání lidu • Morava a část Vysočiny',
    coverage: 'Sčítací operáty, sčítání lidu 1857, 1869, 1880, 1890, 1900, 1910, 1921, Brno, Blansko, Břeclav, Hodonín, Jihlava, Kroměříž, Třebíč, Uherské Hradiště, Vyškov, Zlín, Znojmo, Žďár nad Sázavou',
    webUrl: 'https://www.mza.cz/scitacioperaty/',
    searchUrlTemplate: 'https://www.mza.cz/scitacioperaty/',
    description: 'Samostatný portál Moravského zemského archivu v Brně pro digitalizované sčítací operáty (1857–1921) podle politických okresů, obcí a čísel popisných.',
    tips: 'Vyberte soudní/politický okres, obec a rok sčítání (např. 1921). V operátech jsou zapsáni všichni obyvatelé domu včetně dat a míst narození.',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    category: 'scitani'
  },
  {
    id: 'soapraha-scitani',
    name: 'Sčítací operáty – eBadatelna SOA Praha',
    region: 'Sčítání lidu • Střední Čechy',
    coverage: 'Sčítací operáty, sčítání lidu 1869–1921, Nelahozeves, Kralupy nad Vltavou, Mělník, Slaný, Kladno, Rakovník, Beroun, Benešov, Kolín, Kutná Hora, Nymburk, Mladá Boleslav, Příbram',
    webUrl: 'https://ebadatelna.soapraha.cz',
    searchUrlTemplate: 'https://ebadatelna.soapraha.cz',
    description: 'V sekci „Sčítací operáty“ na eBadatelně SOA Praha najdete digitalizované archy sčítání lidu středočeských politických okresů.',
    tips: 'Na úvodní stránce eBadatelny zvolte v horním/bočním menu „Sčítací operáty“ a filtrujte podle okresu, obce a roku sčítání.',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    category: 'scitani'
  },
  {
    id: 'portafontium-scitani',
    name: 'Sčítání lidu – Portafontium (Západní Čechy)',
    region: 'Sčítání lidu • Plzeňský a Karlovarský kraj',
    coverage: 'Sčítací operáty, sčítání lidu 1869–1921, Plzeň, Klatovy, Domažlice, Tachov, Rokycany, Karlovy Vary, Cheb, Sokolov, Sušice',
    webUrl: 'https://www.portafontium.eu/searching/census',
    searchUrlTemplate: 'https://www.portafontium.eu/searching/census',
    description: 'Rozsáhlá kolekce digitalizovaných sčítacích operátů (Census) pro západní Čechy v portálu Portafontium.',
    tips: 'Hledejte podle okresu a názvu obce (fungují české i německé historické názvy). Skvěle doplňuje matriky 19. a 20. století.',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    category: 'scitani'
  },
  {
    id: 'trebon-scitani',
    name: 'Sčítací operáty – DigiArchiv SOA Třeboň',
    region: 'Sčítání lidu • Jižní Čechy',
    coverage: 'Sčítací operáty, sčítání lidu 1869–1921, České Budějovice, Český Krumlov, Jindřichův Hradec, Písek, Prachatice, Strakonice, Tábor, Třeboň, Pelhřimov',
    webUrl: 'https://digi.ceskearchivy.cz',
    searchUrlTemplate: 'https://digi.ceskearchivy.cz',
    description: 'Digitální archiv SOA v Třeboni zpřístupňuje jak sčítací operáty (1869–1921), tak historické soupisy poddaných podle panství.',
    tips: 'V levém stromovém menu DigiArchivu otevřete kategorii „Sčítání lidu“ a zvolte příslušný okres a obec.',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    category: 'scitani'
  },
  {
    id: 'amp-scitani',
    name: 'Sčítání lidu & Přihlášky – AHMP Praha',
    region: 'Sčítání lidu • Hlavní město Praha',
    coverage: 'Sčítací operáty, sčítací archy 1869–1921, policejní přihlášky, Praha, Staré Město, Nové Město, Vinohrady, Žižkov, Smíchov, Karlín, Holešovice, Libeň, Dejvice, Nusle',
    webUrl: 'https://katalog.ahmp.cz/pragapublica/',
    searchUrlTemplate: 'https://katalog.ahmp.cz/pragapublica/',
    description: 'Pražské sčítací archy (1869–1921) řazené podle historických čtvrtí a čísel popisných (č.p.) včetně souběžných Policejních přihlášek.',
    tips: 'Vyhledávejte podle pražské čtvrti (např. Nové Město, Vinohrady) a čísla popisného domu (č.p.) z matrice nebo adresáře.',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    category: 'scitani'
  },
  {
    id: 'opava-scitani',
    name: 'Sčítací operáty – Digitální archiv ZA Opava',
    region: 'Sčítání lidu • Slezsko a Severní Morava',
    coverage: 'Sčítací operáty, sčítání lidu 1869–1921, Opava, Ostrava, Olomouc, Bruntál, Frýdek-Místek, Karviná, Nový Jičín, Přerov, Prostějov, Šumperk, Jeseník',
    webUrl: 'https://digi.archives.cz',
    searchUrlTemplate: 'https://digi.archives.cz',
    description: 'Digitalizované sčítací operáty okresních úřadů pro Slezsko, Ostravsko a střední/severní Moravu v archivu ZA Opava.',
    tips: 'V Digitálním archivu ZA Opava vyfiltrujte typ archiválie „Sčítání lidu“ a zadejte obec nebo politický okres.',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    category: 'scitani'
  },
  {
    id: 'litomerice-scitani',
    name: 'Sčítání lidu – Badatelna SOA Litoměřice',
    region: 'Sčítání lidu • Severní Čechy',
    coverage: 'Sčítací operáty, sčítání lidu 1869–1921, Litoměřice, Ústí nad Labem, Děčín, Teplice, Most, Chomutov, Louny, Liberec, Jablonec nad Nisou, Česká Lípa, Žatec',
    webUrl: 'https://digi.soalitomerice.cz',
    searchUrlTemplate: 'https://digi.soalitomerice.cz',
    description: 'Digitalizované sčítací operáty pro Ústecký a Liberecký kraj v nové Digitální badatelně SOA Litoměřice.',
    tips: 'Ve vyhledávání badatelny zvolte fond okresního úřadu nebo filtr „Sčítání lidu“ a hledejte obec česky či německy.',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    category: 'scitani'
  },
  {
    id: 'aron-scitani',
    name: 'Sčítání lidu – ARON Východočeské archivy',
    region: 'Sčítání lidu • Východní Čechy (HK / Pardubice)',
    coverage: 'Sčítací operáty, sčítání lidu 1869–1921, Hradec Králové, Pardubice, Chrudim, Jičín, Náchod, Rychnov nad Kněžnou, Svitavy, Trutnov, Ústí nad Orlicí, Litomyšl, Polička',
    webUrl: 'https://aron.vychodoceskearchivy.cz',
    searchUrlTemplate: 'https://aron.vychodoceskearchivy.cz/apu?q={query}',
    description: 'Archivní portál ARON sdružuje digitalizované sčítací operáty okresních úřadů Královéhradeckého a Pardubického kraje.',
    tips: 'Zadejte název obce a termín „sčítání lidu“ nebo filtrujte fondy okresních úřadů (např. Okresní úřad Chrudim / Hradec Králové).',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    category: 'scitani'
  }
];

function normalizeText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function findMatchingArchives(locationOrParish: string): CzechArchivePortal[] {
  if (!locationOrParish || locationOrParish.trim() === '') {
    return CZECH_ARCHIVE_PORTALS;
  }
  const term = normalizeText(locationOrParish);
  const directMatches = CZECH_ARCHIVE_PORTALS.filter(portal => {
    const haystack = normalizeText(
      `${portal.coverage} ${portal.region} ${portal.name} ${portal.description} ${portal.tips}`
    );
    return haystack.includes(term);
  });

  return directMatches;
}

export function buildArchiveSearchUrl(portal: CzechArchivePortal, query: string): string {
  if (!portal.searchUrlTemplate) {
    return portal.webUrl;
  }
  if (!portal.searchUrlTemplate.includes('{query}')) {
    return portal.searchUrlTemplate;
  }
  return portal.searchUrlTemplate.replace('{query}', encodeURIComponent(query.trim()));
}
