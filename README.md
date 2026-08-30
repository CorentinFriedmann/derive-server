# Peacetrip — serveur

Le backend qui rend le prototype claude.ai utilisable partout : il tient la
clé API Anthropic côté serveur (jamais dans le navigateur), stocke les
séjours/l'historique dans une vraie base, et sert le site.

## Ce qu'il y a dans ce dossier

```
derive-server/
  server.js          → le serveur Express (routes /api/...)
  db.js              → la base SQLite (séjours, historique)
  package.json
  .env.example       → modèle pour ta clé API
  public/index.html  → le site (frontend)
```

## 1. Tester en local

```bash
cd derive-server
npm install
cp .env.example .env
```

Ouvre `.env` et remplace la valeur par ta vraie clé, récupérable sur
https://console.anthropic.com/settings/keys :

```
ANTHROPIC_API_KEY=sk-ant-...
```

Puis lance :

```bash
npm start
```

Le site est sur http://localhost:3000 — génération IA, photos, séjours
sauvegardés et remodelage de formule fonctionnent tous en vrai, dans
n'importe quel navigateur (Chrome, Safari, peu importe), plus besoin de
claude.ai.

## 2. Déployer pour de vrai (accessible à ton collaborateur, en ligne)

Je recommande **Railway** (gratuit pour démarrer, simple, garde les fichiers
entre les redémarrages — important puisqu'on utilise SQLite). Render marche
aussi mais son disque gratuit est effacé à chaque redéploiement.

### Avec Railway

1. Crée un compte sur https://railway.app (connexion avec GitHub la plus simple).
2. Mets ce dossier `derive-server` dans un dépôt GitHub (voir section 3 si tu
   n'as jamais fait ça).
3. Sur Railway : **New Project → Deploy from GitHub repo** → sélectionne ton dépôt.
4. Railway détecte automatiquement Node.js et lance `npm install` puis `npm start`.
5. Dans l'onglet **Variables** du service, ajoute :
   - `ANTHROPIC_API_KEY` = ta clé (jamais dans le code, jamais dans GitHub)
6. Dans l'onglet **Settings → Volumes**, ajoute un volume monté sur `/app/data`
   (c'est là que vit le fichier SQLite) — sinon les séjours sauvegardés
   disparaissent à chaque redéploiement.
7. Railway te donne une URL publique (`xxx.up.railway.app`) — c'est le lien à
   partager avec ton collaborateur.

### Alternative : Render

Même principe (New → Web Service → connecter le repo GitHub, ajouter la
variable d'environnement), mais pense à activer un **disque persistant**
(payant même au plus bas prix) sur `/opt/render/project/src/data`, sinon la
base SQLite repart de zéro à chaque déploiement.

## 3. Mettre le code sur GitHub (si ce n'est pas déjà fait)

```bash
cd derive-server
git init
git add .
git commit -m "Premier commit du serveur Peacetrip"
```

Puis crée un dépôt vide sur https://github.com/new (ne coche PAS "ajouter un
README", il y en a déjà un), et suis les instructions `git remote add
origin ...` / `git push` que GitHub affiche.

Le fichier `.gitignore` est déjà prêt : ton `.env` (donc ta clé API) et le
dossier `data/` (la base SQLite) ne seront jamais poussés sur GitHub — c'est
voulu, pour la sécurité et pour ne pas versionner des données utilisateur.

## Limites connues à garder en tête

- **Pas de vrais comptes utilisateurs.** Chaque visiteur reçoit un
  identifiant aléatoire stocké dans son navigateur (`localStorage`) — ça
  suffit pour une bêta entre collègues, mais ce n'est ni sécurisé ni
  synchronisé entre appareils. Avant un vrai lancement public, il faudra une
  vraie authentification (email + mot de passe, ou "Se connecter avec
  Google").
- **SQLite** convient très bien pour une bêta ou un petit nombre
  d'utilisateurs simultanés. S'il y a beaucoup de trafic en même temps, une
  base hébergée (Postgres via Supabase ou Neon, par exemple) sera plus
  robuste — `db.js` est le seul fichier à réécrire pour ce changement.
- **Pas encore de vraie réservation en un clic ni de suivi de commission** :
  ça demande des accords d'affiliation officiels avec Booking.com,
  GetYourGuide, etc. — une démarche commerciale séparée du code.
- **Coûts API** : chaque génération d'itinéraire consomme des tokens Claude
  (facturés à ta clé API). Pense à surveiller ta consommation sur
  https://console.anthropic.com si le site reçoit beaucoup de visites.
