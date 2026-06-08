import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { supabase } from "../lib/supabase";
import { ArrowLeft, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "../lib/utils";


export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Inscription réussie. Vérifiez vos emails si nécessaire, ou connectez-vous.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-10 animate-in fade-in zoom-in-95 duration-500">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 mb-6 transition-transform">
        <ArrowLeft size={16} /> Retour
      </Link>

      <div className="ui-card p-7 sm:p-8 flex flex-col items-center">
        <img 
          src="https://res.cloudinary.com/droxtvmsy/image/upload/v1779123733/1779123400829_cjh9le.png" 
          alt="Sentinelle Logo" 
          className="w-28 h-28 object-contain mb-7" 
        />

        <h1 className="text-2xl font-bold tracking-tight mb-2 text-center w-full">
          {isLogin ? "Connexion" : "Inscription"}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-8 text-center w-full">
          {isLogin ? "Accédez à votre compte pour publier ou gérer vos alertes." : "Rejoignez la plateforme de vigilance citoyenne."}
        </p>

        {error && (
          <div className="w-full bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 flex gap-3 items-start mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="w-full bg-green-500/10 text-green-500 p-4 rounded-xl border border-green-500/20 flex gap-3 items-start mb-6">
            <p className="font-medium text-sm">{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Email
            </label>
            <input
              required
              type="email"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors placeholder:text-[var(--text-tertiary)]"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Mot de passe
            </label>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 pr-12 text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors placeholder:text-[var(--text-tertiary)]"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-90"
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>



          <button
            type="submit"
            disabled={loading}
            className="ui-primary-button w-full active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? "Se connecter" : "S'inscrire")}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="ml-2 font-bold text-[var(--text-primary)] hover:underline active:scale-95 transition-transform inline-block"
          >
            {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
          </button>
        </div>
      </div>
    </div>
  );
}
