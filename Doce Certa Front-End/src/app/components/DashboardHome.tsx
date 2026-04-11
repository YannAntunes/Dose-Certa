import { Users, Stethoscope, Heart, Pill, Calculator, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface DashboardHomeProps {
  stats: {
    pacientes: number;
    medicos: number;
    enfermeiros: number;
    medicamentos: number;
    consultas: number;
  };
}

export default function DashboardHome({ stats }: DashboardHomeProps) {
  const cards = [
    {
      title: 'Pacientes',
      value: stats.pacientes,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Médicos',
      value: stats.medicos,
      icon: Stethoscope,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Enfermeiros',
      value: stats.enfermeiros,
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    },
    {
      title: 'Medicamentos',
      value: stats.medicamentos,
      icon: Pill,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Consultas Realizadas',
      value: stats.consultas,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardHeader>
          <CardTitle>Bem-vindo ao Sistema Dose Certa</CardTitle>
          <CardDescription className="text-blue-100">
            Sistema profissional para cálculo e gestão de dosagem de medicamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            <p>Utilize o menu lateral para navegar entre as funcionalidades do sistema</p>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl ${card.color}`}>{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recursos Principais</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Cadastro completo de pacientes, médicos e enfermeiros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Cálculo automático de dosagens baseado em peso</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Histórico completo de consultas realizadas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Controle de acesso por perfil de usuário</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança e Conformidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Sistema voltado para uso profissional</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Validação de doses máximas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Rastreabilidade completa de ações</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Interface intuitiva para redução de erros</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
