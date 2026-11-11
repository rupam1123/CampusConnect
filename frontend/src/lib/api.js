export const HOSTED = import.meta.env.VITE_HOSTED_SITES === 'true';
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
export const allowedEmail = email => /^[^\s@]+@(gmail\.com|iitk\.ac\.in)$/.test(email.trim().toLowerCase());
export const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });
export async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    throw new Error(data.msg || 'Request failed');
  }
  return data;
}
