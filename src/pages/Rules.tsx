import { useNavigate } from 'react-router'
import { ArrowLeft, Shield, DollarSign, Lock, Link as LinkIcon, AlertCircle, CheckCircle2, Zap } from 'lucide-react'

export default function Rules() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold">Règles de la communauté</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        
        {/* Introduction Section */}
        <section className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
              Bienvenue sur Sentinelle
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed text-base sm:text-lg">
              Sentinelle est un réseau d'alerte citoyenne dédié à la <strong>sécurité communautaire</strong>, 
              l'<strong>intégrité</strong> et la <strong>confiance</strong> entre citoyens. Notre mission est de 
              créer un espace sûr où chacun peut signaler des incidents et s'entraider sans risque d'arnaque ou d'exploitation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4 space-y-2">
              <Shield className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold">Sécurité</h3>
              <p className="text-sm text-[var(--text-tertiary)]">Protéger les utilisateurs contre les arnaques et harcèlements</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4 space-y-2">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold">Intégrité</h3>
              <p className="text-sm text-[var(--text-tertiary)]">Maintenir la confiance et la fiabilité de la plateforme</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4 space-y-2">
              <Lock className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold">Confidentialité</h3>
              <p className="text-sm text-[var(--text-tertiary)]">Protéger les données personnelles de chacun</p>
            </div>
          </div>
        </section>

        {/* Rules Section */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Nos règles essentielles</h2>

          {/* Rule 1: Financial Transactions */}
          <div className="bg-[var(--bg-card)] border-l-4 border-l-red-600 border border-[var(--border-color)] rounded-lg p-5 sm:p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg flex-shrink-0">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-red-600">Règle 1 : Interdiction des transactions financières</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Les demandes d'argent, de rançon, d'extorsion ou de chantage sont <strong>strictement interdites</strong> 
                  dans le chat de Sentinelle.
                </p>
                <div className="space-y-2 mt-3 text-sm">
                  <p className="text-[var(--text-secondary)]"><strong>Cela inclut :</strong></p>
                  <ul className="space-y-1 ml-4 text-[var(--text-secondary)]">
                    <li>✗ Demandes de rançon ou de ranço​n déguisée</li>
                    <li>✗ Partages de numéros Momo, Orange Money, Wave</li>
                    <li>✗ Demandes d'avances de fonds ou de "cotisation"</li>
                    <li>✗ Propositions de transactions financières de toute forme</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 2: Data Protection */}
          <div className="bg-[var(--bg-card)] border-l-4 border-l-orange-600 border border-[var(--border-color)] rounded-lg p-5 sm:p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg flex-shrink-0">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-orange-600">Règle 2 : Protection des données personnelles</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Ne jamais publier de coordonnées personnelles dans le chat public. Vos données pourraient être 
                  utilisées à mauvais escient pour du harcèlement ou des arnaques.
                </p>
                <div className="space-y-2 mt-3 text-sm">
                  <p className="text-[var(--text-secondary)]"><strong>Données protégées :</strong></p>
                  <ul className="space-y-1 ml-4 text-[var(--text-secondary)]">
                    <li>✗ Numéros de téléphone (avec ou sans pays)</li>
                    <li>✗ Adresses e-mail et messagerie instantanée</li>
                    <li>✗ Identifiants de réseaux sociaux (WhatsApp, Telegram, Facebook, Instagram, TikTok...)</li>
                    <li>✗ Adresses physiques ou localisations précises</li>
                  </ul>
                  <p className="text-[var(--text-secondary)] mt-3"><strong>À la place :</strong> Utilisez le système de chat 
                  sécurisé interne de Sentinelle pour échanger directement avec un autre utilisateur.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 3: External Links */}
          <div className="bg-[var(--bg-card)] border-l-4 border-l-yellow-600 border border-[var(--border-color)] rounded-lg p-5 sm:p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg flex-shrink-0">
                <LinkIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-yellow-600">Règle 3 : Liens externes interdits</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Pour prévenir le phishing et les attaques malveillantes, <strong>seuls les liens officiels de Sentinelle 
                  sont autorisés</strong>.
                </p>
                <div className="space-y-2 mt-3 text-sm">
                  <p className="text-[var(--text-secondary)]"><strong>Liens autorisés :</strong></p>
                  <ul className="space-y-1 ml-4 text-[var(--text-secondary)]">
                    <li>✓ sentinelle.com</li>
                    <li>✓ sentinelle.netlify.app</li>
                    <li>✓ localhost (en développement)</li>
                  </ul>
                  <p className="text-[var(--text-secondary)] mt-3"><strong>Tous les autres liens seront bloqués :</strong> 
                  URLs externes, bit.ly, pastebin, etc. peuvent contenir des malwares ou servir à voler des données.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Consequences Section */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Conséquences des manquements</h2>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="space-y-3 flex-1">
                <h3 className="text-lg font-bold text-red-600">Blocage automatique et bannissement</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Tout message violant ces règles sera <strong>bloqué automatiquement</strong> avant envoi par notre 
                  système de sécurité alimenté par l'IA.
                </p>
                <div className="bg-white dark:bg-[var(--bg-primary)] p-4 rounded border border-red-200 dark:border-red-800 space-y-2 text-sm">
                  <p className="text-[var(--text-secondary)]">
                    <Zap className="w-4 h-4 text-red-600 inline mr-2" />
                    <strong>Premier manquement :</strong> Message bloqué + avertissement
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    <Zap className="w-4 h-4 text-red-600 inline mr-2" />
                    <strong>Manquements répétés :</strong> Bannissement temporaire (7-30 jours)
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    <Zap className="w-4 h-4 text-red-600 inline mr-2" />
                    <strong>Violations graves :</strong> Bannissement définitif du compte
                  </p>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Les administrateurs Sentinelle se réservent le droit de prendre des mesures disciplinaires 
                  appropriées en cas de comportement abusif.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-bold">Vous avez une question ?</h3>
          <p className="text-[var(--text-secondary)]">
            Si vous avez besoin d'aide, pensez avoir trouvé un contenu malveillant, ou souhaitez faire un signalement, 
            contactez notre équipe support :
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-[var(--text-secondary)]">
              <strong>Email:</strong> <a href="mailto:support@sentinelle.com" className="text-blue-600 hover:underline">support@sentinelle.com</a>
            </p>
            <p className="text-[var(--text-secondary)]">
              <strong>WhatsApp:</strong> <a href="https://wa.me/237654016097" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">+237 654 016 097</a>
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 sm:p-6 text-center space-y-3">
          <p className="text-[var(--text-secondary)] leading-relaxed">
            En utilisant Sentinelle, vous acceptez de respecter ces règles et contribuez à maintenir une communauté 
            sûre et bienveillante. <strong>Merci de votre engagement !</strong>
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
          >
            Retour
          </button>
        </div>

        {/* Spacing */}
        <div className="h-6" />
      </div>
    </div>
  )
}

