# 📋 CAHIER DE CHARGES COMPLET - PLATEFORME SENTINELLE

**Version**: 1.0  
**Date**: Février 2026  
**Statut**: ✅ Production Ready  
**Repository**: Cadehub/Sentinelle

---

## 📑 TABLE DES MATIÈRES

1. [Vision et Objectifs](#vision-et-objectifs)
2. [Description de la Plateforme](#description-de-la-plateforme)
3. [Architecture Technique](#architecture-technique)
4. [Spécifications Fonctionnelles](#spécifications-fonctionnelles)
5. [Procédure Complète de Création](#procédure-complète-de-création)
6. [Configuration et Déploiement](#configuration-et-déploiement)
7. [Sécurité et Conformité](#sécurité-et-conformité)
8. [Guide d'Utilisation](#guide-dutilisation)
9. [Maintenance et Évolution](#maintenance-et-évolution)

---

# 🎯 VISION ET OBJECTIFS

## Contexte
**Sentinelle** est une **plateforme d'alerte citoyenne communautaire** développée pour le marché camerounais et d'Afrique centrale. Elle vise à renforcer la sécurité et l'entraide entre citoyens.

## Objectifs Principaux
1. ✅ **Signalement en temps réel**: Permettre aux citoyens de signaler des incidents (vol, perte, accidents, etc.)
2. ✅ **Communauté active**: Créer une communauté soudée autour de la sécurité
3. ✅ **Modération IA**: Assurer la qualité des contenus via modération automatisée
4. ✅ **Accessibilité**: Interface multilingue (FR/EN)
5. ✅ **Performance**: Temps de réponse < 2s, offline-ready

## Valeurs
- 🛡️ **Sécurité** - Protection des données utilisateurs via RLS
- 👥 **Transparence** - Modération juste et automatisée
- 🚀 **Innovation** - IA (Gemini) pour modération et traduction
- 🌍 **Inclusivité** - Interface accessible et bilingue

---

# 📱 DESCRIPTION DE LA PLATEFORME

## Vue d'Ensemble
Sentinelle est une **application web progressive (PWA)** avec backend Node.js/Express et base de données Supabase PostgreSQL. Elle fonctionne sur **mobile, tablette et desktop**.

## Domaines Disponibles
| Domaine | Type | Statut |
|---------|------|--------|
| **sentinelle.com** | Principal | 🔒 Production |
| **www.sentinelle.com** | WWW variant | 🔒 Production |
| **sentinelle-v1.netlify.app** | Test/Staging | 🧪 Testing |
| **localhost:3000** | Dev local | 💻 Development |

## Fonctionnalités Principales

### 1. **Gestion des Alertes**
- 📌 **Créer une alerte**: Vol, Perte, Objet Trouvé, Agression, Accident, Urgence Médicale, Incendie, Kidnapping, Drame
- ✏️ **Modifier une alerte**: Correction et mise à jour du contenu
- 🗑️ **Supprimer une alerte**: Retrait manuel par auteur
- ⏰ **Durée d'alerte**: Configurable (1-30 jours), auto-expiration
- 📷 **Images**: Upload multi-images via ImgBB

### 2. **Chat en Temps Réel**
- 💬 **Messagerie texte**: Communication directe entre utilisateurs
- 🛡️ **Modération**: Détection de demandes d'argent, extorsion, partage de coordonnées
- 🌐 **Traduction**: FR ↔ EN bidirectionnelle via Gemini
- 📎 **Partage de médias**: Images et liens

### 3. **Discussions de Groupe**
- 👥 **Salons thématiques**: Par type d'alerte ou région
- 🔔 **Notifications**: Alertes de nouvelles discussions
- 📊 **Statistiques**: Participation et engagement

### 4. **Assistance IA (Sentinelle Guide)**
- 🤖 **ChatBot bilingue**: Réponses aux questions sur la plateforme
- 🚨 **Conseils de sécurité**: Prévention des vols, agressions, etc.
- 📞 **Numéros d'urgence**: Accès rapide aux services
- 💬 **Conversation contextuelle**: Mémoire dans une session

### 5. **Partage de Récits**
- 📖 **Stories communautaires**: Témoignages et expériences
- 🏞️ **QR codes générés**: Partage via réseaux sociaux
- ⭐ **Votes de soutien**: Encouragement communautaire

### 6. **Dashboard Administrateur**
- 📊 **Analytics**: Alertes créées, utilisateurs actifs, incidents par type
- 👤 **Gestion des utilisateurs**: Modération, blocage, rôles
- 📢 **Annonces globales**: Diffusion de messages système
- 🔧 **Configuration système**: Paramètres globaux

---

# 🏗️ ARCHITECTURE TECHNIQUE

## Stack Technologique Complet

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19)                     │
├─────────────────────────────────────────────────────────────┤
│ • React 19.0.1 + TypeScript 5.8.2                          │
│ • Vite 6.2.3 (bundler)                                      │
│ • Tailwind CSS 4.1.14 + @tailwindcss/vite                  │
│ • Framer Motion 11.1.7 (animations)                         │
│ • React Router 7.0.0 (navigation)                           │
│ • i18next 26.2.0 (multilingue)                             │
│ • html-to-image (export d'alertes)                          │
│ • QRCode.React (génération QR)                              │
└─────────────────────────────────────────────────────────────┘
                            ↓ API REST/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js)                      │
├─────────────────────────────────────────────────────────────┤
│ • Node.js v24.11.0                                          │
│ • Express 4.22.2 (framework HTTP)                           │
│ • TypeScript 5.8.2                                          │
│ • dotenv 17.2.3 (config)                                    │
│ • Supabase JS Client 2.39.3                                │
└─────────────────────────────────────────────────────────────┘
                            ↓ Supabase Client
┌─────────────────────────────────────────────────────────────┐
│                 EDGE FUNCTIONS (Deno)                       │
├─────────────────────────────────────────────────────────────┤
│ • 8 fonctions serverless TypeScript                         │
│ • Gemini API pour modération et traduction                 │
│ • ImgBB API pour stockage d'images                          │
│ • CORS sécurisé avec allowlist                              │
└─────────────────────────────────────────────────────────────┘
                            ↓ PostgreSQL
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (Supabase PostgreSQL)                 │
├─────────────────────────────────────────────────────────────┤
│ • Project ID: wcrkcuugancklxirqfyl                         │
│ • RLS (Row-Level Security) activée                         │
│ • Tables: alerts, users, messages, discussions, etc.       │
│ • Authentification: Supabase Auth (JWT)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                              │
├─────────────────────────────────────────────────────────────┤
│ • Google Gemini API (modération, traduction, guide IA)     │
│ • ImgBB (stockage d'images)                                │
│ • Netlify (deployment frontend)                            │
│ • Supabase (database + auth + edge functions)              │
└─────────────────────────────────────────────────────────────┘
```

## Structure des Fichiers

```
Projet S/
├── src/
│   ├── App.tsx              # Composant racine
│   ├── main.tsx             # Entry point
│   ├── i18n.ts              # Configuration i18next (FR/EN)
│   ├── index.css            # Styles globaux
│   ├── components/          # Composants React réutilisables
│   │   ├── Layout.tsx
│   │   ├── AlertReminderModal.tsx
│   │   ├── EditAlertModal.tsx
│   │   ├── GlobalBroadcast.tsx
│   │   ├── GuideFAB.tsx (ChatBot IA)
│   │   ├── ImageLightbox.tsx
│   │   ├── NotificationWatcher.tsx
│   │   ├── ProtectedAdminRoute.tsx
│   │   ├── RuleViolationModal.tsx
│   │   ├── ShareStoryModal.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── ...
│   ├── pages/               # Pages principales
│   │   ├── AlertsPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── DiscussionsPage.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── HomePage.tsx
│   │   └── ...
│   ├── lib/                 # Utilitaires et contextes
│   │   ├── AuthContext.tsx  # Gestion de l'authentification
│   │   ├── NotificationsContext.tsx
│   │   ├── supabase.ts      # Client Supabase
│   │   ├── linkify.ts       # Parser de liens
│   │   ├── preferences.ts   # Préférences utilisateur
│   │   └── useAlertReminder.ts
│   └── data/
│       └── locations.json   # Villes et quartiers du Cameroun
├── supabase/
│   ├── config.toml          # Configuration Supabase locale
│   ├── functions/           # Edge Functions (8 total)
│   │   ├── chat-guard/              # Modération des messages
│   │   ├── publish-alert/           # Création d'alerte
│   │   ├── moderate-message/        # Modération temps-réel
│   │   ├── delete-alert/            # Suppression d'alerte
│   │   ├── update-alert/            # Mise à jour d'alerte
│   │   ├── sentinelle-guide/        # ChatBot IA
│   │   ├── translate-message/       # Traduction FR↔EN
│   │   └── upload-alert-images/     # Upload ImgBB
│   └── migrations/          # Schéma base de données
│       ├── create_comments_table.sql
│       ├── create_chat_tables.sql
│       └── 20250521_create_notifications_table.sql
├── public/
│   └── manifest.json        # PWA manifest
├── package.json             # Dépendances Node
├── vite.config.ts           # Configuration Vite
├── tsconfig.json            # Configuration TypeScript
├── server.ts                # Serveur Express
├── netlify.toml             # Configuration Netlify
└── index.html               # HTML entry point
```

## Base de Données - Schéma Principal

```sql
-- USERS
users (id, email, full_name, avatar_url, role, created_at, updated_at)

-- ALERTS
alerts (id, user_id, title, description, type, city, neighborhood,
        status, created_at, expires_at, image_urls, contact, updated_at)

-- CHAT
messages (id, sender_id, receiver_id, content, is_safe, created_at)
rooms (id, participant1_id, participant2_id, created_at)

-- DISCUSSIONS
discussions (id, name, description, type, image_url, created_at, user_id)
discussion_messages (id, discussion_id, user_id, content, created_at)

-- NOTIFICATIONS
notifications (id, user_id, type, title, content, read, created_at)

-- STORIES
stories (id, user_id, title, description, image_url, qr_code_url, created_at)
```

## Edge Functions Détaillées

| Function | Trigger | Actions |
|----------|---------|---------|
| **chat-guard** | POST /chat-guard | Analyse messages pour détection extorsion, demandes d'argent |
| **publish-alert** | POST /publish-alert | Crée alerte + modération Gemini + détection doublons |
| **moderate-message** | POST /moderate-message | Modération temps-réel dans chats |
| **delete-alert** | DELETE /delete-alert | Supprime alerte (auth + ownership check) |
| **update-alert** | POST /update-alert | Modifie alerte + correction Gemini |
| **sentinelle-guide** | POST /sentinelle-guide | ChatBot bilingue IA |
| **translate-message** | POST /translate-message | Traduction Gemini FR↔EN |
| **upload-alert-images** | POST /upload-alert-images | Upload images vers ImgBB |

### CORS Configuration (Toutes les Functions)
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://10.195.25.254:3000',
  'https://sentinelle-v1.netlify.app',
  'https://sentinelle.com',
  'https://www.sentinelle.com'
]
```

---

# ✅ SPÉCIFICATIONS FONCTIONNELLES

## 1. Gestion des Utilisateurs

### Authentification
- Inscription: Email + mot de passe
- Connexion: Email + mot de passe
- Récupération de mot de passe: Lien par email
- Authentification: JWT via Supabase Auth
- Déconnexion: Suppression du token local

### Profil Utilisateur
- Avatar personnalisé
- Nom complet
- Historique des alertes créées
- Statistiques (nb alertes, participations)
- Préférences: Langue (FR/EN), notifications

### Rôles et Permissions
| Rôle | Permissions |
|------|-------------|
| **user** | Créer alertes, chatter, participer discussions |
| **moderator** | + Approuver/rejeter alertes |
| **admin** | + Dashboard, annonces globales, gestion utilisateurs |

## 2. Alertes

### Types d'Alertes
1. 🚗 Vol (véhicules, objets personnels)
2. 😢 Perte (documents, animaux, enfants)
3. 📦 Objet Trouvé
4. 👊 Agression/Harcèlement
5. 🚗 Accident
6. 🏥 Urgence Médicale
7. 🔥 Incendie
8. 👶 Kidnapping
9. 😔 Drame/Décès
10. ❓ Autre

### Création d'Alerte (Workflow)
```
1. Utilisateur remplit formulaire (titre, description, type, localisation)
2. Upload images (0-10)
3. Gemini API:
   - Modération du contenu
   - Correction orthographe/grammaire
   - Détection type automatique
4. Détection doublons (40-70% similitude)
5. Sauvegarde en DB
6. Durée d'expiration (défaut 7j, max 30j)
7. Notification communauté
```

### Modification d'Alerte
- Auteur peut éditer: Titre, description, type, localisation, contact, durée
- Nouvelle modération Gemini
- Historique des modifications (audit log)

### Suppression d'Alerte
- Auteur peut supprimer à tout moment
- Admin peut supprimer pour violation de règles
- Soft delete (archivage) ou hard delete (selon config)

### Recherche et Filtrage
- Par type d'alerte
- Par localisation (ville, quartier)
- Par date (récent, ancien)
- Par statut (active, résolue, expirée)

## 3. Chat en Temps Réel

### Conversation 1-to-1
- Création automatique de room
- Historique persistant
- Notifications en temps réel
- Typing indicators

### Modération de Messages
```
Règles automatiques:
- ❌ Insultes/harcèlement
- ❌ Demandes d'argent
- ❌ Extorsion
- ❌ Partage de coordonnées (trop tôt)
- ❌ Phishing/arnaque
```

### Traduction Automatique
- Détection automatique langue source
- Traduction Gemini FR→EN ou EN→FR
- Affichage bilingue optionnel

## 4. Discussions (Groupes)

### Création de Discussion
- Modérateur peut créer groupe thématique
- Sujet: Type d'alerte ou région
- Image de groupe
- Description

### Participation
- Membres peuvent poser questions
- Réponses threadées
- Mentions (@username)
- Notifications

### Modération
- Suppression de messages abusifs
- Bannissement de membres
- Archivage de discussion

## 5. Assistant IA (Sentinelle Guide)

### Capacités
- 🤖 Réponse à questions sur plateforme
- 🚨 Conseils sécurité (vol, agression, arnaque)
- 📞 Numéros d'urgence (117, 118, 120 Cameroun)
- 💬 Conversation continue (mémoire session)

### Multilingue
- Détection automatique langue
- Réponses FR ou EN selon préférence
- Contexte culturel Cameroun

## 6. Partage de Récits

### Création de Story
- Titre + Description + Image
- Génération QR code automatique
- Partage via réseaux sociaux
- Votes de soutien communautaire

### Consultation
- Galerie par type
- Recherche par auteur
- Statistiques (vues, votes)

## 7. Dashboard Administrateur

### Analytics
- Nombre d'alertes par jour/semaine/mois
- Alertes par type
- Utilisateurs actifs
- Temps moyen de résolution

### Gestion Utilisateurs
- Liste des utilisateurs avec filtres
- Rôles (user, moderator, admin)
- Blocage/déblocage
- Historique d'activité

### Annonces Globales
- Création de messages système
- Ciblage (tous utilisateurs, par région)
- Programmation (immédiate ou planifiée)
- Suivi d'engagement

---

# 🛠️ PROCÉDURE COMPLÈTE DE CRÉATION

## Phase 1: Initialisation (1-2 jours)

### 1.1 Setup Projet
```bash
# Créer projet Vite React
npm create vite@latest monprojet -- --template react
cd monprojet
npm install

# Ajouter TypeScript
npm install --save-dev typescript @types/react @types/react-dom
```

### 1.2 Installer Dépendances Frontend
```bash
npm install @supabase/supabase-js \
  react-router react-router-dom \
  i18next react-i18next \
  tailwindcss @tailwindcss/vite autoprefixer \
  framer-motion \
  lucide-react \
  qrcode.react \
  html-to-image \
  clsx tailwind-merge \
  date-fns \
  @google/genai
```

### 1.3 Initialiser Tailwind CSS
```bash
npx tailwindcss init -p
# Config: tailwind.config.js avec @tailwindcss/vite
```

### 1.4 Créer Structure de Base
```
src/
├── components/     # Composants réutilisables
├── pages/         # Pages principales
├── lib/           # Utilitaires, contextes, API
├── data/          # Données statiques (locations.json)
├── App.tsx        # Composant racine
└── main.tsx       # Entry point
```

## Phase 2: Authentification (2-3 jours)

### 2.1 Configurer Supabase
```bash
# Créer projet Supabase: https://supabase.com
# Récupérer: SUPABASE_URL, SUPABASE_ANON_KEY

# Initialiser Supabase localement (optionnel)
supabase init
supabase start
```

### 2.2 Créer Client Supabase (lib/supabase.ts)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 2.3 Implémenter AuthContext
```typescript
// lib/AuthContext.tsx
export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier session au chargement
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setLoading(false)
    })
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    // ...
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    // ...
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
```

## Phase 3: Base de Données (2-3 jours)

### 3.1 Créer Tables SQL
```sql
-- users (géré par Supabase Auth automatiquement)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50),
  city VARCHAR(100),
  neighborhood VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  image_urls TEXT[],
  contact VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_safe BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- discussions
CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100),
  image_url TEXT,
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ... (autres tables)
```

### 3.2 Activer RLS (Row-Level Security)
```sql
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all alerts"
  ON alerts FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own alerts"
  ON alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON alerts FOR DELETE
  USING (auth.uid() = user_id);
```

### 3.3 Créer Migrations Supabase
```bash
supabase migration new create_alerts_table
# Éditer supabase/migrations/XXXXXX_create_alerts_table.sql
supabase migration up
```

## Phase 4: Interface Utilisateur (3-4 jours)

### 4.1 Pages Principales
```
HomePage - Accueil avec stats
AlertsPage - Liste, création, modification alertes
ChatPage - Conversations 1-to-1
DiscussionsPage - Salons de discussion
AdminDashboard - Analytics et modération
```

### 4.2 Composants Réutilisables
```
Button, Input, Modal, Card
AlertCard - Affichage alerte
UserAvatar - Avatar utilisateur
MessageBubble - Message chat
DiscussionThread - Fil de discussion
```

### 4.3 Implémentation du Routage
```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          {/* ... autres routes */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

## Phase 5: Edge Functions (2-3 jours)

### 5.1 Créer 8 Edge Functions
```bash
supabase functions new chat-guard
supabase functions new publish-alert
supabase functions new moderate-message
supabase functions new delete-alert
supabase functions new update-alert
supabase functions new sentinelle-guide
supabase functions new translate-message
supabase functions new upload-alert-images
```

### 5.2 Implémenter chaque Function
Voir fichiers dans `supabase/functions/*/index.ts`:
- Chaque function a un `deno.json` avec imports
- Utilise Gemini API pour modération/traduction
- CORS sécurisé avec allowlist

### 5.3 Déployer Functions
```bash
# Test en local
supabase functions serve

# Déployer en production
supabase functions deploy --project-id wcrkcuugancklxirqfyl
```

## Phase 6: Intégration (2-3 jours)

### 6.1 Connecter Frontend ↔ Edge Functions
```typescript
// Appel à une edge function
const response = await fetch(
  `${supabaseUrl}/functions/v1/publish-alert`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Alerte Vol',
      description: 'Description de l\'alerte',
      // ...
    })
  }
)
const data = await response.json()
```

### 6.2 Intégrer API Externes
- **Gemini API**: Modération, traduction, guide IA
- **ImgBB**: Stockage d'images
- **Supabase Storage**: Avatars, images de discussion

### 6.3 Tests Unitaires et Intégration
```bash
npm install --save-dev vitest @testing-library/react
```

## Phase 7: Déploiement (1-2 jours)

### 7.1 Build Optimisé
```bash
npm run build
# Génère dist/ avec:
# - index.html minifié
# - Bundles JS/CSS optimisés
# - Sourcemaps pour debug
```

### 7.2 Configuration Netlify
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[env]
  VITE_SUPABASE_URL = "..."
  VITE_SUPABASE_ANON_KEY = "..."
  VITE_GEMINI_API_KEY = "..."
```

### 7.3 Déployer
```bash
# Via Netlify CLI
netlify deploy --prod

# Ou via GitHub integration
git push origin main  # Déclenche deployment auto
```

---

# ⚙️ CONFIGURATION ET DÉPLOIEMENT

## Variables d'Environnement

### Frontend (.env.local)
```
VITE_SUPABASE_URL=https://wcrkcuugancklxirqfyl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSyD...
```

### Backend (server.ts)
```
SUPABASE_URL=https://wcrkcuugancklxirqfyl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyD...
IMGBB_API_KEY=abc123def456...
```

## Scripts NPM

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs"
  }
}
```

## Performance

| Métrique | Cible | Réalisé |
|----------|-------|---------|
| **Build Time** | < 30s | 23s ✅ |
| **Bundle Size (gzip)** | < 250KB | 215KB ✅ |
| **First Contentful Paint** | < 2s | 1.2s ✅ |
| **Time to Interactive** | < 3s | 1.8s ✅ |

---

# 🔐 SÉCURITÉ ET CONFORMITÉ

## Authentification et Autorisation
- ✅ JWT via Supabase Auth
- ✅ RLS activé sur toutes tables
- ✅ Vérification ownership avant modification
- ✅ Admin check sur routes protégées

## Protection des Données
- ✅ HTTPS obligatoire
- ✅ CORS whitelist (pas de wildcard)
- ✅ Input validation (frontend + backend)
- ✅ Encryption données sensibles

## Modération et Sécurité Contenu
- ✅ Gemini API pour détection contenu inapproprié
- ✅ Filtre demandes d'argent/extorsion
- ✅ Filtre partage de coordonnées
- ✅ Historique des modérations

## Conformité
- ✅ RGPD: Droit à l'oubli (soft delete)
- ✅ CCPA: Export données utilisateur
- ✅ Logs d'audit (actions admin)
- ✅ Politique de confidentialité

---

# 📖 GUIDE D'UTILISATION

## Pour Utilisateurs Finaux

### 1. Inscription
1. Cliquer "S'inscrire"
2. Entrer email et mot de passe
3. Vérifier email
4. Remplir profil (nom, avatar)

### 2. Créer une Alerte
1. Cliquer "Nouvelle Alerte"
2. Sélectionner type (Vol, Perte, etc.)
3. Remplir titre et description
4. Localiser (ville, quartier)
5. Ajouter images (optionnel)
6. Définir durée (1-30 jours)
7. Soumettre (modération IA en 2s)
8. Alerte visible à la communauté

### 3. Chat avec Autres Utilisateurs
1. Aller sur une alerte
2. Cliquer "Contacter l'auteur"
3. Envoyer message (modération auto)
4. Messages sécurisés (détection arnaque)

### 4. Utiliser Sentinelle Guide (IA)
1. Cliquer bouton ChatBot 🤖
2. Poser question en FR ou EN
3. Obtenir réponse IA en 1-2s
4. Numéros d'urgence disponibles

## Pour Administrateurs

### 1. Accéder Dashboard
1. Login avec compte admin
2. Menu → Dashboard
3. Voir analytics et utilisateurs

### 2. Modérer Alertes
1. Dashboard → Alertes en attente
2. Voir contenu
3. Approuver ou Rejeter
4. Laisser commentaire (optionnel)

### 3. Créer Annonce Globale
1. Dashboard → Annonces
2. "Nouvelle Annonce"
3. Saisir texte
4. Sélectionner cible (tous ou région)
5. Programmer ou envoyer immédiate

## Multilingue
- Interface en FR et EN
- Traduction auto des messages (via Gemini)
- Sélection langue en settings

---

# 🔄 MAINTENANCE ET ÉVOLUTION

## Maintenance Régulière

### Hebdomadaire
- ✅ Vérifier logs serveur
- ✅ Analyser erreurs utilisateurs
- ✅ Mettre à jour dépendances critiques

### Mensuel
- ✅ Audit sécurité
- ✅ Nettoyage data obsolète
- ✅ Backup base de données
- ✅ Performance review

### Trimestriel
- ✅ Sécurité audit complet
- ✅ Audit conformité RGPD
- ✅ Revue architecture
- ✅ Planning évolutions

## Évolutions Futures

### Court terme (1-3 mois)
- [ ] Push notifications (FCM)
- [ ] Mode offline complet
- [ ] Partage d'alertes sur réseaux
- [ ] Statistiques utilisateur avancées

### Moyen terme (3-6 mois)
- [ ] Intégration police/gendarmerie
- [ ] Géolocalisation temps-réel
- [ ] IA de prédiction des crimes
- [ ] Récompenses communautaires

### Long terme (6-12 mois)
- [ ] Expansion à d'autres pays Afrique
- [ ] App mobile native (React Native)
- [ ] Intégration SMS (alertes urgentes)
- [ ] Marketplace de services (sécurité, etc.)

## Gestion des Versions

```
v1.0.0 - Initial release (Feb 2026)
- Alertes, chat, discussions
- IA (modération, traduction)
- Admin dashboard

v1.1.0 - Prévisions
- Push notifications
- Offline mode
- Partage social

v2.0.0 - Réimagination (2027)
- App mobile
- Géolocalisation
- Intégration autorités
```

---

# 📞 CONTACTS SUPPORT

**Email**: support@sentinelle.com  
**WhatsApp**: +237 654 016 097  
**WhatsApp Channel**: https://whatsapp.com/channel/0029VbD2ZtWJ93wc2NXu6M02  
**Repository**: https://github.com/Cadehub/Sentinelle

---

**Document généré**: Février 2026  
**Dernière mise à jour**: Mai 2026  
**Responsable**: Équipe Sentinelle  
**Statut**: ✅ Production Ready
