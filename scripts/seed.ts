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
    const { data } = await supabase.from("shops").upsert({ name }, { onConflict: "name" }).select("id").single();
    if (data) {
      await supabase.from("profiles").upsert({
        shop_id: data.id,
        role: "shop",
        login: name,
        password_hash: await bcrypt.hash(seedPassword, 12),
        display_name: name,
      }, { onConflict: "login" });
    }
  }

  await supabase.from("profiles").upsert({
    role: "depot",
    login: "depot",
    password_hash: await bcrypt.hash(seedPassword, 12),
    display_name: "Dépôt central",
  }, { onConflict: "login" });

  const categories = ["Huiles de parfum", "Matières premières", "Flacons", "Vaporisateurs", "Capuchons / Bouchons", "Autres"];
  for (let position = 0; position < categories.length; position++) {
    await supabase.from("catalog_categories").upsert({ name: categories[position], position, active: true }, { onConflict: "name" });
  }
  for (const article of catalogue) {
    const { data: category } = await supabase
      .from("catalog_categories")
      .select("id")
      .eq("name", article.categorie)
      .single();
    if (category) {
      await supabase.from("catalog_items").upsert(
        {
          category_id: category.id,
          name: article.nom,
          unit: article.avecQuantite ? "unités" : "sélection",
          active: true,
          position: article.id,
        },
        { onConflict: "name" }
      );
    }
  }
  console.log("Boutiques, comptes administrateur et catégories créés.");
  console.log(`${catalogue.length} articles du CSV ont été ajoutés au catalogue.`);
}

seed().catch((error) => { console.error(error); process.exit(1); });
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
