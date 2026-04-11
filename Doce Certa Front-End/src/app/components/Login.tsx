import { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface LoginProps {
  onLogin: (username: string, role: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Usuários de exemplo
  const users = {
    'admin': { password: 'admin123', role: 'Administrador' },
    'medico': { password: 'medico123', role: 'Médico' },
    'enfermeiro': { password: 'enfermeiro123', role: 'Enfermeiro' },
    'recepcao': { password: 'recepcao123', role: 'Recepção' }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = users[username as keyof typeof users];
    
    if (user && user.password === password) {
      onLogin(username, user.role);
    } else {
      setError('Usuário ou senha inválidos');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-blue-900 mb-2">Dose Certa</h1>
          <p className="text-gray-600">Sistema de Dosagem de Medicamentos</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              className="w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              className="w-full"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Entrar
          </Button>
        </form>

        {/* Informações de teste */}
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600 mb-2">Usuários de teste:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• admin / admin123</li>
            <li>• medico / medico123</li>
            <li>• enfermeiro / enfermeiro123</li>
            <li>• recepcao / recepcao123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
