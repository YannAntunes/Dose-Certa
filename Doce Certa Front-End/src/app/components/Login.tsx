import { useState, useEffect } from 'react';
import { Shield, AlertCircle, Loader2, HelpCircle, X, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const { t } = useLanguage();

  useEffect(() => {
    const checkServer = async () => {
      try {
        await fetch('http://localhost:8080/login', { method: 'OPTIONS' });
        setServerStatus('online');
      } catch {
        setServerStatus('offline');
      }
    };
    checkServer();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(username, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 duration-500">
        {/* Logo e Título */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/20 transform hover:scale-110 transition-transform duration-300">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Dose Certa</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t('login.subtitle')}</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-medium ml-1">{t('login.form.user')}</Label>
            <Input
              id="username"
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.form.user_ph')}
              className="w-full bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 rounded-xl h-12 transition-all"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium ml-1">{t('login.form.pass')}</Label>
            <Input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.form.pass_ph')}
              className="w-full bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500 rounded-xl h-12 transition-all"
              required
              disabled={loading}
            />
          </div>

          {/* Botão "Esqueci a senha" */}
          <div className="flex justify-end">
            <button
              type="button"
              id="forgot-password-btn"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {t('login.forgot')}
            </button>
          </div>

          {/* Aviso de senha esquecida */}
          {showForgotPassword && (
            <div className="flex items-start gap-3 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-4 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">{t('login.forgot.title')}</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1 leading-relaxed">
                  {t('login.forgot.desc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                aria-label="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 p-4 rounded-xl animate-shake duration-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-70"
            disabled={loading || serverStatus === 'offline'}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('login.btn.entering')}
              </>
            ) : (
              t('login.btn.enter')
            )}
          </Button>
        </form>

        {/* Status do servidor */}
        <div className="mt-8 p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3">
          {serverStatus === 'checking' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <p className="text-xs text-slate-500 font-medium">{t('login.server.checking')}</p>
            </>
          )}
          {serverStatus === 'online' && (
            <>
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold tracking-tight uppercase">{t('login.server.online')}</p>
            </>
          )}
          {serverStatus === 'offline' && (
            <>
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold tracking-tight uppercase">{t('login.server.offline')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
