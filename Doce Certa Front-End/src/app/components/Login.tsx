import { useState, useEffect } from 'react';
import {
  Shield,
  AlertCircle,
  Loader2,
  HelpCircle,
  X,
  Info,
  UserPlus,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useLanguage } from '../../contexts/LanguageContext';
import { checkApiConnection, usuarioService } from '../../services/api';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Estado do formulário de cadastro público
  const [regLogin, setRegLogin] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmSenha, setRegConfirmSenha] = useState('');
  const [regPerfil, setRegPerfil] = useState<'MEDICO' | 'ENFERMEIRO' | 'RECEPCAO'>('RECEPCAO');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const { t } = useLanguage();
  const isFormValid = username.trim().length > 0 && password.trim().length > 0;

  useEffect(() => {
    let cancelled = false;

    checkApiConnection()
      .then((health) => {
        if (!cancelled) {
          setServerStatus(health.status === 'UP' && health.database === 'UP' ? 'online' : 'offline');
        }
      })
      .catch(() => {
        if (!cancelled) setServerStatus('offline');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password.trim()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onLogin(trimmedUsername, password);
      setServerStatus('online');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMessage);
      if (errorMessage.startsWith('Não foi possível conectar à API')) {
        setServerStatus('offline');
      } else {
        setServerStatus('online');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    const trimmed = regLogin.trim();
    if (trimmed.length < 3) {
      setRegError('O login deve ter pelo menos 3 caracteres.');
      return;
    }
    if (regSenha.length < 8 || !/\d/.test(regSenha)) {
      setRegError('A senha deve ter pelo menos 8 caracteres e conter ao menos 1 número.');
      return;
    }
    if (regSenha !== regConfirmSenha) {
      setRegError('As senhas informadas não conferem.');
      return;
    }

    setRegLoading(true);
    try {
      const created = await usuarioService.solicitarCadastroPublico({
        login: trimmed,
        senha: regSenha,
        perfilSolicitado: regPerfil,
      });
      setServerStatus('online');
      setRegSuccess(
        `Solicitação enviada com sucesso para "${created.login}" (status: ${created.status || 'PENDENTE'}). Aguarde a aprovação de um administrador para acessar o sistema.`
      );
      setRegLogin('');
      setRegSenha('');
      setRegConfirmSenha('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao solicitar cadastro.';
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 duration-500">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-5 shadow-xl shadow-blue-500/20 transform hover:scale-110 transition-transform duration-300">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Dose Certa</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {mode === 'login' ? t('login.subtitle') : 'Solicitação de Cadastro de Acesso'}
          </p>
        </div>

        {mode === 'login' ? (
          /* ── Formulário de Login ── */
          <form onSubmit={handleSubmit} className="space-y-5">
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
            <div className="flex justify-between items-center">
              <button
                type="button"
                data-testid="toggle-register-btn"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setRegError('');
                  setRegSuccess('');
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Solicitar cadastro
              </button>

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
              <div
                role="alert"
                data-testid="login-error"
                className="flex items-center gap-3 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 p-4 rounded-xl animate-shake duration-300"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-70"
              disabled={loading || !isFormValid}
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
        ) : (
          /* ── Formulário de Cadastro Público (Status PENDENTE) ── */
          <form onSubmit={handleRegisterSubmit} data-testid="register-form" className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              Novas contas são criadas com status <strong>PENDENTE</strong> e exigem aprovação de um administrador antes da liberação do acesso clínico.
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-login" className="text-slate-700 dark:text-slate-300 font-medium">
                Nome de usuário (Login)
              </Label>
              <Input
                id="reg-login"
                data-testid="reg-login-input"
                type="text"
                value={regLogin}
                onChange={(e) => setRegLogin(e.target.value)}
                placeholder="Ex: dra.ana.souza"
                required
                disabled={regLoading}
                className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-perfil" className="text-slate-700 dark:text-slate-300 font-medium">
                Função solicitada (sujeita à revisão do Administrador)
              </Label>
              <select
                id="reg-perfil"
                data-testid="reg-perfil-select"
                value={regPerfil}
                onChange={(e) =>
                  setRegPerfil(e.target.value as 'MEDICO' | 'ENFERMEIRO' | 'RECEPCAO')
                }
                disabled={regLoading}
                className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="RECEPCAO">Recepção</option>
                <option value="ENFERMEIRO">Enfermeiro(a)</option>
                <option value="MEDICO">Médico(a)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-senha" className="text-slate-700 dark:text-slate-300 font-medium">
                Senha (mín. 8 caracteres e 1 número)
              </Label>
              <Input
                id="reg-senha"
                data-testid="reg-senha-input"
                type="password"
                value={regSenha}
                onChange={(e) => setRegSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres com número"
                required
                disabled={regLoading}
                className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-confirm-senha" className="text-slate-700 dark:text-slate-300 font-medium">
                Confirmar Senha
              </Label>
              <Input
                id="reg-confirm-senha"
                data-testid="reg-confirm-senha-input"
                type="password"
                value={regConfirmSenha}
                onChange={(e) => setRegConfirmSenha(e.target.value)}
                placeholder="Repita a senha"
                required
                disabled={regLoading}
                className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl h-11"
              />
            </div>

            {regError && (
              <div
                role="alert"
                data-testid="register-error"
                className="flex items-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div
                role="status"
                data-testid="register-success"
                className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-xl text-xs font-medium"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{regSuccess}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="submit"
                data-testid="register-submit-btn"
                disabled={regLoading || !regLogin.trim() || !regSenha || !regConfirmSenha}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-5 rounded-xl"
              >
                {regLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando solicitação...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Enviar Solicitação de Cadastro
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                data-testid="back-to-login-btn"
                onClick={() => {
                  setMode('login');
                  setRegError('');
                }}
                className="w-full text-xs text-slate-600 dark:text-slate-400"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Voltar para o Login
              </Button>
            </div>
          </form>
        )}

        {/* Status do servidor */}
        <div
          data-testid="server-status"
          className="mt-6 p-3 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3"
        >
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
