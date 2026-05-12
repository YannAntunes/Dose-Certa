import { useState } from 'react';
import {
  UserCog, UserPlus, Search, Pencil, Trash2, Eye, EyeOff, X, Check, ShieldAlert
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Usuario, UsuarioRequest, PerfilUsuario } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const getPerfis = (t: any): { value: PerfilUsuario; label: string }[] => [
  { value: 'ADMIN', label: t('usuarios.profile.admin') },
  { value: 'MEDICO', label: t('usuarios.profile.medico') },
  { value: 'ENFERMEIRO', label: t('usuarios.profile.enfermeiro') },
  { value: 'RECEPCAO', label: t('usuarios.profile.recepcao') },
];

const PERFIL_BADGE: Record<PerfilUsuario, string> = {
  ADMIN: 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
  MEDICO: 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  ENFERMEIRO: 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  RECEPCAO: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
};

interface UsuariosProps {
  usuarios: Usuario[];
  onAdd: (u: UsuarioRequest) => Promise<void>;
  onUpdate: (id: number, u: UsuarioRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  currentUserId?: number;
}

interface FormState {
  login: string;
  senha: string;
  confirmSenha: string;
  perfil: PerfilUsuario | '';
}

const emptyForm = (): FormState => ({ login: '', senha: '', confirmSenha: '', perfil: '' });

export default function Usuarios({
  usuarios, onAdd, onUpdate, onDelete, currentUserId
}: UsuariosProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { t } = useLanguage();
  const PERFIS = getPerfis(t);

  const isEditing = editingId !== null;

  const handleEdit = (usuario: Usuario) => {
    setEditingId(usuario.id);
    setForm({ login: usuario.login, senha: '', confirmSenha: '', perfil: usuario.perfil });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  };

  const validate = (): string | null => {
    if (!form.login.trim()) return t('usuarios.form.login') + ' ' + (t('common.status') === 'Status' ? 'is required' : 'é obrigatório');
    if (!form.perfil) return t('usuarios.form.role_placeholder');
    if (!isEditing && !form.senha) return t('usuarios.form.password') + ' ' + (t('common.status') === 'Status' ? 'is required' : 'é obrigatória');
    if (form.senha && form.senha.length < 4) return t('common.status') === 'Status' ? 'Password must have at least 4 characters' : 'A senha deve ter pelo menos 4 caracteres';
    if (form.senha !== form.confirmSenha) return t('usuarios.error.match');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    const payload: UsuarioRequest = {
      login: form.login.trim(),
      perfil: form.perfil as PerfilUsuario,
      ...(form.senha ? { senha: form.senha } : {}),
    };

    try {
      if (isEditing) {
        await onUpdate(editingId!, payload);
      } else {
        await onAdd(payload);
      }
      handleCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      await onDelete(id);
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = usuarios.filter(u =>
    u.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.perfil.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Formulário de Cadastro / Edição */}
      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <UserCog className="w-5 h-5 text-amber-500" />
            {isEditing ? t('common.edit') + ' ' + t('usuarios.title').slice(0, -1) : t('usuarios.add')}
          </CardTitle>
          <CardDescription className="dark:text-slate-400">
            {isEditing
              ? (t('common.status') === 'Status' ? 'Change user data. Leave password blank to keep it.' : 'Altere os dados do usuário. Deixe a senha em branco para não alterá-la.')
              : t('usuarios.add_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome de usuário */}
              <div className="space-y-2">
                <Label htmlFor="login" className="dark:text-slate-300">{t('usuarios.form.login')}</Label>
                <Input
                  id="login"
                  value={form.login}
                  onChange={e => setForm({ ...form, login: e.target.value })}
                  placeholder="Ex: joao.silva"
                  autoComplete="off"
                  required
                  disabled={loading}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Tipo de acesso */}
              <div className="space-y-2">
                <Label htmlFor="perfil" className="dark:text-slate-300">{t('usuarios.form.role')}</Label>
                <Select
                  value={form.perfil}
                  onValueChange={v => setForm({ ...form, perfil: v as PerfilUsuario })}
                  required
                >
                  <SelectTrigger id="perfil" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder={t('usuarios.form.role_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PERFIS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="senha" className="dark:text-slate-300">
                  {isEditing ? (t('common.status') === 'Status' ? 'New Password (optional)' : 'Nova Senha (opcional)') : t('usuarios.form.password')}
                </Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={e => setForm({ ...form, senha: e.target.value })}
                    placeholder={isEditing ? (t('common.status') === 'Status' ? 'Leave blank to keep' : 'Deixe em branco para manter') : (t('common.status') === 'Status' ? 'Min 4 characters' : 'Mínimo 4 caracteres')}
                    autoComplete="new-password"
                    disabled={loading}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmSenha" className="dark:text-slate-300">{t('usuarios.form.confirm_password')}</Label>
                <div className="relative">
                  <Input
                    id="confirmSenha"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmSenha}
                    onChange={e => setForm({ ...form, confirmSenha: e.target.value })}
                    placeholder={t('usuarios.form.confirm_password')}
                    autoComplete="new-password"
                    disabled={loading}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Senha match indicator */}
            {form.senha && form.confirmSenha && (
              <div className={`flex items-center gap-2 text-sm ${form.senha === form.confirmSenha ? 'text-emerald-600' : 'text-rose-500'}`}>
                {form.senha === form.confirmSenha
                  ? <><Check className="w-4 h-4" /> {t('usuarios.error.ok')}</>
                  : <><X className="w-4 h-4" /> {t('usuarios.error.match')}</>
                }
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-3 rounded-md text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
                {isEditing
                  ? <><Check className="w-4 h-4 mr-2" />{t('common.save')}</>
                  : <><UserPlus className="w-4 h-4 mr-2" />{t('usuarios.add')}</>
                }
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} className="border-slate-200 dark:border-slate-700 dark:text-slate-300">
                  <X className="w-4 h-4 mr-2" />{t('common.cancel')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 dark:text-slate-100">{t('usuarios.list.title')}</CardTitle>
          <CardDescription className="dark:text-slate-400">
            {t('common.status') === 'Status' ? 'Manage Dose Certa system access' : 'Gerencie os acessos ao sistema Dose Certa'}
          </CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
                  <TableHead className="text-slate-600 dark:text-slate-300">{t('usuarios.form.login')}</TableHead>
                  <TableHead className="text-slate-600 dark:text-slate-300">{t('usuarios.form.role')}</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-slate-300">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500 dark:text-slate-400 py-8">
                      {t('historico.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(usuario => (
                    <TableRow
                      key={usuario.id}
                      className={`${editingId === usuario.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'} border-slate-200 dark:border-slate-800`}
                    >
                      <TableCell className="font-medium text-slate-800 dark:text-slate-200">{usuario.login}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${PERFIL_BADGE[usuario.perfil]}`}>
                          {PERFIS.find(p => p.value === usuario.perfil)?.label ?? usuario.perfil}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {deleteConfirmId === usuario.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-rose-600 font-medium">{t('usuarios.delete.confirm')}</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(usuario.id)}
                              disabled={loading}
                              className="text-xs h-7 px-3"
                            >
                              {t('common.status') === 'Status' ? 'Yes' : 'Sim'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={loading}
                              className="text-xs h-7 px-3 border-slate-200 dark:border-slate-700"
                            >
                              {t('common.status') === 'Status' ? 'No' : 'Não'}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(usuario)}
                              disabled={loading}
                              className="text-xs h-8 border-slate-200 dark:border-slate-700 dark:text-slate-300"
                            >
                              <Pencil className="w-3 h-3 mr-1" />{t('common.edit')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 border-rose-200 dark:border-rose-900 text-xs h-8"
                              onClick={() => setDeleteConfirmId(usuario.id)}
                              disabled={loading || usuario.id === currentUserId}
                              title={usuario.id === currentUserId ? t('usuarios.delete.self') : ''}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />{t('common.delete')}
                            </Button>
                          </div>
                        )}
                      </TableCell>
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
