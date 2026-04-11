import { useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  idade: number;
  peso: number;
}

interface PacientesProps {
  pacientes: Paciente[];
  onAddPaciente: (paciente: Omit<Paciente, 'id'>) => void;
}

export default function Pacientes({ pacientes, onAddPaciente }: PacientesProps) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [idade, setIdade] = useState('');
  const [peso, setPeso] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPaciente({
      nome,
      cpf,
      idade: parseInt(idade),
      peso: parseFloat(peso)
    });
    // Limpar formulário
    setNome('');
    setCpf('');
    setIdade('');
    setPeso('');
  };

  const filteredPacientes = pacientes.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cpf.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Formulário de Cadastro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Cadastrar Paciente
          </CardTitle>
          <CardDescription>Adicione um novo paciente ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo do paciente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idade">Idade (anos)</Label>
                <Input
                  id="idade"
                  type="number"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  placeholder="Idade"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="Peso em kg"
                  min="0"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar Paciente
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Pacientes */}
      <Card>
        <CardHeader>
          <CardTitle>Pacientes Cadastrados</CardTitle>
          <CardDescription>Lista completa de pacientes no sistema</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Peso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPacientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      Nenhum paciente cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPacientes.map((paciente) => (
                    <TableRow key={paciente.id}>
                      <TableCell>{paciente.nome}</TableCell>
                      <TableCell>{paciente.cpf}</TableCell>
                      <TableCell>{paciente.idade} anos</TableCell>
                      <TableCell>{paciente.peso} kg</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
