import { Users, Stethoscope, Heart, Pill, Calculator, Clock, Activity, BarChart3, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Historico } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();

  const cards = [
    {
      title: t('menu.pacientes'),
      value: stats.pacientes,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/40'
    },
    {
      title: t('menu.medicos'),
      value: stats.medicos,
      icon: Stethoscope,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-100 dark:bg-teal-900/40'
    },
    {
      title: t('menu.enfermeiros'),
      value: stats.enfermeiros,
      icon: Heart,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-100 dark:bg-rose-900/40'
    },
    {
      title: t('menu.medicamentos'),
      value: stats.medicamentos,
      icon: Pill,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/40'
    },
    {
      title: t('dash.stats.consultas'),
      value: stats.consultas,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/40'
    }
  ];

  // ─── Processamento dos Relatórios ───
  const getMonthlyData = () => {
    const isEn = t('common.status') === 'Status';
    const months = isEn 
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const counts = new Array(12).fill(0);
    const currentYear = new Date().getFullYear();
    
    historico.forEach(item => {
      if (item.data) {
        try {
          const date = new Date(item.data);
          if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Message */}
      <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white border-0 shadow-xl shadow-blue-900/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl font-bold tracking-tight">{t('dash.welcome.title')}</CardTitle>
          <CardDescription className="text-blue-100 text-base mt-1">
            {t('dash.welcome.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex items-center gap-3 text-blue-50 bg-white/10 w-fit px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
            <Calculator className="w-5 h-5" />
            <p className="font-medium">{t('dash.welcome.nav')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="group hover:shadow-lg hover:shadow-blue-900/5 dark:hover:shadow-blue-900/20 transition-all duration-300 border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">{card.title}</CardTitle>
                <div className={`p-2.5 rounded-xl ${card.bgColor} shadow-inner`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Novas Sessões de Relatórios ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Atendimentos por Mês */}
        <Card className="col-span-1 border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              {t('dash.chart.title')}
            </CardTitle>
            <CardDescription className="dark:text-slate-400">{t('dash.chart.desc')}</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }}
                  />
                  <Bar dataKey="consultas" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">
                {t('common.status') === 'Status' ? 'Not enough data for chart' : 'Sem dados suficientes para o gráfico'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medicamentos Mais Usados */}
        <Card className="col-span-1 border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Activity className="w-5 h-5 text-rose-500" />
              {t('dash.meds.title')}
            </CardTitle>
            <CardDescription className="dark:text-slate-400">{t('dash.meds.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {topMedications.length > 0 ? (
              <div className="space-y-4">
                {topMedications.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                        index === 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' :
                        index === 1 ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                        index === 2 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' :
                        'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        #{index + 1}
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('dash.meds.uses')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                {t('common.status') === 'Status' ? 'No medication history' : 'Sem histórico de medicamentos'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              {t('dash.features.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg">
                <span className="text-blue-500 mt-0.5">•</span>
                <span className="font-medium">{t('dash.features.1')}</span>
              </li>
              <li className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg">
                <span className="text-indigo-500 mt-0.5">•</span>
                <span className="font-medium">{t('dash.features.2')}</span>
              </li>
              <li className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg">
                <span className="text-purple-500 mt-0.5">•</span>
                <span className="font-medium">{t('dash.features.3')}</span>
              </li>
              <li className="flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg">
                <span className="text-rose-500 mt-0.5">•</span>
                <span className="font-medium">{t('dash.features.4')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              {t('dash.security.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-medium">{t('dash.security.1')}</span>
              </li>
              <li className="flex items-start gap-3 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-medium">{t('dash.security.2')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
