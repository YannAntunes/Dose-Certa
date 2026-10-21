# Dose Certa deployment

Vercel hosts React/Vite; Render hosts Spring Boot; Supabase PostgreSQL is accessed only by the backend over JDBC/SSL. Never expose database credentials, JWT secrets, or Supabase service-role keys in VITE_* variables or Git.

## Render
Use exact Session Pooler values from Supabase > Connect for PGHOST, PGPORT, PGDATABASE, SPRING_DATASOURCE_USERNAME and SPRING_DATASOURCE_PASSWORD. Do not guess the pooler host. Configure JWT_SECRET and APP_CORS_ALLOWED_ORIGINS=https://dose-certa-bay.vercel.app. For an empty DB only, temporarily enable APP_BOOTSTRAP_ADMIN_ENABLED and set login/password, then disable and remove credentials after confirming login.

## Vercel
Set VITE_API_BASE_URL to the actual Render API URL in Production, Preview and Development and redeploy.

## Tests
Run npm test and npm run build from the frontend directory. Run mvnw.cmd with the test profile from the Spring directory. The /health/ready endpoint returns 200 only when SELECT 1 succeeds. Keep the Render database as rollback until Supabase is verified.
