# Sentinelle - Plateforme d'Alerte Citoyenne

**Application web pour la sécurité et l'entraide communautaire en Afrique centrale.**

🔗 **Live**: https://sentinelle-v1.netlify.app | https://sentinelle.com

---

## 📋 Documentation Principale

### 📖 [CAHIER_DE_CHARGES_COMPLET.md](./CAHIER_DE_CHARGES_COMPLET.md)
La **documentation maître et unique** contenant:
- ✅ Vision et objectifs de la plateforme
- ✅ Description complète des fonctionnalités
- ✅ Architecture technique détaillée
- ✅ Spécifications fonctionnelles
- ✅ Procédure complète de création et développement
- ✅ Configuration et déploiement
- ✅ Sécurité et conformité
- ✅ Guide d'utilisation

**👉 LIRE EN PREMIER** si vous découvrez le projet!

### 🚀 [EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md](./EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md)
Guide pratique pour déployer les 8 Edge Functions dans Supabase:
- ✅ Statut des CORS origins
- ✅ Pattern standard pour chaque function
- ✅ Commandes de déploiement
- ✅ Tests et vérification
- ✅ Troubleshooting

---

## ⚡ Démarrer Rapidement

### Prérequis
- Node.js >= 20.0
- npm >= 10.0
- Compte Supabase
- Clés API: Gemini, ImgBB

### Installation
```bash
npm install
```

### Configuration
Créer `.env.local`:
```env
VITE_SUPABASE_URL=https://wcrkcuugancklxirqfyl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSyD...
```

### Développement
```bash
npm run dev
# Ouvre http://localhost:3000
```

### Build Production
```bash
npm run build
npm start
```

---

## 🏗️ Stack Technologique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, i18next |
| **Backend** | Express.js, Node.js |
| **Database** | Supabase PostgreSQL, RLS |
| **Functions** | 8 Deno Edge Functions, Gemini API |
| **Deployment** | Netlify (frontend), Supabase (backend + functions) |

---

## 📱 Fonctionnalités Principales

✅ **Alertes en temps réel** - Vol, Perte, Agression, Accidents, etc.  
✅ **Chat sécurisé** - Modération IA pour prévenir extorsion  
✅ **Discussions de groupe** - Salons thématiques  
✅ **Assistant IA (Gemini)** - Conseils de sécurité et guidance  
✅ **Traduction automatique** - FR ↔ EN  
✅ **Dashboard admin** - Analytics et modération  
✅ **Multilingue** - Interface en français et anglais  
✅ **PWA-ready** - Fonctionne offline et sur mobile  

---

## 🔐 Sécurité

- ✅ JWT authentication via Supabase Auth
- ✅ Row-Level Security (RLS) sur DB
- ✅ CORS whitelist (pas de wildcard)
- ✅ Modération IA des contenus
- ✅ Chiffrement données sensibles
- ✅ Logs d'audit pour admin

---

## 📞 Support

- **Email**: support@sentinelle.com
- **WhatsApp**: +237 654 016 097
- **Channel**: https://whatsapp.com/channel/0029VbD2ZtWJ93wc2NXu6M02

---

## 📄 License

Propriétaire - Cadehub © 2026

---

**Pour plus de détails, consultez [CAHIER_DE_CHARGES_COMPLET.md](./CAHIER_DE_CHARGES_COMPLET.md)**
