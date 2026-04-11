import { useState } from 'react';
import { UserPlus, Search, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Enfermeiro {
  id: number;
  nome: string;
  coren: string;
  estado: string;
}

interface EnfermeirosProps {
  enfermeiros: Enfermeiro[];
  onAddEnfermeiro: (enfermeiro: Omit<Enfermeiro, 'id'>) => void;
}

const estados = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function Enfermeiros({ enfermeiros, onAddEnfermeiro }: EnfermeirosProps) {
  const [nome, setNome] = useState('');
  const [coren, setCoren] = useState('');
  const [estado, setEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estado) return;
    
    onAddEnfermeiro({
      nome,
      coren,
      estado
    });
    // Limpar formulário
    setNome('');
    setCoren('');
    setEstado('');
  };

  const filteredEnfermeiros = enfermeiros.filter(e => 
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.coren.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Formulário de Cadastro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Cadastrar Enfermeiro
          </CardTitle>
          <CardDescription>Adicione um novo enfermeiro ao sistema</CardDescription>
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
                  placeholder="Nome completo do enfermeiro"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coren">COREN</Label>
                <Input
                  id="coren"
                  value={coren}
                  onChange={(e) => setCoren(e.target.value)}
                  placeholder="Número do COREN"
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
              Cadastrar Enfermeiro
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Enfermeiros */}
      <Card>
        <CardHeader>
          <CardTitle>Enfermeiros Cadastrados</CardTitle>
          <CardDescription>Lista completa de enfermeiros no sistema</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou COREN..."
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
                  <TableHead>COREN</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnfermeiros.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      Nenhum enfermeiro cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnfermeiros.map((enfermeiro) => (
                    <TableRow key={enfermeiro.id}>
                      <TableCell>{enfermeiro.nome}</TableCell>
                      <TableCell>{enfermeiro.coren}</TableCell>
                      <TableCell>{enfermeiro.estado}</TableCell>
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
