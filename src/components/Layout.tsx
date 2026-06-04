import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "../lib/AuthContext";
import { useProfile } from "../lib/useProfile";
import { useNotifications } from "../lib/NotificationsContext";
import { useNotificationsWithOneSignal } from "../lib/useNotificationsWithOneSignal";
import { LogOut, User, Bell, Home, MessageCircle, Settings as SettingsIcon, PlusCircle, X, Sun, Moon, Trash2, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import GuideFAB from "./GuideFAB";
import IOSInstallPrompt from "./IOSInstallPrompt";

export default function Layout() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile(); // ← Récupère aussi loading
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, deleteNotification, clearNotifications } = useNotifications();
  const { unreadCount: chatUnreadCount, oneSignalReady } = useNotificationsWithOneSignal();
  const [showNotifs, setShowNotifs] = useState(false);

  // Logique conditionnelle : afficher le bouton uniquement si admin
  // Ne pas afficher tant que profileLoading === true (évite le flickering)
  const isAdmin = !profileLoading && profile?.role === 'admin';

  // Hide navbar when viewing a specific discussion (pathname = /discussions/:id)
  // Show navbar only when on /discussions (list view) or other pages
  const isDiscussionDetailPage = location.pathname.match(/^\/discussions\/[^/]+$/);
  const shouldHideNavbar = isDiscussionDetailPage;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased flex flex-col pt-3 sm:pt-4 md:pt-8 md:px-6 lg:px-8 pb-24 md:pb-8">
      {/* Top Header */}
      <header className="flex justify-between items-center md:items-end mb-4 sm:mb-6 md:mb-8 border-b border-[var(--border-color)] pb-3 sm:pb-4 md:pb-6 px-3 sm:px-4 md:px-0">
        <div className="container mx-auto flex flex-row items-center justify-between max-w-7xl gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group active:scale-95 transition-transform flex-shrink-0">
            <img 
              src={theme === "dark" 
                ? "https://res.cloudinary.com/droxtvmsy/image/upload/v1779060713/1779060412626_qkpguh.png" 
                : "https://res.cloudinary.com/droxtvmsy/image/upload/v1779060728/IMG-20260517-WA0008_pjctob.png"
              } 
              alt="Sentinelle Logo" 
              className="h-12 sm:h-16 md:h-20 object-contain transition-opacity duration-300 group-hover:scale-105" 
            />
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--text-primary)] rounded-full transition-all active:scale-95 text-[var(--text-primary)]"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>



            {/* Desktop Navigation Links */}
            <div className="hidden md:flex flex-wrap items-center gap-6">
              <Link to="/" className="hover:text-[var(--text-primary)] transition-all active:scale-95">Tableau de Bord</Link>
              <Link to="/discussions" className="relative hover:text-[var(--text-primary)] transition-all active:scale-95 flex items-center gap-2 group">
                Discussions
                {chatUnreadCount > 0 && (
                  <span className="absolute -top-3 -right-4 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
              </Link>
              <Link to="/settings" className="hover:text-[var(--text-primary)] transition-all active:scale-95">Préférences</Link>
              <Link to="/publish" className="hover:text-[var(--text-primary)] transition-all text-[var(--text-primary)] border-b border-[var(--text-primary)] pb-1 active:scale-95">Signaler</Link>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-600/30 rounded-lg hover:bg-blue-600/20 hover:border-blue-600/50 transition-all active:scale-95 text-blue-500 hover:text-blue-400">
                  <Shield size={14} /> Admin
                </Link>
              )}
              {user ? (
                 <button onClick={() => signOut()} className="flex items-center gap-2 hover:text-red-500 transition-all active:scale-95">
                   <LogOut size={14} /> Quitter
                 </button>
              ) : (
                 <Link to="/auth" className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full hover:bg-[var(--text-primary)]/90 transition-all active:scale-95">
                   <User size={14} /> Connexion
                 </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto max-w-7xl px-3 sm:px-4 md:px-0">
        <Outlet />
      </main>

      {/* iOS Install Prompt */}
      <IOSInstallPrompt />

      {/* Guide FAB Component */}
      <GuideFAB />

      {/* Mobile Bottom Navigation Bar - Hidden on discussion detail pages */}
      {!shouldHideNavbar && (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-t border-[var(--border-color-strong)] pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40">
        <div className="flex justify-around items-center px-2 py-3">
          <Link to="/" className={cn("flex flex-col items-center gap-1 p-2 transition-transform active:scale-95", location.pathname === "/" ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}>
            <Home size={22} className={cn(location.pathname === "/" && "fill-current opacity-20")} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Accueil</span>
          </Link>
          <Link to="/discussions" className={cn("flex flex-col items-center gap-1 p-2 transition-transform active:scale-95 relative", location.pathname === "/discussions" ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}>
            <div className="relative">
              <MessageCircle size={22} className={cn(location.pathname === "/discussions" && "fill-current opacity-20")} />
              {chatUnreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider">Discussions</span>
          </Link>
          <Link to="/publish" className="flex flex-col items-center gap-1 p-2 -translate-y-4 group transition-transform active:scale-95 border-b-0">
            <div className="bg-red-600 text-white p-3 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] group-hover:bg-red-500">
              <PlusCircle size={26} />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-primary)] mt-1">Alerte</span>
          </Link>
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className={cn("flex flex-col items-center gap-1 p-2 transition-transform active:scale-95", showNotifs ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}
              >
                <div className="relative">
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider">Notifs</span>
              </button>

              {showNotifs && (
                <>
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowNotifs(false)} />
                  <div className="fixed inset-x-4 bottom-24 bg-[var(--bg-card)] border border-[var(--border-color-strong)] shadow-2xl rounded-[32px] overflow-hidden z-50 text-left p-2 flex flex-col gap-1 max-h-72">
                    <div className="p-3 text-xs font-bold border-b border-[var(--border-color)] flex justify-between items-center">
                      <span>Notifications</span>
                      <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                          <button
                            onClick={() => clearNotifications()}
                            className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all active:scale-95"
                            title="Tout effacer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <button onClick={() => setShowNotifs(false)} className="p-1 hover:bg-[var(--bg-primary)] rounded-full active:scale-95">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-[10px] text-[var(--text-tertiary)] flex flex-col items-center gap-2">
                          <Bell size={24} className="opacity-20" />
                          Aucune notification
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={cn("p-3 rounded-[16px] border border-transparent hover:border-[var(--border-color)] transition-all group", !n.read && "bg-[var(--bg-primary)] border-[var(--border-color)]")}>
                            {n.link ? (
                              <button 
                                onClick={() => {
                                  markAsRead(n.id);
                                  navigate(n.link);
                                  setShowNotifs(false);
                                }}
                                className="w-full text-left block hover:opacity-80 transition-opacity active:scale-95"
                              >
                                <h4 className={cn("text-[10px] font-bold mb-1", !n.read && "text-[var(--text-primary)]")}>{n.title}</h4>
                                <p className="text-[10px] text-[var(--text-tertiary)] normal-case tracking-normal">{n.body}</p>
                              </button>
                            ) : (
                              <>
                                <h4 className={cn("text-[10px] font-bold mb-1", !n.read && "text-[var(--text-primary)]")}>{n.title}</h4>
                                <p className="text-[10px] text-[var(--text-tertiary)] normal-case tracking-normal">{n.body}</p>
                              </>
                            )}
                            <button
                              onClick={() => deleteNotification(n.id)}
                              className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[var(--text-tertiary)] hover:text-red-500 active:scale-95 text-[10px]"
                              title="Supprimer"
                            >
                              <X size={12} className="inline mr-1" /> Supprimer
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <button onClick={() => setShowNotifs(false)} className="mt-2 p-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] border-t border-[var(--border-color)] active:scale-95 transition-all">
                      Fermer
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {isAdmin && (
            <Link to="/admin" className={cn("flex flex-col items-center gap-1 p-2 transition-transform active:scale-95", location.pathname === "/admin" ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}>
              <div className="bg-blue-600/20 p-1.5 rounded-full">
                <Shield size={20} className={cn("text-blue-500", location.pathname === "/admin" && "fill-current opacity-20")} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider">Admin</span>
            </Link>
          )}
          <Link to={user ? "/settings" : "/auth"} className={cn("flex flex-col items-center gap-1 p-2 transition-transform active:scale-95", (location.pathname === "/settings" || location.pathname === "/auth") ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}>
            <SettingsIcon size={22} className={cn((location.pathname === "/settings" || location.pathname === "/auth") && "fill-current opacity-20")} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Paramètres</span>
          </Link>
        </div>
      </nav>
      )}
    </div>
  );
}
