# 🔑 Como Adicionar Usuários de Teste ao Banco de Dados

## Problema
O backend está rodando ✅, mas não há usuários cadastrados na tabela `usuarios`, por isso o login falha.

## Solução

### Opção 1: Usando pgAdmin (Mais Fácil)
1. Abra pgAdmin (geralmente em `http://localhost:5050`)
2. Conecte ao seu servidor PostgreSQL
3. Selecione seu banco de dados (ex: `dose_certa`)
4. Abra o "Query Tool"
5. Cole o conteúdo do arquivo `init-usuarios.sql`
6. Execute (pressione a seta verde ou Ctrl+Enter)

### Opção 2: Usando linha de comando (psql)
```powershell
# No PowerShell, execute:
$env:PGPASSWORD="sua_senha_aqui"
psql -h localhost -U seu_usuario_aqui -d dose_certa -f "c:\Users\User\Desktop\Projeto Doce Certa\Dose Certa\Dose Certa Spring\src\main\resources\init-usuarios.sql"
```

**Substitua:**
- `sua_senha_aqui` → sua senha do PostgreSQL
- `seu_usuario_aqui` → seu usuário do PostgreSQL (padrão: `postgres`)
- `dose_certa` → nome do seu banco de dados

### Opção 3: Executar SQL manualmente
Se você tem DBeaver, DataGrip, ou outra ferramenta:
1. Conecte ao banco
2. Abra Query Tool
3. Execute este SQL:

```sql
INSERT INTO usuarios (login, senha, perfil) VALUES
    ('admin', 'admin123', 'ADMINISTRADOR'),
    ('medico', 'medico123', 'MEDICO'),
    ('enfermeiro', 'enfermeiro123', 'ENFERMEIRO'),
    ('recepcao', 'recepcao123', 'RECEPCAO')
ON CONFLICT (login) DO NOTHING;
```

## Após inserir os usuários

Pode fazer login com:
- **Usuário:** `admin` | **Senha:** `admin123`
- **Usuário:** `medico` | **Senha:** `medico123`
- **Usuário:** `enfermeiro` | **Senha:** `enfermeiro123`
- **Usuário:** `recepcao` | **Senha:** `recepcao123`

## ⚠️ Informações do Banco

Para conectar ao PostgreSQL, você precisa de:
- **Host:** localhost (ou seu IP)
- **Porta:** 5432 (padrão)
- **Usuário:** postgres (padrão) - verifique em `application.properties`
- **Banco:** dose_certa (ou o nome que você usar)

Verifique em: `Dose Certa Spring/src/main/resources/application.properties`

```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
```

## Testando a Conexão

Se estiver usando Windows e tiver PostgreSQL instalado:

```powershell
# Testar conexão
psql -h localhost -U postgres
```

Se funcionar, você verá o prompt `postgres=#`

## Ainda não funcionou?

1. Verifique se PostgreSQL está rodando:
   ```powershell
   Get-Service | findstr postgres
   ```

2. Verifique se o banco existe:
   ```powershell
   psql -h localhost -U postgres -l
   ```

3. Verifique se a tabela `usuarios` foi criada pelo Hibernate:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'usuarios';
   ```

4. Verifique os logs do backend em `Dose Certa Spring` para erros de conexão
