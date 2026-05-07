import { ReactNode } from 'react';
import { 
  Users, 
  Stethoscope, 
  Heart, 
  Pill, 
  Calculator, 
  Clock, 
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import { Button } from './ui/button';

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
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'RECEPCAO', 'Administrador', 'Médico', 'Enfermeiro', 'Recepção'] },
    { id: 'pacientes', label: 'Pacientes', icon: Users, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'RECEPCAO', 'Administrador', 'Médico', 'Enfermeiro', 'Recepção'] },
    { id: 'medicos', label: 'Médicos', icon: Stethoscope, roles: ['ADMIN', 'RECEPCAO', 'Administrador', 'Recepção'] },
    { id: 'enfermeiros', label: 'Enfermeiros', icon: Heart, roles: ['ADMIN', 'RECEPCAO', 'Administrador', 'Recepção'] },
    { id: 'medicamentos', label: 'Medicamentos', icon: Pill, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'Administrador', 'Médico', 'Enfermeiro'] },
    { id: 'consulta', label: 'Consulta / Cálculo', icon: Calculator, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'Administrador', 'Médico', 'Enfermeiro'] },
    { id: 'historico', label: 'Histórico', icon: Clock, roles: ['ADMIN', 'MEDICO', 'ENFERMEIRO', 'Administrador', 'Médico', 'Enfermeiro'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-blue-900">Dose Certa</h1>
              <p className="text-xs text-gray-600">Sistema de Dosagem</p>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-900">
                {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-600">Bem-vindo ao sistema Dose Certa</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-gray-900">{username}</p>
                <p className="text-sm text-gray-600">{role}</p>
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={onLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
