import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DashboardHome from './components/DashboardHome';
import Pacientes from './components/Pacientes';
import Medicos from './components/Medicos';
import Enfermeiros from './components/Enfermeiros';
import Medicamentos from './components/Medicamentos';
import Consulta from './components/Consulta';
import Historico from './components/Historico';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { 
  pacienteService, 
  medicoService, 
  enfermeiroService, 
  medicamentoService,
  historicoService,
  authService,
  Paciente,
  Medico,
  Enfermeiro,
  Medicamento,
  Historico as HistoricoType
} from '../services/api';

interface User {
  username: string;
  role: string;
  id?: number;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Estados para dados da API
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [historico, setHistorico] = useState<HistoricoType[]>([]);

  // Estados de carregamento
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [loadingMedicos, setLoadingMedicos] = useState(true);
  const [loadingEnfermeiros, setLoadingEnfermeiros] = useState(true);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(true);

  // Limpa token invalido do localStorage ao iniciar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Valida se o token ainda e aceito pelo backend
      fetch('http://localhost:8080/pacientes', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {
        localStorage.removeItem('token');
      }).then((res) => {
        if (res && !res.ok) {
          localStorage.removeItem('token');
        }
      });
    }
  }, []);

  // Carregar dados quando o usuário faz login
  useEffect(() => {
    if (user) {
      carregarDados();
    }
  }, [user]);


  const carregarDados = async () => {
    try {
      const [pacientesData, medicosData, enfermeirosData, medicamentosData, historicoData] = 
        await Promise.all([
          pacienteService.listar(),
          medicoService.listar(),
          enfermeiroService.listar(),
          medicamentoService.listar(),
          historicoService.listar()
        ]);

      setPacientes(pacientesData || []);
      setMedicos(medicosData || []);
      setEnfermeiros(enfermeirosData || []);
      setMedicamentos(medicamentosData || []);
      setHistorico(historicoData || []);

      setLoadingPacientes(false);
      setLoadingMedicos(false);
      setLoadingEnfermeiros(false);
      setLoadingMedicamentos(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do servidor');
      setLoadingPacientes(false);
      setLoadingMedicos(false);
      setLoadingEnfermeiros(false);
      setLoadingMedicamentos(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password);
      const userInfo: User = {
        username: response.login,
        role: response.perfil,
        id: response.id
      };
      setUser(userInfo);
      toast.success(`Bem-vindo, ${response.login}!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
      toast.error(errorMessage);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentPage('dashboard');
    toast.info('Você saiu do sistema');
  };

  const handleAddPaciente = async (paciente: Omit<Paciente, 'id'>) => {
    try {
      const newPaciente = await pacienteService.criar(paciente);
      setPacientes([...pacientes, newPaciente]);
      toast.success('Paciente cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao cadastrar paciente:', error);
    }
  };

  const handleAddMedico = async (medico: Omit<Medico, 'id'>) => {
    try {
      const newMedico = await medicoService.criar(medico);
      setMedicos([...medicos, newMedico]);
      toast.success('Médico cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao cadastrar médico:', error);
    }
  };

  const handleAddEnfermeiro = async (enfermeiro: Omit<Enfermeiro, 'id'>) => {
    try {
      const newEnfermeiro = await enfermeiroService.criar(enfermeiro);
      setEnfermeiros([...enfermeiros, newEnfermeiro]);
      toast.success('Enfermeiro cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao cadastrar enfermeiro:', error);
    }
  };

  const handleAddMedicamento = async (medicamento: Omit<Medicamento, 'id'>) => {
    try {
      const newMedicamento = await medicamentoService.criar(medicamento);
      setMedicamentos([...medicamentos, newMedicamento]);
      toast.success('Medicamento cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao cadastrar medicamento:', error);
    }
  };

  const handleSaveConsulta = async (consulta: any) => {
    try {
      // Aqui você pode chamar o serviço de consultas se existir
      setHistorico([consulta, ...historico]);
      toast.success('Consulta salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar consulta:', error);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardHome 
            stats={{
              pacientes: pacientes.length,
              medicos: medicos.length,
              enfermeiros: enfermeiros.length,
              medicamentos: medicamentos.length,
              consultas: historico.length
            }}
          />
        );
      case 'pacientes':
        return <Pacientes pacientes={pacientes} onAddPaciente={handleAddPaciente} />;
      case 'medicos':
        return <Medicos medicos={medicos} onAddMedico={handleAddMedico} />;
      case 'enfermeiros':
        return <Enfermeiros enfermeiros={enfermeiros} onAddEnfermeiro={handleAddEnfermeiro} />;
      case 'medicamentos':
        return <Medicamentos medicamentos={medicamentos} onAddMedicamento={handleAddMedicamento} />;
      case 'consulta':
        return (
          <Consulta
            pacientes={pacientes}
            medicos={medicos}
            enfermeiros={enfermeiros}
            medicamentos={medicamentos}
            onSaveConsulta={handleSaveConsulta}
          />
        );
      case 'historico':
        return <Historico historico={historico} />;
      default:
        return <DashboardHome 
          stats={{
            pacientes: pacientes.length,
            medicos: medicos.length,
            enfermeiros: enfermeiros.length,
            medicamentos: medicamentos.length,
            consultas: historico.length
          }}
        />;
    }
  };

  return (
    <>
      <Dashboard
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        username={user.username}
        role={user.role}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Dashboard>
      <Toaster position="top-right" />
    </>
  );
}

export default App;