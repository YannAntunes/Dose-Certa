export function resolveApiBaseUrl(configuredUrl, isDevelopment = false) {
  const configured = typeof configuredUrl === 'string' ? configuredUrl.trim() : '';
  const fallback = isDevelopment ? 'http://localhost:8080' : 'https://dose-certa-api-uwza.onrender.com';
  let result = configured || fallback;
  while (result.endsWith('/')) result = result.slice(0, -1);
  return result;
}
