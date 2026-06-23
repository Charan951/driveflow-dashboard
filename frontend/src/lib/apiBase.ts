/** API base URL. Empty VITE_API_URL uses the Vite dev proxy (/api) so httpOnly cookies work on localhost. */
export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return '/api';
  return `${configured.replace(/\/$/, '')}/api`;
};
