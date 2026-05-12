import { useState } from 'react';
import { UserPlus, Search, Heart, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface Enfermeiro {
  id: number;
  nome: string;
  coren: string;
  estado: string;
}

interface EnfermeirosProps {
  enfermeiros: Enfermeiro[];
  onAddEnfermeiro: (enfermeiro: Omit<Enfermeiro, 'id'>) => void;
  onUpdateEnfermeiro?: (id: number, enfermeiro: Omit<Enfermeiro, 'id'>) => void;
  onDeleteEnfermeiro?: (id: number) => void;
}

const estados = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
];

export default function Enfermeiros({ enfermeiros, onAddEnfermeiro, onUpdateEnfermeiro, onDeleteEnfermeiro }: EnfermeirosProps) {
  const [nome, setNome] = useState('');
  const [coren, setCoren] = useState('');
  const [estado, setEstado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCoren, setEditCoren] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estado) return;
    onAddEnfermeiro({ nome, coren, estado });
    setNome(''); setCoren(''); setEstado('');
  };

  const startEdit = (enf: Enfermeiro) => {
    setEditingId(enf.id);
    setEditNome(enf.nome);
    setEditCoren(enf.coren);
    setEditEstado(enf.estado);
    setDeletingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editNome.trim() || !editCoren.trim() || !editEstado) {
      toast.error('Preencha todos os campos.');
      return;
    }
    await onUpdateEnfermeiro?.(editingId, { nome: editNome, coren: editCoren, estado: editEstado });
    setEditingId(null);
  };

  const confirmDelete = async (id: number) => {
    await onDeleteEnfermeiro?.(id);
    setDeletingId(null);
  };

  const filteredEnfermeiros = enfermeiros.filter(e =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.coren.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
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
                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo do enfermeiro" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coren">COREN</Label>
                <Input id="coren" value={coren} onChange={e => setCoren(e.target.value)} placeholder="Número do COREN" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado (UF)</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent>{estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
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

      <Card>
        <CardHeader>
          <CardTitle>Enfermeiros Cadastrados</CardTitle>
          <CardDescription>Lista completa de enfermeiros no sistema</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Buscar por nome ou COREN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>COREN</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnfermeiros.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">Nenhum enfermeiro cadastrado</TableCell>
                  </TableRow>
                ) : (
                  filteredEnfermeiros.map(enf =>
                    editingId === enf.id ? (
                      <TableRow key={enf.id} className="bg-blue-50">
                        <TableCell><Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-8" /></TableCell>
                        <TableCell><Input value={editCoren} onChange={e => setEditCoren(e.target.value)} className="h-8 w-28" /></TableCell>
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
                    ) : deletingId === enf.id ? (
                      <TableRow key={enf.id} className="bg-red-50">
                        <TableCell colSpan={3} className="text-sm text-red-700 font-medium">
                          Excluir <strong>{enf.nome}</strong>? Esta ação não pode ser desfeita.
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => confirmDelete(enf.id)} className="bg-red-600 hover:bg-red-700 h-8 px-2 text-xs">Confirmar</Button>
                            <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} className="h-8 px-2"><X className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={enf.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{enf.nome}</TableCell>
                        <TableCell>{enf.coren}</TableCell>
                        <TableCell>{enf.estado}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => startEdit(enf)}
                              className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200" title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setDeletingId(enf.id); setEditingId(null); }}
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
          {enfermeiros.length > 0 && (
            <p className="text-sm text-gray-500 text-center mt-3">{filteredEnfermeiros.length} de {enfermeiros.length} enfermeiro(s)</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
