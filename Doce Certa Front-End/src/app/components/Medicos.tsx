import { useState } from 'react';
import { UserPlus, Search, Stethoscope } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Medico {
  id: number;
  nome: string;
  crm: string;
  estado: string;
}

interface MedicosProps {
  medicos: Medico[];
  onAddMedico: (medico: Omit<Medico, 'id'>) => void;
}

const estados = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Medicos({ medicos, onAddMedico }: MedicosProps) {
  const [nome, setNome] = useState('');
  const [crm, setCrm] = useState('');
  const [estado, setEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estado) return;
    
    onAddMedico({
      nome,
      crm,
      estado
    });
    // Limpar formulário
    setNome('');
    setCrm('');
    setEstado('');
  };

  const filteredMedicos = medicos.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.crm.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Formulário de Cadastro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Cadastrar Médico
          </CardTitle>
          <CardDescription>Adicione um novo médico ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo do médico"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="crm">CRM</Label>
                <Input
                  id="crm"
                  value={crm}
                  onChange={(e) => setCrm(e.target.value)}
                  placeholder="Número do CRM"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado (UF)</Label>
                <Select value={estado} onValueChange={setEstado} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar Médico
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Médicos */}
      <Card>
        <CardHeader>
          <CardTitle>Médicos Cadastrados</CardTitle>
          <CardDescription>Lista completa de médicos no sistema</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou CRM..."
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
                  <TableHead>CRM</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedicos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      Nenhum médico cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedicos.map((medico) => (
                    <TableRow key={medico.id}>
                      <TableCell>{medico.nome}</TableCell>
                      <TableCell>{medico.crm}</TableCell>
                      <TableCell>{medico.estado}</TableCell>
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
