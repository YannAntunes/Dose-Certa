import { useState } from 'react';
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

interface User {
  username: string;
  role: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Estados para dados
  const [pacientes, setPacientes] = useState([
    { id: 1, nome: 'João Silva', cpf: '123.456.789-00', idade: 45, peso: 75 },
    { id: 2, nome: 'Maria Santos', cpf: '987.654.321-00', idade: 32, peso: 62 },
  ]);

  const [medicos, setMedicos] = useState([
    { id: 1, nome: 'Dr. Carlos Mendes', crm: '12345', estado: 'SP' },
    { id: 2, nome: 'Dra. Ana Paula Costa', crm: '67890', estado: 'RJ' },
  ]);

  const [enfermeiros, setEnfermeiros] = useState([
    { id: 1, nome: 'Enf. Pedro Oliveira', coren: '54321', estado: 'SP' },
    { id: 2, nome: 'Enf. Juliana Lima', coren: '98765', estado: 'MG' },
  ]);

  const [medicamentos, setMedicamentos] = useState([
    {
      id: 1,
      nome: 'Dipirona',
      marca: 'Genérico',
      dosePorKg: '15.0',
      doseMaxima: '2000.0',
      intervalo: '6h',
      notas: 'Analgésico/antitérmico',
      volumeMl: '10',
      tempoMin: '30',
      fatorGotas: '15'
    },
    {
      id: 2,
      nome: 'Paracetamol',
      marca: 'Tylenol',
      dosePorKg: '10.0',
      doseMaxima: '1500.0',
      intervalo: '6h',
      notas: 'Analgésico/antitérmico',
      volumeMl: '10',
      tempoMin: '30',
      fatorGotas: '15'
    },
    {
      id: 3,
      nome: 'Amoxicilina',
      marca: 'Amoxil',
      dosePorKg: '50.0',
      doseMaxima: '3000.0',
      intervalo: '8h',
      notas: 'Antibiótico',
      volumeMl: '10',
      tempoMin: '30',
      fatorGotas: '15'
    },
  ]);

  const [historico, setHistorico] = useState<any[]>([]);

  const handleLogin = (username: string, role: string) => {
    setUser({ username, role });
    toast.success(`Bem-vindo, ${username}!`);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
    toast.info('Você saiu do sistema');
  };

  const handleAddPaciente = (paciente: any) => {
    const newPaciente = {
      ...paciente,
      id: pacientes.length + 1
    };
    setPacientes([...pacientes, newPaciente]);
    toast.success('Paciente cadastrado com sucesso!');
  };

  const handleAddMedico = (medico: any) => {
    const newMedico = {
      ...medico,
      id: medicos.length + 1
    };
    setMedicos([...medicos, newMedico]);
    toast.success('Médico cadastrado com sucesso!');
  };

  const handleAddEnfermeiro = (enfermeiro: any) => {
    const newEnfermeiro = {
      ...enfermeiro,
      id: enfermeiros.length + 1
    };
    setEnfermeiros([...enfermeiros, newEnfermeiro]);
    toast.success('Enfermeiro cadastrado com sucesso!');
  };

  const handleAddMedicamento = (medicamento: any) => {
    const newMedicamento = {
      ...medicamento,
      id: medicamentos.length + 1
    };
    setMedicamentos([...medicamentos, newMedicamento]);
    toast.success('Medicamento cadastrado com sucesso!');
  };

  const handleSaveConsulta = (consulta: any) => {
    const newConsulta = {
      ...consulta,
      id: historico.length + 1
    };
    setHistorico([newConsulta, ...historico]);
    toast.success('Consulta salva com sucesso!');
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