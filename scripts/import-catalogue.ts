import fs from "node:fs";

type Article = {
  id: number;
  nom: string;
  categorie: string;
  avecQuantite: boolean;
};

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  return rows;
}

function categoriePour(nom: string, categorieShopify: string) {
  const texte = `${nom} ${categorieShopify}`.toLowerCase();
  if (/vaporisateur|spray|sprayeur|atomiseur/.test(texte)) return "Vaporisateurs";
  if (/capuchon|bouchon|couvercle|capsule/.test(texte)) return "Capuchons / Bouchons";
  if (/flacon|bouteille/.test(texte)) return "Flacons";
  if (/alcool|matière première|matiere premiere|absolu|solvant/.test(texte)) return "Matières premières";
  if (/parfum|eau de|huile|fragrance/.test(texte)) return "Huiles de parfum";
  return "Huiles de parfum";
}

const source = fs.readFileSync("data/produits.csv", "utf8");
const rows = parseCsv(source);
const headers = rows.shift() ?? [];
const column = (name: string) => headers.indexOf(name);
const titleColumn = column("Title");
const handleColumn = column("Handle");
const categoryColumn = column("Product Category");
const articles: Article[] = [];
const seen = new Set<string>();

for (const row of rows) {
  const titre = (row[titleColumn] ?? "").trim();
  const handle = (row[handleColumn] ?? "").trim();
  if (!titre || !handle) continue;

  const nom = titre;
  const cle = handle.toLowerCase();
  if (seen.has(cle)) continue;
  seen.add(cle);

  const categorie = categoriePour(titre, row[categoryColumn] ?? "");
  const avecQuantite = categorie !== "Huiles de parfum" && categorie !== "Matières premières";
  articles.push({
    id: articles.length + 1,
    nom,
    categorie,
    avecQuantite,
  });
}

fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/catalogue.json", `${JSON.stringify(articles, null, 2)}\n`);
console.log(`${articles.length} articles uniques ont été générés.`);
