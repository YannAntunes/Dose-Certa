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
import Usuarios from './components/Usuarios';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import {
  pacienteService,
  medicoService,
  enfermeiroService,
  medicamentoService,
  historicoService,
  consultaService,
  usuarioService,
  authService,
  Paciente,
  Medico,
  Enfermeiro,
  Medicamento,
  Historico as HistoricoType,
  Usuario,
  UsuarioRequest,
} from '../services/api';

interface User {
  username: string;
  role: string;
  id?: number;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Dados da API
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [enfermeiros, setEnfermeiros] = useState<Enfermeiro[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [historico, setHistorico] = useState<HistoricoType[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  /** Dados de um atendimento do histórico para pré-preencher a aba Consulta */
  const [consultaInicial, setConsultaInicial] = useState<any | null>(null);

  // Estados de carregamento
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [loadingMedicos, setLoadingMedicos] = useState(true);
  const [loadingEnfermeiros, setLoadingEnfermeiros] = useState(true);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(true);

  // Limpa token inválido do localStorage ao iniciar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
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
      // Carrega usuários apenas para ADMIN
      if (user.role === 'ADMIN' || user.role === 'Administrador') {
        carregarUsuarios();
      }
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

  const carregarUsuarios = async () => {
    try {
      const data = await usuarioService.listar();
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
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
      setPacientes(prev => [...prev, newPaciente]);
      toast.success('Paciente cadastrado com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao cadastrar paciente');
    }
  };

  const handleUpdatePaciente = async (id: number, paciente: Omit<Paciente, 'id'>) => {
    try {
      const updated = await pacienteService.atualizar(id, paciente);
      setPacientes(prev => prev.map(p => p.id === id ? updated : p));
      toast.success('Paciente atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar paciente');
    }
  };

  const handleDeletePaciente = async (id: number) => {
    try {
      await pacienteService.deletar(id);
      setPacientes(prev => prev.filter(p => p.id !== id));
      toast.success('Paciente excluído com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir paciente');
    }
  };

  const handleAddMedico = async (medico: Omit<Medico, 'id'>) => {
    try {
      const newMedico = await medicoService.criar(medico);
      setMedicos(prev => [...prev, newMedico]);
      toast.success('Médico cadastrado com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao cadastrar médico');
    }
  };

  const handleUpdateMedico = async (id: number, medico: Omit<Medico, 'id'>) => {
    try {
      const updated = await medicoService.atualizar(id, medico);
      setMedicos(prev => prev.map(m => m.id === id ? updated : m));
      toast.success('Médico atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar médico');
    }
  };

  const handleDeleteMedico = async (id: number) => {
    try {
      await medicoService.deletar(id);
      setMedicos(prev => prev.filter(m => m.id !== id));
      toast.success('Médico excluído com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir médico');
    }
  };

  const handleAddEnfermeiro = async (enfermeiro: Omit<Enfermeiro, 'id'>) => {
    try {
      const newEnfermeiro = await enfermeiroService.criar(enfermeiro);
      setEnfermeiros(prev => [...prev, newEnfermeiro]);
      toast.success('Enfermeiro cadastrado com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao cadastrar enfermeiro');
    }
  };

  const handleUpdateEnfermeiro = async (id: number, enfermeiro: Omit<Enfermeiro, 'id'>) => {
    try {
      const updated = await enfermeiroService.atualizar(id, enfermeiro);
      setEnfermeiros(prev => prev.map(e => e.id === id ? updated : e));
      toast.success('Enfermeiro atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar enfermeiro');
    }
  };

  const handleDeleteEnfermeiro = async (id: number) => {
    try {
      await enfermeiroService.deletar(id);
      setEnfermeiros(prev => prev.filter(e => e.id !== id));
      toast.success('Enfermeiro excluído com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir enfermeiro');
    }
  };

  const handleAddMedicamento = async (medicamento: Omit<Medicamento, 'id'>) => {
    try {
      const newMedicamento = await medicamentoService.criar(medicamento);
      setMedicamentos(prev => [...prev, newMedicamento]);
      toast.success('Medicamento cadastrado com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao cadastrar medicamento');
    }
  };

  const handleUpdateMedicamento = async (id: number, medicamento: Omit<Medicamento, 'id'>) => {
    try {
      const updated = await medicamentoService.atualizar(id, medicamento);
      setMedicamentos(prev => prev.map(m => m.id === id ? updated : m));
      toast.success('Medicamento atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar medicamento');
    }
  };

  const handleDeleteMedicamento = async (id: number) => {
    try {
      await medicamentoService.deletar(id);
      setMedicamentos(prev => prev.filter(m => m.id !== id));
      toast.success('Medicamento excluído com sucesso!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir medicamento');
    }
  };

  const handleSaveConsulta = async (consulta: any) => {
    try {
      // Chamar a API real para persistir no banco
      const tipoMap: Record<string, 'DOSE_MGKG' | 'VOLUME_MLH' | 'GOTAS_MIN'> = {
        dose: 'DOSE_MGKG',
        volume: 'VOLUME_MLH',
        gotas: 'GOTAS_MIN',
      };
      await consultaService.salvar({
        pacienteId: consulta.pacienteId,
        medicamentoId: consulta.medicamentoId,
        medicoId: consulta.tipoProfissional === 'medico' ? consulta.profissionalId : undefined,
        enfermeiroId: consulta.tipoProfissional === 'enfermeiro' ? consulta.profissionalId : undefined,
        tipoCalculo: tipoMap[consulta.tipoCalculo] ?? 'DOSE_MGKG',
        observacoes: consulta.observacoes,
      });
      // Recarrega histórico do banco
      const novoHistorico = await historicoService.listar();
      setHistorico(novoHistorico);
    } catch (error) {
      console.error('Erro ao salvar consulta:', error);
      throw error; // repassa para o componente Consulta mostrar o erro
    }
  };

  // Handlers de usuários
  const handleAddUsuario = async (u: UsuarioRequest) => {
    const created = await usuarioService.criar(u);
    setUsuarios(prev => [...prev, created]);
    toast.success(`Usuário "${created.login}" criado com sucesso!`);
  };

  const handleUpdateUsuario = async (id: number, u: UsuarioRequest) => {
    const updated = await usuarioService.atualizar(id, u);
    setUsuarios(prev => prev.map(usr => usr.id === id ? updated : usr));
    toast.success(`Usuário "${updated.login}" atualizado com sucesso!`);
  };

  const handleDeleteUsuario = async (id: number) => {
    await usuarioService.deletar(id);
    setUsuarios(prev => prev.filter(usr => usr.id !== id));
    toast.success('Usuário excluído com sucesso!');
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
            historico={historico}
          />
        );
      case 'pacientes':
        return (
          <Pacientes
            pacientes={pacientes}
            onAddPaciente={handleAddPaciente}
            onUpdatePaciente={handleUpdatePaciente}
            onDeletePaciente={handleDeletePaciente}
          />
        );
      case 'medicos':
        return (
          <Medicos
            medicos={medicos}
            onAddMedico={handleAddMedico}
            onUpdateMedico={handleUpdateMedico}
            onDeleteMedico={handleDeleteMedico}
          />
        );
      case 'enfermeiros':
        return (
          <Enfermeiros
            enfermeiros={enfermeiros}
            onAddEnfermeiro={handleAddEnfermeiro}
            onUpdateEnfermeiro={handleUpdateEnfermeiro}
            onDeleteEnfermeiro={handleDeleteEnfermeiro}
          />
        );
      case 'medicamentos':
        return (
          <Medicamentos
            medicamentos={medicamentos}
            onAddMedicamento={handleAddMedicamento}
            onUpdateMedicamento={handleUpdateMedicamento}
            onDeleteMedicamento={handleDeleteMedicamento}
          />
        );
      case 'consulta':
        return (
          <Consulta
            pacientes={pacientes}
            medicos={medicos}
            enfermeiros={enfermeiros}
            medicamentos={medicamentos}
            onSaveConsulta={handleSaveConsulta}
            initialData={consultaInicial}
          />
        );
      case 'historico':
        return (
          <Historico
            historico={historico}
            onReabrirConsulta={(item) => {
              setConsultaInicial(item);
              setCurrentPage('consulta');
            }}
            onRefresh={async () => {
              try {
                const updated = await historicoService.listar();
                setHistorico(updated);
                toast.success('Histórico atualizado com sucesso!');
              } catch (e: any) {
                toast.error(e?.message || 'Erro ao atualizar histórico');
              }
            }}
          />
        );
      case 'usuarios':
        return (
          <Usuarios
            usuarios={usuarios}
            onAdd={handleAddUsuario}
            onUpdate={handleUpdateUsuario}
            onDelete={handleDeleteUsuario}
            currentUserId={user.id}
          />
        );
      default:
        return (
          <DashboardHome
            stats={{
              pacientes: pacientes.length,
              medicos: medicos.length,
              enfermeiros: enfermeiros.length,
              medicamentos: medicamentos.length,
              consultas: historico.length
            }}
            historico={historico}
          />
        );
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