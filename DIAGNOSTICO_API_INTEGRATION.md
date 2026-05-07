# Diagnóstico: Front-End Não Puxava Dados do Banco de Dados

## Problema Identificado

O frontend não estava puxando dados do banco de dados por **três motivos principais**:

### 1. **Dados Hardcoded (Mock Data)**
- O componente `App.tsx` tinha todos os dados definidos com `useState` e valores fixos:
  - Pacientes, médicos, enfermeiros, medicamentos - todos com dados fictícios
  - Não havia nenhuma chamada à API do backend
- O componente `Login.tsx` fazia autenticação local com usuários hardcoded em vez de chamar a API

### 2. **Falta de Serviço de API**
- Não havia arquivo de serviço ou configuração para fazer requisições HTTP
- Não havia hooks customizados para carregar dados
- Nenhuma integração com o backend

### 3. **Configuração do Backend não sendo usada**
- O backend estava corretamente configurado com:
  - CORS habilitado para `http://localhost:5173`
  - Endpoints REST em `/pacientes`, `/medicos`, `/enfermeiros`, `/medicamentos`, `/login`, etc.
  - Services e Controllers prontos
  - Banco de dados PostgreSQL configurado
- Mas nenhuma dessas APIs estava sendo chamada pelo frontend

## Soluções Implementadas

### 1. **Arquivo de Serviço de API** (`src/services/api.ts`)
Criado arquivo centralizado com:
- Configuração base da URL da API (`http://localhost:8080`)
- Função auxiliar `makeRequest` para fazer requisições HTTP
- Autenticação com JWT (token salvo no localStorage)
- Serviços específicos para cada entidade:
  - `authService` - login/logout
  - `pacienteService` - CRUD de pacientes
  - `medicoService` - CRUD de médicos
  - `enfermeiroService` - CRUD de enfermeiros
  - `medicamentoService` - CRUD de medicamentos
  - `consultaService` - CRUD de consultas
  - `historicoService` - buscar histórico

### 2. **Hooks Customizados** (`src/hooks/useApi.ts`)
Criados hooks reutilizáveis:
- `useFetchData` - carregar dados com estados (loading, error, data)
- `useCreateData` - criar novos itens
- `useUpdateData` - atualizar itens
- `useDeleteData` - deletar itens

### 3. **Atualização do Componente App** (`src/app/App.tsx`)
Alterações principais:
- Importação dos serviços de API
- Removido dados mock
- Adicionado `useEffect` para carregar dados quando o usuário faz login
- Atualizado `handleLogin` para chamar `authService.login()`
- Atualizado `handleLogout` para chamar `authService.logout()`
- Atualizado funções de adicionar itens para chamar APIs em vez de atualizar estado local

### 4. **Atualização do Componente Login** (`src/app/components/Login.tsx`)
Alterações principais:
- Removido autenticação local com usuários hardcoded
- Atualizado para receber função `onLogin` que faz requisição à API
- Adicionado estado de carregamento (`loading`)
- Adicionado indicador visual de carregamento

## Próximos Passos Recomendados

1. **Iniciar o Backend**
   ```bash
   cd "Dose Certa Spring"
   mvn clean install
   mvn spring-boot:run
   ```

2. **Iniciar o Frontend**
   ```bash
   cd "Doce Certa Front-End"
   npm install
   npm run dev
   ```

3. **Testar a Integração**
   - Acessar `http://localhost:5173`
   - Fazer login (use as credenciais do banco de dados)
   - Verificar se os dados estão sendo carregados do backend

4. **Possíveis Erros e Soluções**
   - **Erro de CORS**: Verificar se o backend está rodando em `http://localhost:8080`
   - **Erro 401 (Unauthorized)**: Verificar se as credenciais estão corretas no banco de dados
   - **Erro 404**: Verificar se os endpoints existem no backend
   - **Erro de conexão**: Confirmar que ambos os serviços estão rodando

## Arquivos Criados

1. `src/services/api.ts` - Serviço centralizado de API
2. `src/hooks/useApi.ts` - Hooks customizados para API

## Arquivos Modificados

1. `src/app/App.tsx` - Integração com serviços de API
2. `src/app/components/Login.tsx` - Login integrado com API

## Notas Importantes

- O token JWT é salvo no `localStorage` automaticamente após login
- As requisições subsequentes incluem o token automaticamente no header `Authorization`
- Os dados ainda podem ser expandidos com mais campos conforme necessário
- A estrutura permite fácil adição de novos endpoints no futuro
