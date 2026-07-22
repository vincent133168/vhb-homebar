import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = new URL("../", import.meta.url);
const outputDirectory = new URL("../public/cocktails/", import.meta.url);
const datasetUrl = "https://www.kaggle.com/api/v1/datasets/download/pxxthik/the-cocktail-db-recipe-collection";
const datasetPage = "https://www.kaggle.com/datasets/pxxthik/the-cocktail-db-recipe-collection";

const sourceAliases = {
  "classic-brandy-crusta": "Sidecar",
  "classic-hanky-panky": "Negroni",
  "classic-last-word": "Aviation",
  "classic-martinez": "Martinez Cocktail",
  "classic-ramos-fizz": "Ramos Gin Fizz",
  "classic-tuxedo": "Tuxedo Cocktail",
  "classic-cardinale": "Negroni",
  "classic-corpse-reviver-2": "Corpse Reviver",
  "classic-garibaldi": "Garibaldi Negroni",
  "classic-canchanchara": "Daiquiri",
  "classic-dark-stormy": "Cuba Libre",
  "classic-illegal": "Margarita",
  "classic-lemon-drop": "Lemon Drop",
  "classic-paper-plane": "Whiskey Sour",
  "classic-trinidad-sour": "Whiskey Sour",
  "classic-southside": "Mojito",
  "classic-jungle-bird": "Mai Tai",
  "classic-naked-famous": "Margarita",
  "classic-blood-sand": "Manhattan",
  "classic-bobby-burns": "Bobby Burns Cocktail",
  "classic-rob-roy": "Manhattan",
  "classic-el-presidente": "Daiquiri",
  "classic-painkiller": "Pina Colada",
  "classic-corpse-reviver-1": "Corpse Reviver",
  "classic-ve-n-to": "Pisco Sour",
  "classic-remember-maine": "Manhattan",
  "classic-three-dots-dash": "Mai Tai",
  "classic-sherry-cobbler": "Sherry Flip",
  "classic-suffering-bastard": "Horse's Neck",
  "classic-rabo-de-galo": "Negroni",
  "classic-grand-margarita": "Margarita",
  "topbar-leone-roma": "Negroni",
  "topbar-leone-limonata": "Gin Fizz",
  "topbar-handshake-peanut": "Whiskey Sour",
  "topbar-handshake-pina": "Pina Colada",
  "topbar-sips-citrus": "Gin Fizz",
  "topbar-sips-corn": "Old Fashioned",
  "topbar-paradiso-cosmic": "Clover Club",
  "topbar-paradiso-volcano": "Pina Colada",
  "topbar-tayer-coldbrew": "Espresso Martini",
  "topbar-tayer-rhubarb": "Gin Fizz",
  "topbar-connaught-martini": "Dry Martini",
  "topbar-connaught-bergamot": "French 75",
  "topbar-moebius-tomato": "Negroni",
  "topbar-moebius-fig": "Whiskey Sour",
  "topbar-line-bread": "Old Fashioned",
  "topbar-line-ferment": "Cosmopolitan",
  "topbar-jigger-pony": "Dry Martini",
  "topbar-jigger-tea": "Mai Tai",
  "topbar-tres-monos-mate": "Horse's Neck",
  "topbar-tres-monos-plum": "Whiskey Sour",
};

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  return rows;
}

function normalize(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function catalogRows(source) {
  const topBarStart = source.indexOf("const topBarRows");
  return [...source.matchAll(/^\s*\["([^"]+)","([^"]+)","([^"]+)"/gm)].map((match) => {
    const category = match.index > topBarStart ? "topbar" : "classic";
    return { id: `${category}-${match[1]}`, name: match[2], englishName: match[3], category };
  });
}

async function downloadImage(url, attempt = 1) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "VHBHomebar/1.0 image library" }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (!type.startsWith("image/")) throw new Error(`Unexpected content type ${type}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (attempt < 3) return downloadImage(url, attempt + 1);
    throw error;
  }
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "vhb-cocktail-images-"));
try {
  const archivePath = join(temporaryDirectory, "cocktails.zip");
  execFileSync("curl", ["-L", "-sS", "--max-time", "90", datasetUrl, "-o", archivePath]);
  execFileSync("unzip", ["-q", archivePath, "-d", temporaryDirectory]);

  const [catalogSource, drinksSource] = await Promise.all([
    readFile(new URL("../db/catalog.ts", import.meta.url), "utf8"),
    readFile(join(temporaryDirectory, "drinks.csv"), "utf8"),
  ]);
  const catalog = catalogRows(catalogSource);
  if (catalog.length !== 121) throw new Error(`Expected 121 catalog drinks, found ${catalog.length}`);

  const drinks = parseCsv(drinksSource).slice(1).map((row) => ({ name: row[1], page: row[2], imageUrl: row[3] })).filter((drink) => drink.name && drink.imageUrl);
  const drinkByName = new Map(drinks.map((drink) => [normalize(drink.name), drink]));
  const selections = catalog.map((cocktail) => {
    const sourceName = sourceAliases[cocktail.id] || cocktail.englishName;
    const source = drinkByName.get(normalize(sourceName));
    if (!source) throw new Error(`No source image for ${cocktail.id} via ${sourceName}`);
    return { ...cocktail, sourceName, source };
  });

  await mkdir(outputDirectory, { recursive: true });
  const imagePromises = new Map();
  for (const selection of selections) {
    if (!imagePromises.has(selection.source.imageUrl)) imagePromises.set(selection.source.imageUrl, downloadImage(selection.source.imageUrl));
  }
  const downloaded = new Map();
  const entries = [...imagePromises.entries()];
  let cursor = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < entries.length) {
      const [url, promise] = entries[cursor++];
      downloaded.set(url, await promise);
    }
  }));

  await Promise.all(selections.map((selection) => writeFile(new URL(`../public/cocktails/${selection.id}.jpg`, import.meta.url), downloaded.get(selection.source.imageUrl))));
  const attribution = selections.map((selection) => ({
    id: selection.id,
    cocktail: selection.englishName,
    matchedImage: selection.source.name,
    exactNameMatch: normalize(selection.englishName) === normalize(selection.source.name),
    imageUrl: selection.source.imageUrl,
    sourcePage: `https://www.thecocktaildb.com${selection.source.page}`,
    dataset: datasetPage,
    datasetLicense: "CC0: Public Domain (as listed by the dataset publisher)",
  }));
  await writeFile(new URL("../public/cocktails/attribution.json", import.meta.url), `${JSON.stringify(attribution, null, 2)}\n`);

  const exact = attribution.filter((item) => item.exactNameMatch).length;
  console.log(`Saved ${attribution.length} cocktail images (${exact} exact-name, ${attribution.length - exact} recipe-family matches).`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
