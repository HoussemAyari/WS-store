# WS Supply

Application Next.js App Router pour les approvisionnements quotidiens de Wael Scents Group.

## Installation locale

1. Installez Node.js 20 ou une version récente.
2. Copiez `.env.example` vers `.env.local`.
3. Créez un projet Supabase et renseignez ses clés.
4. Exécutez `supabase/migrations/001_initial.sql` dans l’éditeur SQL Supabase.
5. Lancez `npm install`.
6. Définissez `SEED_PASSWORD` dans votre environnement.
7. Lancez `npm run seed` pour créer les boutiques, les comptes initiaux, les catégories et les 445 articles du CSV.
8. Lancez `npm run dev`, puis ouvrez `http://localhost:3000`.

Les comptes initiaux sont `Kram`, `Rue des Salines`, `Djerba` et `depot`. Leur mot de passe de démonstration est défini par le script de seed et doit être changé dès la mise en production.

## Variables importantes

- `NEXT_PUBLIC_SUPABASE_URL` : URL Supabase publique.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique.
- `SUPABASE_SERVICE_ROLE_KEY` : clé réservée au serveur.
- `SESSION_SECRET` : secret fort pour les sessions.
- `NOTIFICATION_CHANNEL=email` : canal actuel des notifications.
- `NOTIFICATION_FROM`, `NOTIFICATION_TO_ADMIN` : adresses configurables.

Ne publiez jamais la clé de rôle de service dans une page, un composant ou une variable `NEXT_PUBLIC_*`.

## Déploiement

### Supabase

1. Créez le projet.
2. Exécutez la migration.
3. Configurez les sauvegardes et les politiques nécessaires.

### GitHub

Créez un dépôt, puis poussez ce dossier :

```powershell
git init
git add .
git commit -m "Initialiser WS Supply"
git branch -M main
git remote add origin <URL_DU_DEPOT>
git push -u origin main
```

### Vercel

1. Importez le dépôt GitHub.
2. Ajoutez les variables de `.env.example`.
3. Déployez la branche `main`.
4. Ajoutez le domaine souhaité dans Vercel.

## Guide rapide

- Connexion boutique : choisissez la boutique, puis utilisez « Commander ».
- Le dépôt suit les commandes dans le tableau de bord.
- Chaque boutique confirme la réception depuis sa commande expédiée.
- « Envoyer au dépôt » permet d’envoyer une note, une recommandation ou une déclaration de produit.
- Les notifications commencent par le canal email ; WhatsApp ou Telegram pourront être ajoutés derrière la même interface de notification.
