import { useState } from 'react';
import { UserPlus, Search, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';

interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  idade: number;
  peso: number;
  tipoDocumento?: string;
  paisOrigem?: string;
}

interface PacientesProps {
  pacientes: Paciente[];
  onAddPaciente: (paciente: Omit<Paciente, 'id'>) => void;
  onUpdatePaciente?: (id: number, paciente: Omit<Paciente, 'id'>) => void;
  onDeletePaciente?: (id: number) => void;
}

/** Formata CPF para exibição: 000.000.000-00 */
function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function Pacientes({ pacientes, onAddPaciente, onUpdatePaciente, onDeletePaciente }: PacientesProps) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('CPF');
  const [paisOrigem, setPaisOrigem] = useState('Brasil');
  const [idade, setIdade] = useState('');
  const [peso, setPeso] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado de edição inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editTipoDocumento, setEditTipoDocumento] = useState('CPF');
  const [editPaisOrigem, setEditPaisOrigem] = useState('Brasil');
  const [editIdade, setEditIdade] = useState('');
  const [editPeso, setEditPeso] = useState('');

  // Estado de confirmação de exclusão
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPaciente({ nome, cpf, idade: parseInt(idade), peso: parseFloat(peso), tipoDocumento, paisOrigem });
    setNome(''); setCpf(''); setIdade(''); setPeso(''); setTipoDocumento('CPF'); setPaisOrigem('Brasil');
  };

  const startEdit = (p: Paciente) => {
    setEditingId(p.id);
    setEditNome(p.nome);
    setEditCpf(p.cpf);
    setEditTipoDocumento(p.tipoDocumento || 'CPF');
    setEditPaisOrigem(p.paisOrigem || 'Brasil');
    setEditIdade(String(p.idade));
    setEditPeso(String(p.peso));
    setDeletingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editNome.trim() || !editCpf.trim()) {
      toast.error('Nome e Documento são obrigatórios.');
      return;
    }
    await onUpdatePaciente?.(editingId, {
      nome: editNome,
      cpf: editCpf,
      idade: parseInt(editIdade),
      peso: parseFloat(editPeso),
      tipoDocumento: editTipoDocumento,
      paisOrigem: editPaisOrigem,
    });
    setEditingId(null);
  };

  const confirmDelete = async (id: number) => {
    await onDeletePaciente?.(id);
    setDeletingId(null);
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo do paciente" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoDocumento">Tipo de Documento</Label>
                <select
                  id="tipoDocumento"
                  value={tipoDocumento}
                  onChange={e => {
                    setTipoDocumento(e.target.value);
                    setCpf('');
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="CPF">CPF</option>
                  <option value="PASSAPORTE">Passaporte</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">{tipoDocumento === 'CPF' ? 'CPF' : 'Número do Documento'}</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={e => setCpf(tipoDocumento === 'CPF' ? formatCpf(e.target.value) : e.target.value)}
                  placeholder={tipoDocumento === 'CPF' ? "000.000.000-00" : "Ex: AB123456"}
                  maxLength={tipoDocumento === 'CPF' ? 14 : 20}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paisOrigem">País de Origem</Label>
                <Input id="paisOrigem" value={paisOrigem} onChange={e => setPaisOrigem(e.target.value)} placeholder="Ex: Brasil" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idade">Idade (anos)</Label>
                <Input id="idade" type="number" value={idade} onChange={e => setIdade(e.target.value)} placeholder="Idade" min="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input id="peso" type="number" step="0.1" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Peso em kg" min="0" required />
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
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPacientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Nenhum paciente cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPacientes.map(paciente => (
                    editingId === paciente.id ? (
                      /* ── Linha de edição inline ── */
                      <TableRow key={paciente.id} className="bg-blue-50">
                        <TableCell>
                          <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-8" />
                        </TableCell>
                        <TableCell className="flex flex-col gap-1 min-w-[150px]">
                          <select
                            value={editTipoDocumento}
                            onChange={e => {
                              setEditTipoDocumento(e.target.value);
                              setEditCpf('');
                            }}
                            className="h-8 rounded-md border border-input text-xs px-2 w-full"
                          >
                            <option value="CPF">CPF</option>
                            <option value="PASSAPORTE">Passaporte</option>
                          </select>
                          <Input
                            value={editCpf}
                            onChange={e => setEditCpf(editTipoDocumento === 'CPF' ? formatCpf(e.target.value) : e.target.value)}
                            maxLength={editTipoDocumento === 'CPF' ? 14 : 20}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                           <Input value={editPaisOrigem} onChange={e => setEditPaisOrigem(e.target.value)} className="h-8 w-24" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={editIdade} onChange={e => setEditIdade(e.target.value)} className="h-8 w-16" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.1" value={editPeso} onChange={e => setEditPeso(e.target.value)} className="h-8 w-20" />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700 h-8 px-2">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 px-2">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : deletingId === paciente.id ? (
                      /* ── Linha de confirmação de exclusão ── */
                      <TableRow key={paciente.id} className="bg-red-50">
                        <TableCell colSpan={5} className="text-sm text-red-700 font-medium">
                          Excluir <strong>{paciente.nome}</strong>? Esta ação não pode ser desfeita.
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => confirmDelete(paciente.id)} className="bg-red-600 hover:bg-red-700 h-8 px-2 text-xs">
                              Confirmar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} className="h-8 px-2">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      /* ── Linha normal ── */
                      <TableRow key={paciente.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{paciente.nome}</TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex flex-col">
                            <span>{paciente.cpf}</span>
                            <span className="text-xs text-gray-500">{paciente.tipoDocumento === 'PASSAPORTE' ? 'Passaporte' : 'CPF'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{paciente.paisOrigem || 'Brasil'}</TableCell>
                        <TableCell>{paciente.idade} anos</TableCell>
                        <TableCell>{paciente.peso} kg</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => { startEdit(paciente); }}
                              className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              onClick={() => { setDeletingId(paciente.id); setEditingId(null); }}
                              className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {pacientes.length > 0 && (
            <p className="text-sm text-gray-500 text-center mt-3">
              {filteredPacientes.length} de {pacientes.length} paciente(s)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
