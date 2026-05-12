import { ReactNode } from 'react';
import { 
  Users, 
  Stethoscope, 
  Heart, 
  Pill, 
  Calculator, 
  Clock, 
  LogOut,
  LayoutDashboard,
  UserCog,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from 'next-themes';

interface DashboardProps {
  children: ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  username: string;
  role: string;
  onLogout: () => void;
}

export default function Dashboard({ 
  children, 
  currentPage, 
  onPageChange, 
  username, 
  role,
  onLogout 
}: DashboardProps) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const menuItems = [
    { id: 'dashboard', label: t('menu.dashboard'), icon: LayoutDashboard, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'RECEPCAO', 'Administrador', 'Médico', 'Enfermeiro', 'Recepção'] },
    { id: 'pacientes', label: t('menu.pacientes'), icon: Users, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'RECEPCAO', 'Administrador', 'Médico', 'Enfermeiro', 'Recepção'] },
    { id: 'medicos', label: t('menu.medicos'), icon: Stethoscope, roles: ['ADMIN', 'RECEPCAO', 'Administrador', 'Recepção'] },
    { id: 'enfermeiros', label: t('menu.enfermeiros'), icon: Heart, roles: ['ADMIN', 'RECEPCAO', 'Administrador', 'Recepção'] },
    { id: 'medicamentos', label: t('menu.medicamentos'), icon: Pill, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'Administrador', 'Médico', 'Enfermeiro'] },
    { id: 'consulta', label: t('menu.consulta'), icon: Calculator, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'Administrador', 'Médico', 'Enfermeiro'] },
    { id: 'historico', label: t('menu.historico'), icon: Clock, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'Administrador', 'Médico', 'Enfermeiro'] },
    { id: 'usuarios', label: t('menu.usuarios'), icon: UserCog, roles: ['ADMIN', 'Administrador'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl shadow-blue-900/5 z-20">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Dose Certa</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">{language === 'pt' ? 'Sistema de Dosagem' : 'Dosage System'}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 transition-transform' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {menuItems.find(item => item.id === currentPage)?.label || t('menu.dashboard')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('topbar.welcome')}</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-700 pr-6">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
                  title={language === 'pt' ? 'Switch to English' : 'Mudar para Português'}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <Globe className="w-5 h-5" />
                  <span className="sr-only">Toggle Language</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title={theme === 'dark' ? t('topbar.theme.light') : t('topbar.theme.dark')}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span className="sr-only">Toggle Theme</span>
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{username}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{role}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onLogout}
                  title={t('menu.logout')}
                  className="border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
