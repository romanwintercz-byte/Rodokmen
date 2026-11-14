import { CzechArchivePortal } from '../types/genealogy';

export const CZECH_ARCHIVE_PORTALS: CzechArchivePortal[] = [
  {
    id: 'actapublica',
    name: 'ActaPublica (SOA Praha & MZA Brno)',
    region: 'Střední Čechy, Jižní Morava, Vysočina',
    coverage: 'Praha-východ, Praha-západ, Benešov, Beroun, Kladno, Kolín, Kutná Hora, Mělník, Mladá Boleslav, Nymburk, Příbram, Rakovník + celá Morava (Brno, Jihlava, Znojmo, Třebíč, Žďár)',
    webUrl: 'https://www.actapublica.eu',
    searchUrlTemplate: 'https://actapublica.eu/matriky/brno/?akce=hledat&obec={query}',
    description: 'Největší archivní portál v ČR. Obsahuje digitalizované matriky Moravského zemského archivu v Brně a Státního oblastního archivu v Praze.',
    tips: 'Hledejte podle názvu farnosti nebo obce. Záznamy mají přímý trvalý odkaz (permalink) na konkrétní snímek.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    id: 'portafontium',
    name: 'Portafontium (SOA v Plzni)',
    region: 'Plzeňský a Karlovarský kraj',
    coverage: 'Plzeň, Klatovy, Domažlice, Tachov, Rokycany, Karlovy Vary, Sokolov, Cheb + bavorské pohraničí',
    webUrl: 'https://www.portafontium.eu',
    searchUrlTemplate: 'https://www.portafontium.eu/searching/register?search={query}',
    description: 'Bavorsko-česká digitalizovaná síť. Vynikající rozlišení skenů matrik západních Čech a listin.',
    tips: 'Umožňuje přímé vyhledávání podle německých i českých historických názvů obcí (např. Pilsen / Plzeň, Klattau / Klatovy).',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300'
  },
  {
    id: 'trebon',
    name: 'DigiArchiv SOA v Třeboni',
    region: 'Jihočeský kraj',
    coverage: 'České Budějovice, Český Krumlov, Jindřichův Hradec, Písek, Prachatice, Strakonice, Tábor',
    webUrl: 'https://digi.ceskearchivy.cz',
    searchUrlTemplate: 'https://digi.ceskearchivy.cz/search?q={query}',
    description: 'Jeden z nejstarších a nejlépe uspořádaných českých archivních systémů. Obsahuje matriky, urbáře i sčítací operáty.',
    tips: 'Kromě matrik obsahuje i velkolepé soupisy poddaných (tzv. rožmberské a schwarzenberské soupisy), které sahají až do 16. století.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  {
    id: 'zamrsk',
    name: 'SOA v Hradci Králové (Zámrsk)',
    region: 'Královéhradecký a Pardubický kraj',
    coverage: 'Hradec Králové, Pardubice, Chrudim, Jičín, Náchod, Rychnov nad Kněžnou, Svitavy, Trutnov, Ústí nad Orlicí',
    webUrl: 'https://vychodoceskearchivy.cz/zamrsk/matriky/',
    searchUrlTemplate: 'https://aron.vychodoceskearchivy.cz/apu?q={query}',
    description: 'Portál ARON a dřívější inventář Zámrsk. Pokrývá celou oblast východních Čech.',
    tips: 'Východočeské matriky jsou nyní dostupné jak přes portál ARON, tak přes přehledný rejstřík farností a signatur.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  {
    id: 'litomerice',
    name: 'Vademecum SOA v Litoměřicích',
    region: 'Ústecký a Liberecký kraj',
    coverage: 'Litoměřice, Ústí nad Labem, Děčín, Teplice, Most, Chomutov, Louny, Liberec, Jablonec nad Nisou, Česká Lípa, Semily',
    webUrl: 'https://vademecum.soalitomerice.cz',
    searchUrlTemplate: 'https://vademecum.soalitomerice.cz/vademecum/search?q={query}',
    description: 'Archivní aplikace Vademecum pro severní Čechy. Mnoho záznamů je v němčině (Sudety).',
    tips: 'Prohledávejte podle historických německých i českých názvů sídel.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  },
  {
    id: 'opava',
    name: 'Digiteka Zemského archivu v Opavě',
    region: 'Moravskoslezský a Olomoucký kraj',
    coverage: 'Opava, Ostrava, Olomouc, Bruntál, Frýdek-Místek, Karviná, Nový Jičín, Přerov, Prostějov, Šumperk, Jeseník',
    webUrl: 'https://digi.archives.cz',
    searchUrlTemplate: 'https://digi.archives.cz/matriky/search?query={query}',
    description: 'Digitalizované fondy pro Slezsko a severní Moravu. Velmi rychlý a přehledný prohlížeč snímků.',
    tips: 'V matrikách naleznete i záznamy těšínského Slezska s polskými vlivy a luterské evangelické matriky.',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300'
  },
  {
    id: 'amp',
    name: 'Archivní katalog Archivu hl. m. Prahy',
    region: 'Hlavní město Praha',
    coverage: 'Všechny historické pražské farnosti (Staré Město, Nové Město, Malá Strana, Hradčany, Vyšehrad, Smíchov, Vinohrady, Karlín, Žižkov...) + pražské policejní přihlášky (1850–1914)',
    webUrl: 'http://katalog.ahmp.cz',
    searchUrlTemplate: 'http://katalog.ahmp.cz/pragapublica/search?q={query}',
    description: 'Kompletní matriky pražských farností a neocenitelné Policejní přihlášky k pobytu (Konskripce) obyvatel Prahy.',
    tips: 'Policejní přihlášky obsahují přesná data narození všech dětí, změny adres po Praze a původ rodiny z venkova!',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  {
    id: 'familysearch',
    name: 'FamilySearch (ČR)',
    region: 'Celá Česká republika & Svět',
    coverage: 'Celosvětová databáze církevních a civilních matrik, včetně indexovaných jmen z českých zemí',
    webUrl: 'https://www.familysearch.org/search/collection/1804263',
    searchUrlTemplate: 'https://www.familysearch.org/search/record/results?q.anyPlace={query}&q.anyPlace.exact=on',
    description: 'Největší světová genealogická databáze spravovaná Genealogickou společností v Utahu. Mnoho českých matrik má strojově nebo dobrovolníky indexovaná jména.',
    tips: 'Zadejte přímo jméno a příjmení předka. Často vás odkáže na přesný zápis v české matrice.',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300'
  },
  {
    id: 'zidovske',
    name: 'Národní archiv - Židovské matriky',
    region: 'Židovské náboženské obce v ČR',
    coverage: 'Historické židovské matriky z Čech, Moravy a Slezska (fond HBF)',
    webUrl: 'https://vademecum.nacr.cz',
    description: 'Digitalizované matriky Židovských náboženských obcí v Českých zemích do roku 1949.',
    tips: 'Matriky narozených, obřízek, sňatků i úmrtí židovského obyvatelstva.',
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300'
  }
];

export function findMatchingArchives(locationOrParish: string): CzechArchivePortal[] {
  if (!locationOrParish || locationOrParish.trim() === '') {
    return CZECH_ARCHIVE_PORTALS;
  }
  const term = locationOrParish.toLowerCase().trim();
  return CZECH_ARCHIVE_PORTALS.filter(portal => 
    portal.coverage.toLowerCase().includes(term) ||
    portal.region.toLowerCase().includes(term) ||
    portal.name.toLowerCase().includes(term) ||
    portal.tips.toLowerCase().includes(term)
  );
}

export function buildArchiveSearchUrl(portal: CzechArchivePortal, query: string): string {
  if (!portal.searchUrlTemplate) {
    return portal.webUrl;
  }
  return portal.searchUrlTemplate.replace('{query}', encodeURIComponent(query.trim()));
}
