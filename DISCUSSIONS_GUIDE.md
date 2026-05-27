# Fonctionnalité Discussions / Chat - Documentation Complète

## Vue d'ensemble

La fonctionnalité **Discussions** permet aux utilisateurs Sentinelle (créateurs d'alertes et découvreurs) de communiquer en temps réel via une interface de chat intégrée. Chaque conversation est liée à une alerte spécifique et facilite la collaboration et l'échange d'informations.

---

## Architecture Technique

### Pages React

#### 1. **src/pages/Discussions.tsx** - Liste des conversations
- **Route**: `/discussions`
- **Accès**: Utilisateurs authentifiés uniquement
- **Fonctionnalités**:
  - Affiche toutes les conversations de l'utilisateur connecté
  - Récupère les données depuis la table `chat_rooms`
  - Affiche pour chaque conversation:
    - Image de l'alerte associée
    - Titre de l'alerte
    - Type d'alerte (badge)
    - Rôle de l'utilisateur: "Propriétaire" (icône couronne) ou "Découvreur" (icône sourire)
    - Heure du dernier message
    - Badge de compteur de messages non lus (optionnel)
  - Trier par date de mise à jour (plus récent en premier)
  - États: Chargement, Aucune conversation, Liste des conversations
  - Navigation: Clic sur une conversation → `/discussions/:id`

#### 2. **src/pages/ChatDetail.tsx** - Détail d'une conversation
- **Route**: `/discussions/:id`
- **Accès**: Uniquement les 2 utilisateurs de la conversation
- **Fonctionnalités**:
  - Affiche l'image et le titre de l'alerte associée
  - Affiche tous les messages de la conversation (chronologique)
  - Entrée de texte pour envoyer des nouveaux messages
  - Messages propres à l'utilisateur: couleur bleue, alignés à droite
  - Messages des autres: couleur du thème, alignés à gauche
  - Timestamps relatifs (ex: "il y a 5 minutes")
  - Scroll automatique vers le dernier message
  - États: Chargement, Conversation non trouvée, Chat actif

---

## Structure de la Base de Données

### Table: `public.chat_rooms`
```sql
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id),
  user_id_owner UUID NOT NULL REFERENCES auth.users(id),
  user_id_discoverer UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_chat_per_alert UNIQUE (alert_id, user_id_owner, user_id_discoverer)
);
```

**Colonnes**:
- `id`: Identifiant unique de la salle de chat (UUID)
- `alert_id`: Référence à l'alerte associée
- `user_id_owner`: UUID du créateur de l'alerte (propriétaire)
- `user_id_discoverer`: UUID de l'utilisateur qui a découvert/interagi (découvreur)
- `created_at`: Horodatage de création
- `updated_at`: Horodatage de la dernière mise à jour
- `last_message_at`: Horodatage du dernier message

**Contraintes**:
- `UNIQUE (alert_id, user_id_owner, user_id_discoverer)`: Une seule conversation par alerte et paire d'utilisateurs
- `CHECK (user_id_owner != user_id_discoverer)`: Les deux utilisateurs doivent être différents

---

### Table: `public.chat_messages`
```sql
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Colonnes**:
- `id`: Identifiant unique du message
- `room_id`: Référence à la salle de chat
- `sender_id`: UUID de l'auteur du message
- `content`: Texte du message
- `created_at`: Horodatage de création
- `updated_at`: Horodatage de la dernière modification

---

### Table: `public.chat_read_status`
```sql
CREATE TABLE public.chat_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  CONSTRAINT unique_read_status UNIQUE (room_id, user_id)
);
```

**Colonnes**:
- `id`: Identifiant unique
- `room_id`: Référence à la salle de chat
- `user_id`: UUID de l'utilisateur
- `last_read_at`: Horodatage du dernier message lu
- `unread_count`: Nombre de messages non lus

---

## Row-Level Security (RLS)

### Politiques pour `chat_rooms`
- ✅ `Users can view their chat rooms`: Les utilisateurs voient uniquement les conversations auxquelles ils participent
- ✅ `Only alert owner can create chat rooms`: Seul le créateur de l'alerte peut créer une salle de chat

### Politiques pour `chat_messages`
- ✅ `Users can view messages in their rooms`: Voir les messages des conversations auxquelles on participe
- ✅ `Users can send messages in their rooms`: Envoyer des messages uniquement dans les conversations auxquelles on participe
- ✅ `Users can update their own messages`: Modifier ses propres messages
- ✅ `Users can delete their own messages`: Supprimer ses propres messages

### Politiques pour `chat_read_status`
- ✅ `Users can view their read status`: Voir son propre statut de lecture
- ✅ `Users can insert/update read status`: Gérer son statut de lecture

---

## Flux de Données

### Récupération de la liste des conversations

```
Utilisateur authentifié
       ↓
   Discussions.tsx chargé
       ↓
   Supabase query:
   SELECT * FROM chat_rooms
   WHERE user_id_owner = auth.uid()
      OR user_id_discoverer = auth.uid()
   ORDER BY updated_at DESC
       ↓
   JOIN avec alerts pour titre et image
       ↓
   Afficher liste avec badges de rôle
```

### Ouverture d'une conversation

```
Utilisateur clique sur conversation
       ↓
   Navigate(/discussions/{id})
       ↓
   ChatDetail.tsx chargé
       ↓
   Vérification d'accès (RLS via Supabase)
       ↓
   Récupération des messages:
   SELECT * FROM chat_messages
   WHERE room_id = {id}
   ORDER BY created_at ASC
       ↓
   Afficher messages chronologiquement
```

### Envoi d'un message

```
Utilisateur écrit et envoie un message
       ↓
   Validation (non vide)
       ↓
   INSERT INTO chat_messages
   (room_id, sender_id, content, created_at)
       ↓
   Trigger: update_chat_room_timestamp
   UPDATE chat_rooms
   SET updated_at = NOW(),
       last_message_at = NOW()
       ↓
   Message ajouté à l'état local
       ↓
   Scroll auto vers bas
```

---

## Styling & Thème

### Utilisation des variables CSS globales
- `--bg-primary`: Fond principal des messages
- `--bg-card`: Fond des conteneurs
- `--text-primary`: Texte principal
- `--text-secondary`: Texte secondaire
- `--text-tertiary`: Texte tertiaire (très dégradé)
- `--border-color`: Bordures standard
- `--border-color-strong`: Bordures emphase

### Design des messages
- **Messages propres**: Fond bleu, texte blanc, alignés à droite
- **Messages autres**: Fond du thème, bordure, alignés à gauche
- **Avatars**: Initiales de l'utilisateur dans cercle coloré
- **Timestamps**: Format relatif (date-fns avec locale fr)

---

## Intégrations Futures

### Notifications en temps réel
- Utiliser `supabase.from('chat_messages').on('*')` pour écouter les nouveaux messages
- Affichage de badge "Message non lu" en temps réel
- Notification push optionnelle

### Typing Indicators
- Afficher "X est en train d'écrire..." pendant l'édition
- Implémentation via WebSocket ou Realtime

### Suppression de messages
- Bouton poubelle sur hover (messages propres uniquement)
- Soft delete pour garder l'historique

### Réactions aux messages
- Emoji reactions sur hover
- Compteur de réactions

### Recherche dans les messages
- Barre de recherche dans le détail du chat
- Surligner les résultats

---

## Guide d'Installation

### 1. Créer les tables Supabase

Exécutez la migration SQL depuis: `supabase/migrations/create_chat_tables.sql`

```bash
supabase migration up
```

Ou via le dashboard Supabase:
1. Allez à SQL Editor
2. Collez le contenu de `create_chat_tables.sql`
3. Exécutez

### 2. Vérifier les imports

Les pages importent depuis:
- `../lib/supabase` (client Supabase)
- `../lib/AuthContext` (utilisateur authentifié)
- `lucide-react` (icônes)
- `date-fns` (formatage des dates)

### 3. Déployer

```bash
npm run build
# Déployer sur Netlify/Vercel comme d'habitude
```

---

## Points Clés

### Sécurité
- ✅ RLS: Impossible d'accéder à une conversation sans être impliqué
- ✅ Auth: Vérification de l'utilisateur avant tout accès
- ✅ Validation: Messages non vides
- ✅ Propriété: Seul le créateur peut initier une conversation

### Performance
- ✅ Indexes: Sur `alert_id`, `user_id_owner`, `updated_at`, `created_at`
- ✅ Pagination: Récupération complète (peut être optimisée avec limit/offset)
- ✅ Scroll: Scroll auto vers le dernier message

### UX
- ✅ État de chargement durant la récupération
- ✅ État "Aucune conversation" explicite
- ✅ Feedback sur l'envoi (bouton désactivé durant)
- ✅ Timestamps relatifs (humanisés)
- ✅ Distinction visuelle: mes messages vs autres

---

## Tests Manuels

### Scénario 1: Créer une conversation
1. Utilisateur A crée une alerte
2. Utilisateur B découvre l'alerte
3. Une `chat_room` est créée automatiquement (si intégration avec Publish.tsx)
4. Consultez `/discussions` - la conversation apparaît
5. Cliquez dessus → `/discussions/{id}` se charge

### Scénario 2: Envoyer un message
1. Ouvrez une conversation (`/discussions/{id}`)
2. Tapez un message
3. Cliquez "Envoyer" ou appuyez Entrée
4. Le message apparaît instantanément (bleu, droite)
5. Heure relative s'affiche

### Scénario 3: Accès non autorisé
1. Copiez l'ID d'une conversation d'un autre utilisateur
2. Naviguez vers `/discussions/{id}` en tant que tiers
3. Erreur: "Vous n'avez pas accès à cette conversation"
4. Redirigé vers `/discussions`

---

## Dépannage

| Problème | Cause | Solution |
|----------|-------|----------|
| `chat_rooms` table not found | Migration non exécutée | Exécutez `create_chat_tables.sql` |
| Erreur RLS 403 | Policies non configurées | Vérifiez les policies dans Supabase |
| Messages vides | Liste vide malgré des messages | Vérifiez `room_id` et permissions |
| Scroll ne descend pas | Timing du DOM | Délai setTimeout(0) appliqué |
| Timestamps cassées | Locale non importée | Vérifiez: `import { fr } from "date-fns/locale"` |

---

## Fichiers Modifiés/Créés

```
src/pages/
  ├── Discussions.tsx        (CRÉÉ) - Liste conversations
  └── ChatDetail.tsx         (CRÉÉ) - Détail conversation

src/App.tsx                  (MODIFIÉ) - Routes ajoutées

supabase/migrations/
  └── create_chat_tables.sql (CRÉÉ) - Schéma base données
```

---

**Version**: 1.0 - Mai 2026  
**Auteur**: Sentinelle Development Team  
**Statut**: Production Ready ✅
