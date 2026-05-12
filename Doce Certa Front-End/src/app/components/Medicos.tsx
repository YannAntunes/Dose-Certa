import { useState } from 'react';
import { UserPlus, Search, Stethoscope, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';

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
  
  const { t } = useLanguage();

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Stethoscope className="w-5 h-5 text-teal-500" />
            {t('profissionais.add_medico')}
          </CardTitle>
          <CardDescription className="dark:text-slate-400">{t('profissionais.add_medico_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome" className="dark:text-slate-300">{t('profissionais.form.name')}</Label>
                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder={t('profissionais.form.name')} required className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crm" className="dark:text-slate-300">{t('profissionais.form.crm')}</Label>
                <Input id="crm" value={crm} onChange={e => setCrm(e.target.value)} placeholder="CRM" required className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado" className="dark:text-slate-300">{t('profissionais.form.state')}</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"><SelectValue placeholder={t('profissionais.form.state')} /></SelectTrigger>
                  <SelectContent>
                    {estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              {t('profissionais.add_medico')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">{t('profissionais.list.medicos')}</CardTitle>
          <CardDescription className="dark:text-slate-400">{t('profissionais.list.desc')}</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input placeholder={t('common.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                  <TableHead className="text-slate-600 dark:text-slate-300">{t('common.name')}</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">{t('profissionais.form.crm')}</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">{t('profissionais.form.state')}</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedicos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500 dark:text-slate-400 py-8">{t('historico.empty')}</TableCell>
                  </TableRow>
                ) : (
                  filteredMedicos.map(medico =>
                    editingId === medico.id ? (
                      <TableRow key={medico.id} className="bg-teal-50/50 dark:bg-teal-900/10 border-slate-200 dark:border-slate-800">
                        <TableCell><Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" /></TableCell>
                        <TableCell><Input value={editCrm} onChange={e => setEditCrm(e.target.value)} className="h-8 w-28 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" /></TableCell>
                        <TableCell>
                          <Select value={editEstado} onValueChange={setEditEstado}>
                            <SelectTrigger className="h-8 w-20 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"><SelectValue /></SelectTrigger>
                            <SelectContent>{estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700 text-white h-8 px-2"><Check className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8 px-2 border-slate-200 dark:border-slate-700 dark:text-slate-300"><X className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : deletingId === medico.id ? (
                      <TableRow key={medico.id} className="bg-red-50/50 dark:bg-red-900/10 border-slate-200 dark:border-slate-800">
                        <TableCell colSpan={3} className="text-sm text-red-700 dark:text-red-400 font-medium">
                          {t('common.delete')} <strong>{medico.nome}</strong>?
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => confirmDelete(medico.id)} className="bg-red-600 hover:bg-red-700 text-white h-8 px-2 text-xs">{t('common.delete')}</Button>
                            <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} className="h-8 px-2 border-slate-200 dark:border-slate-700 dark:text-slate-300"><X className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={medico.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">{medico.nome}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300">{medico.crm}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300">{medico.estado}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => startEdit(medico)}
                              className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200" title={t('common.edit')}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setDeletingId(medico.id); setEditingId(null); }}
                              className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200" title={t('common.delete')}>
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
