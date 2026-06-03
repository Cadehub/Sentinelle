#!/usr/bin/env bash

# 🚀 SENTINELLE - PRODUCTION PRE-DEPLOYMENT VERIFICATION SCRIPT
# Usage: bash verify-production.sh

echo "🔍 Vérification de la production Sentinelle..."
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Node.js version
echo "📦 Vérification Node.js..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    echo "✅ Node.js $(node -v)"
else
    echo "❌ Node.js doit être >= 20.0"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: Dependencies
echo "📚 Vérification des dépendances..."
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installées"
else
    echo "⚠️  node_modules non trouvé - installation en cours..."
    npm install --legacy-peer-deps
fi
echo ""

# Check 3: Build
echo "🔨 Compilation du build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build compilé avec succès"
    BUILD_SIZE=$(du -sh dist | awk '{print $1}')
    echo "   Taille: $BUILD_SIZE"
else
    echo "❌ Build échoué"
    npm run build
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: TypeScript errors
echo "🔎 Vérification TypeScript..."
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || true)
if [ "$TS_ERRORS" -eq 0 ]; then
    echo "✅ Zéro erreurs TypeScript"
else
    echo "⚠️  $TS_ERRORS erreurs TypeScript détectées"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 5: Environment variables
echo "🔑 Vérification des variables d'environnement..."
REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "$(eval echo \\$$var)" ]; then
        echo "⚠️  $var non défini (à configurer dans Netlify)"
        WARNINGS=$((WARNINGS + 1))
    fi
done
echo "✅ Vérification faite"
echo ""

# Check 6: Critical files
echo "📁 Vérification des fichiers critiques..."
CRITICAL_FILES=(
    "src/App.tsx"
    "src/pages/Home.tsx"
    "src/lib/supabase.ts"
    "supabase/config.toml"
    "netlify.toml"
    "vite.config.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file MANQUANT"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 7: Supabase migrations
echo "🗄️  Vérification des migrations..."
MIGRATIONS_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
if [ "$MIGRATIONS_COUNT" -gt 0 ]; then
    echo "✅ $MIGRATIONS_COUNT migrations trouvées"
    ls -1 supabase/migrations/*.sql | sed 's/^/   /'
else
    echo "❌ Aucune migration trouvée"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 8: Edge Functions
echo "⚡ Vérification des Edge Functions..."
FUNCTIONS_COUNT=$(ls -1d supabase/functions/*/ 2>/dev/null | wc -l)
if [ "$FUNCTIONS_COUNT" -gt 0 ]; then
    echo "✅ $FUNCTIONS_COUNT Edge Functions trouvées"
    ls -1d supabase/functions/*/ | sed 's/^/   /'
else
    echo "❌ Aucune Edge Function trouvée"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 9: Git status
echo "📝 Vérification Git..."
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    UNCOMMITTED=$(git status --porcelain | wc -l)
    if [ "$UNCOMMITTED" -eq 0 ]; then
        echo "✅ Aucun changement uncommitted"
    else
        echo "⚠️  $UNCOMMITTED fichiers modifiés"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "   Branch: $BRANCH"
else
    echo "⚠️  Pas de repository Git trouvé"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 10: dist folder
echo "📦 Vérification du build..."
if [ -d "dist" ]; then
    echo "✅ dossier dist existe"
    DIST_SIZE=$(du -sh dist | awk '{print $1}')
    FILE_COUNT=$(find dist -type f | wc -l)
    echo "   Taille: $DIST_SIZE"
    echo "   Fichiers: $FILE_COUNT"
else
    echo "❌ dossier dist manquant"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "=============================================="
echo "📊 RÉSUMÉ"
echo "=============================================="
echo "✅ OK: $(($ERRORS == 0 && $WARNINGS == 0 ? 'OUI' : 'NON'))"
echo "❌ Erreurs: $ERRORS"
echo "⚠️  Warnings: $WARNINGS"
echo ""

if [ "$ERRORS" -eq 0 ]; then
    if [ "$WARNINGS" -eq 0 ]; then
        echo "🎉 PRÊT POUR LA PRODUCTION!"
        echo ""
        echo "Prochaines étapes:"
        echo "1. Configurer les variables d'env dans Netlify Dashboard"
        echo "2. Vérifier les secrets dans Supabase"
        echo "3. git push origin main"
        echo "4. Vérifier le build sur Netlify Dashboard"
        echo "5. Tester sur https://sentinelle-v1.netlify.app"
        exit 0
    else
        echo "⚠️  Production possible avec warnings - à corriger"
        exit 0
    fi
else
    echo "❌ NON PRÊT - Corriger les erreurs avant production"
    exit 1
fi
