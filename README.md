# Chroniques d'Aldemarr

Jeu narratif coopératif dark fantasy — 2 joueurs, backend Firebase.

## Déploiement Vercel (3 étapes)

### 1. Crée un repo GitHub
- Va sur github.com → New repository → nom : `aldemarr`
- Upload tous les fichiers de ce dossier

### 2. Connecte Vercel
- Va sur vercel.com → Add New Project
- Importe le repo GitHub `aldemarr`
- Framework : **Vite** (détecté automatiquement)
- Clique **Deploy**

### 3. Partage le lien
Vercel te donne une URL type `aldemarr-xxx.vercel.app`.  
Chaque joueur ouvre cette URL dans son navigateur — l'un choisit Joueur 1, l'autre Joueur 2.

## Dev local
```bash
npm install
npm run dev
```

## Firebase
Base de données : `https://elden-log-37e7d-default-rtdb.firebaseio.com/`  
Règles actuelles : lecture/écriture publique (à sécuriser en production).
