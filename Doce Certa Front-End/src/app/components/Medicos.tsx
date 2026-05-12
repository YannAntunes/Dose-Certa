import { useState } from 'react';
import { UserPlus, Search, Stethoscope, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface Medico {
  id: number;
  nome: string;
  crm: number;
  estado: string;
}

interface MedicosProps {
  medicos: Medico[];
  onAddMedico: (medico: Omit<Medico, 'id'>) => void;
  onUpdateMedico?: (id: number, medico: Omit<Medico, 'id'>) => void;
  onDeleteMedico?: (id: number) => void;
}

const estados = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
];

export default function Medicos({ medicos, onAddMedico, onUpdateMedico, onDeleteMedico }: MedicosProps) {
  const [nome, setNome] = useState('');
  const [crm, setCrm] = useState('');
  const [estado, setEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCrm, setEditCrm] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estado) return;
    onAddMedico({ nome, crm: parseInt(crm), estado });
    setNome(''); setCrm(''); setEstado('');
  };

  const startEdit = (m: Medico) => {
    setEditingId(m.id);
    setEditNome(m.nome);
    setEditCrm(String(m.crm));
    setEditEstado(m.estado);
    setDeletingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editNome.trim() || !editCrm.trim() || !editEstado) {
      toast.error('Preencha todos os campos.');
      return;
    }
    await onUpdateMedico?.(editingId, { nome: editNome, crm: parseInt(editCrm), estado: editEstado });
    setEditingId(null);
  };

  const confirmDelete = async (id: number) => {
    await onDeleteMedico?.(id);
    setDeletingId(null);
  };

  const filteredMedicos = medicos.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(m.crm).includes(searchTerm)
  );

  return (
    <div className="space-y-6">
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
                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo do médico" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crm">CRM</Label>
                <Input id="crm" value={crm} onChange={e => setCrm(e.target.value)} placeholder="Número do CRM" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado (UF)</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent>
                    {estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
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

      <Card>
        <CardHeader>
          <CardTitle>Médicos Cadastrados</CardTitle>
          <CardDescription>Lista completa de médicos no sistema</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar por nome ou CRM..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedicos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">Nenhum médico cadastrado</TableCell>
                  </TableRow>
                ) : (
                  filteredMedicos.map(medico =>
                    editingId === medico.id ? (
                      <TableRow key={medico.id} className="bg-blue-50">
                        <TableCell><Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-8" /></TableCell>
                        <TableCell><Input value={editCrm} onChange={e => setEditCrm(e.target.value)} className="h-8 w-28" /></TableCell>
                        <TableCell>
                          <Select value={editEstado} onValueChange={setEditEstado}>
                            <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                            <SelectContent>{estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700 h-8 px-2"><Check className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8 px-2"><X className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : deletingId === medico.id ? (
                      <TableRow key={medico.id} className="bg-red-50">
                        <TableCell colSpan={3} className="text-sm text-red-700 font-medium">
                          Excluir <strong>{medico.nome}</strong>? Esta ação não pode ser desfeita.
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => confirmDelete(medico.id)} className="bg-red-600 hover:bg-red-700 h-8 px-2 text-xs">Confirmar</Button>
                            <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} className="h-8 px-2"><X className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={medico.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{medico.nome}</TableCell>
                        <TableCell>{medico.crm}</TableCell>
                        <TableCell>{medico.estado}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => startEdit(medico)}
                              className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200" title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setDeletingId(medico.id); setEditingId(null); }}
                              className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200" title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </div>
          {medicos.length > 0 && (
            <p className="text-sm text-gray-500 text-center mt-3">{filteredMedicos.length} de {medicos.length} médico(s)</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
