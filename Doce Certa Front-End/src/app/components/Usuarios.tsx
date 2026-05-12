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

const PERFIS: { value: PerfilUsuario; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MEDICO', label: 'Médico' },
  { value: 'ENFERMEIRO', label: 'Enfermeiro' },
  { value: 'RECEPCAO', label: 'Recepção' },
];

const PERFIL_BADGE: Record<PerfilUsuario, string> = {
  ADMIN: 'bg-red-100 text-red-700 border border-red-200',
  MEDICO: 'bg-blue-100 text-blue-700 border border-blue-200',
  ENFERMEIRO: 'bg-green-100 text-green-700 border border-green-200',
  RECEPCAO: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
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
    if (!form.login.trim()) return 'O nome de usuário é obrigatório.';
    if (!form.perfil) return 'Selecione um tipo de acesso.';
    if (!isEditing && !form.senha) return 'A senha é obrigatória para novos usuários.';
    if (form.senha && form.senha.length < 4) return 'A senha deve ter pelo menos 4 caracteres.';
    if (form.senha !== form.confirmSenha) return 'As senhas não coincidem.';
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
    <div className="space-y-6">
      {/* Formulário de Cadastro / Edição */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            {isEditing ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Altere os dados do usuário. Deixe a senha em branco para não alterá-la.'
              : 'Preencha os dados para criar um novo acesso ao sistema.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome de usuário */}
              <div className="space-y-2">
                <Label htmlFor="login">Nome de Usuário</Label>
                <Input
                  id="login"
                  value={form.login}
                  onChange={e => setForm({ ...form, login: e.target.value })}
                  placeholder="Ex: joao.silva"
                  autoComplete="off"
                  required
                  disabled={loading}
                />
              </div>

              {/* Tipo de acesso */}
              <div className="space-y-2">
                <Label htmlFor="perfil">Tipo de Acesso</Label>
                <Select
                  value={form.perfil}
                  onValueChange={v => setForm({ ...form, perfil: v as PerfilUsuario })}
                  required
                >
                  <SelectTrigger id="perfil">
                    <SelectValue placeholder="Selecione o perfil" />
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
                <Label htmlFor="senha">
                  {isEditing ? 'Nova Senha (opcional)' : 'Senha'}
                </Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={e => setForm({ ...form, senha: e.target.value })}
                    placeholder={isEditing ? 'Deixe em branco para manter' : 'Mínimo 4 caracteres'}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmSenha">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmSenha"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmSenha}
                    onChange={e => setForm({ ...form, confirmSenha: e.target.value })}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Senha match indicator */}
            {form.senha && form.confirmSenha && (
              <div className={`flex items-center gap-2 text-sm ${form.senha === form.confirmSenha ? 'text-green-600' : 'text-red-500'}`}>
                {form.senha === form.confirmSenha
                  ? <><Check className="w-4 h-4" /> As senhas coincidem</>
                  : <><X className="w-4 h-4" /> As senhas não coincidem</>
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
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {isEditing
                  ? <><Check className="w-4 h-4 mr-2" />Salvar Alterações</>
                  : <><UserPlus className="w-4 h-4 mr-2" />Cadastrar Usuário</>
                }
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  <X className="w-4 h-4 mr-2" />Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>Gerencie os acessos ao sistema Dose Certa</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou perfil..."
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
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil de Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(usuario => (
                    <TableRow
                      key={usuario.id}
                      className={editingId === usuario.id ? 'bg-blue-50' : ''}
                    >
                      <TableCell className="font-medium">{usuario.login}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PERFIL_BADGE[usuario.perfil]}`}>
                          {PERFIS.find(p => p.value === usuario.perfil)?.label ?? usuario.perfil}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {deleteConfirmId === usuario.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-red-600">Confirmar exclusão?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(usuario.id)}
                              disabled={loading}
                            >
                              Sim
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={loading}
                            >
                              Não
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(usuario)}
                              disabled={loading}
                            >
                              <Pencil className="w-3 h-3 mr-1" />Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => setDeleteConfirmId(usuario.id)}
                              disabled={loading || usuario.id === currentUserId}
                              title={usuario.id === currentUserId ? 'Não é possível excluir seu próprio usuário' : ''}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />Excluir
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
