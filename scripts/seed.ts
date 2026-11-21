import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import catalogue from "../src/data/catalogue.json";
import dotenv from "dotenv";
import WebSocket from "ws";

dotenv.config({ path: ".env.local" });
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configurez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");

const supabase = createClient(url, key);

async function seed() {
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword) throw new Error("Définissez SEED_PASSWORD avant d’exécuter le seed.");
  const shops = ["Kram", "Rue des Salines", "Djerba"];
  for (const name of shops) {
    const { data, error } = await supabase.from("shops").upsert({ name }, { onConflict: "name" }).select("id").single();
    if (error) throw new Error(`Création de la boutique ${name} impossible : ${error.message}`);
    if (!data) throw new Error(`La boutique ${name} n’a pas été créée.`);
    const { data: existingProfile, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("login", name)
      .maybeSingle();
    if (lookupError) throw new Error(`Recherche du compte ${name} impossible : ${lookupError.message}`);
    const profileValues = { shop_id: data.id, role: "shop" as const, display_name: name };
    const profileResult = existingProfile
      ? await supabase.from("profiles").update(profileValues).eq("id", existingProfile.id)
      : await supabase.from("profiles").insert({
          ...profileValues,
          login: name,
          password_hash: await bcrypt.hash(seedPassword, 12),
        });
    const profileError = profileResult.error;
    if (profileError) throw new Error(`Création du compte ${name} impossible : ${profileError.message}`);
  }

  const { data: existingDepot, error: depotLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("login", "depot")
    .maybeSingle();
  if (depotLookupError) throw new Error(`Recherche du compte dépôt impossible : ${depotLookupError.message}`);
  const depotValues = { role: "depot" as const, shop_id: null, display_name: "Dépôt central" };
  const depotResult = existingDepot
    ? await supabase.from("profiles").update(depotValues).eq("id", existingDepot.id)
    : await supabase.from("profiles").insert({
        ...depotValues,
        login: "depot",
        password_hash: await bcrypt.hash(seedPassword, 12),
      });
  const adminError = depotResult.error;
  if (adminError) throw new Error(`Création du compte dépôt impossible : ${adminError.message}`);

  const categories = ["Huiles de parfum", "Matières premières", "Flacons", "Vaporisateurs", "Capuchons / Bouchons", "Autres"];
  for (let position = 0; position < categories.length; position++) {
    const { error } = await supabase.from("catalog_categories").upsert({ name: categories[position], position, active: true }, { onConflict: "name" });
    if (error) throw new Error(`Création de la catégorie ${categories[position]} impossible : ${error.message}`);
  }
  for (const article of catalogue) {
    const { data: category } = await supabase
      .from("catalog_categories")
      .select("id")
      .eq("name", article.categorie)
      .single();
    if (!category) throw new Error(`Catégorie introuvable pour l’article ${article.nom}.`);
    const { error } = await supabase.from("catalog_items").upsert(
      {
        category_id: category.id,
        name: article.nom,
        unit: article.avecQuantite ? "unités" : "sélection",
        active: true,
        position: article.id,
      },
      { onConflict: "name" }
    );
    if (error) throw new Error(`Import de l’article ${article.nom} impossible : ${error.message}`);
  }
  console.log("Boutiques, comptes administrateur et catégories créés.");
  console.log(`${catalogue.length} articles du CSV ont été ajoutés au catalogue.`);
}

seed().catch((error) => { console.error(error); process.exit(1); });
