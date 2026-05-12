import { Users, Stethoscope, Heart, Pill, Calculator, Clock, Activity, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Historico } from '../../services/api';

interface DashboardHomeProps {
  stats: {
    pacientes: number;
    medicos: number;
    enfermeiros: number;
    medicamentos: number;
    consultas: number;
  };
  historico?: Historico[];
}

export default function DashboardHome({ stats, historico = [] }: DashboardHomeProps) {
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

  // ─── Processamento dos Relatórios ───
  const getMonthlyData = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const counts = new Array(12).fill(0);
    
    historico.forEach(item => {
      if (item.data) {
        try {
          const date = new Date(item.data);
          if (!isNaN(date.getTime())) {
            counts[date.getMonth()]++;
          }
        } catch (e) {
          // ignora
        }
      }
    });

    return months.map((month, index) => ({
      name: month,
      consultas: counts[index]
    }));
  };

  const getTopMedications = () => {
    const medCounts: Record<string, number> = {};
    historico.forEach(item => {
      if (item.medicamento) {
        medCounts[item.medicamento] = (medCounts[item.medicamento] || 0) + 1;
      }
    });

    return Object.entries(medCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  };

  const chartData = getMonthlyData();
  const topMedications = getTopMedications();

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

      {/* ── Novas Sessões de Relatórios ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Atendimentos por Mês */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Atendimentos Mensais
            </CardTitle>
            <CardDescription>Volume de consultas realizadas ao longo dos meses</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="consultas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Sem dados suficientes para o gráfico
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medicamentos Mais Usados */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Medicamentos Mais Prescritos
            </CardTitle>
            <CardDescription>Ranking de utilização no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {topMedications.length > 0 ? (
              <div className="space-y-4">
                {topMedications.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-600' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{item.value}</span>
                      <span className="text-xs text-gray-500">usos</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">
                Sem histórico de medicamentos
              </div>
            )}
          </CardContent>
        </Card>
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
