# Cadastro seguro de usuários — Dose Certa

Para o primeiro usuário em banco vazio, configure temporariamente no Render APP_BOOTSTRAP_ADMIN_ENABLED=true, APP_BOOTSTRAP_ADMIN_LOGIN e APP_BOOTSTRAP_ADMIN_PASSWORD (mínimo 16 caracteres). O bootstrap cria um ADMIN com senha BCrypt só se não houver usuários. Após confirmar o primeiro login, desative o bootstrap e remova as variáveis de login/senha. Cadastre os demais usuários pela interface administrativa. O seed antigo com senhas em texto puro foi neutralizado.
