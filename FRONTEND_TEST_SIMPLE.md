# 🧪 TEST FRONTEND - VÉRIFICATION RAPIDE

## ✅ APRÈS AVOIR EXÉCUTÉ LE SQL DANS SUPABASE

### ÉTAPE 1: Redémarrer le Dev Server
```bash
# Terminal
npm run dev
```

### ÉTAPE 2: Ouvrir DevTools
```
F12 → Console
```

### ÉTAPE 3: Aller à http://localhost:5173/

### ÉTAPE 4: Vérifier les Logs
```
Cherchez dans la console:

✅ BON:
  [PROFILE] Chargement du profil
  [PROFILE] Subscription activée
  Profile: {id: "...", role: "admin" ou "user", ...}

❌ MAUVAIS:
  Erreur 500
  "permission denied for table profiles"
  Erreur RLS
```

### ÉTAPE 5: Allez à /admin
```
URL: http://localhost:5173/admin
```

### ÉTAPE 6: Attendez 2-3 Secondes
```
Écran de chargement avec message:
"Vérification des permissions..."
```

### ÉTAPE 7: Résultat Final

#### SI VOUS ÊTES ADMIN:
```
✅ Dashboard Admin s'affiche
✅ Pas d'erreur dans la console
✅ Bouton "Admin" visible dans:
   - Desktop (Navbar): [⚡ Admin] entre Signaler et Quitter
   - Mobile (Bottom Nav): [⚡ ADMIN] avec Shield icon
```

#### SI VOUS ÊTES USER (ou non-admin):
```
✅ Redirection automatique vers /
✅ Pas d'erreur 500
✅ Pas d'erreur console
✅ Bouton "Admin" INVISIBLE partout
```

---

## 🔍 DIAGNOSTIC DÉTAILLÉ

### Console DevTools (F12)

**Copier cette commande dans la console:**
```javascript
// Affiche votre profil actuel
console.log(window.__PROFILE__ || 'Non disponible');
// Ou cherchez les logs avec "PROFILE"
```

**Ou rechargez et cherchez automatiquement:**
```
Ctrl+F dans la console
Cherchez: "[PROFILE]"
```

### Network Tab (F12 → Network)

**Cherchez ces requêtes:**
```
GET .../rest/v1/profiles?select=... 
Status: ✅ 200 (SUCCESS)
Ne doit PAS être: ❌ 500 (ERROR)

GET .../rest/v1/system_broadcasts?select=...
Status: ✅ 200 (SUCCESS)
Ne doit PAS être: ❌ 500 (ERROR)
```

### Application Tab (F12 → Application)

**Vérifiez localStorage:**
```
LocalStorage → http://localhost:5173
Cherchez: sentinelle_prefs (vos préférences)
Doit exister et ne pas être vide
```

---

## 📱 TEST RESPONSIVE

### Desktop (DevTools Mode Responsif)

```
F12 → Responsive Design Mode (Ctrl+Shift+M)
Dimensions: 1024x768 ou plus

Attendu:
✅ Navbar visible: [Logo] [Tableau] [Disc] [Pref] [Sig] [⚡ Admin] [Quit]
✅ Bottom Nav: HIDDEN
✅ Bouton Admin: visible dans Navbar (hidden md:flex)
```

### Mobile (DevTools Mode Responsif)

```
F12 → Responsive Design Mode (Ctrl+Shift+M)
Dimensions: 375x667 (iPhone)

Attendu:
✅ Navbar: simplifiée, juste [Logo] [Theme Toggle]
✅ Bottom Nav: VISIBLE
✅ Bouton Admin: visible dans Bottom Nav avec Shield icon (md:hidden)
✅ Layout: responsive, aucun overlap
```

---

## 🐛 TROUBLESHOOTING

### Problème: Erreur 500 sur /admin
```
❌ Cause: Script SQL pas exécuté

✅ Solution:
1. Allez à Supabase SQL Editor
2. Vérifiez que le script a été exécuté
3. Exécutez: SELECT proname FROM pg_proc WHERE proname = 'is_admin';
   └─ Doit retourner: is_admin
4. Si vide: Re-exécutez le SQL complet
```

### Problème: Bouton Admin n'apparaît pas
```
❌ Cause: Vous n'êtes pas admin, ou profil charge

✅ Solution:
1. Attendez 3 secondes (chargement)
2. Rechargez la page: Ctrl+F5
3. Vérifiez votre rôle en SQL:
   SELECT role FROM profiles WHERE id = 'YOUR_USER_ID';
4. Si role = 'user', mettez-vous admin:
   UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
5. Déconnectez/reconnectez dans l'appli
```

### Problème: Console remplie d'erreurs
```
❌ Cause: Vieille cache

✅ Solution:
1. Ctrl+Shift+Delete (vider cache complet)
2. Fermer tous les onglets de localhost:5173
3. Ctrl+F5 (rechargement complet)
4. npm run dev (redémarrer dev server)
5. Ouvrir nouvelle tab: http://localhost:5173
```

### Problème: Bouton Admin apparaît et disparaît
```
❌ Cause: loading state not managed

✅ Vérifiez Layout.tsx:
const isAdmin = !profileLoading && profile?.role === 'admin';
                └─ profileLoading doit être false pour afficher
```

---

## ✅ CHECKLIST DE VALIDATION

```
AUTHENTICATION
☑ Connecté à l'appli
☑ Pas d'erreur de session
☑ User ID visible en DevTools Network

PROFILE LOADING
☑ Requête GET /profiles réussie (status 200)
☑ Pas d'erreur 500
☑ Console montre: "[PROFILE] Subscription activée"

LOGIC
☑ Si role = 'admin':
  ☑ Accès à /admin permis
  ☑ Bouton visible dans Navbar (desktop)
  ☑ Bouton visible dans Bottom Nav (mobile)
  
☑ Si role = 'user':
  ☑ /admin redirige vers /
  ☑ Aucun bouton Admin visible

RESPONSIVE
☑ Desktop (768px+): Navbar + Admin button
☑ Mobile (<768px): Bottom Nav + Admin icon

ERRORS
☑ Aucune erreur 500
☑ Aucune erreur "permission denied"
☑ Console clean (pas d'erreurs suspectes)
```

---

## 🎯 RÉSULTAT ATTENDU

```
┌────────────────────────────────────────────┐
│ ✅ FRONTEND TEST RÉUSSI                    │
├────────────────────────────────────────────┤
│                                            │
│ SQL exécuté ......................... ✅   │
│ Fonction is_admin() créée ........... ✅   │
│ Policies RLS saines ................. ✅   │
│                                            │
│ Frontend charge correctement ........ ✅   │
│ Profile fetched ..................... ✅   │
│ Admin button responsive ............. ✅   │
│                                            │
│ Pas d'erreur 500 .................... ✅   │
│ Pas d'erreur RLS .................... ✅   │
│ Console propre ...................... ✅   │
│                                            │
│ PRÊT POUR PRODUCTION ........... ✅ OUI   │
│                                            │
└────────────────────────────────────────────┘
```

---

**Une fois ce test réussi, vous êtes prêts à déployer! 🚀**
