import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
export const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000'
export const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:5173'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

export const checkHealth = () => api.get('/api/health').then(r => r.data)

export const getCurrentUser = () =>
  axios.get(`${AUTH_API_URL}/api/auth/me`, { withCredentials: true }).then(r => r.data)

export const getUserCases = () => api.get('/api/cases').then(r => r.data)

export const getCase = (firNumber) => api.get(`/api/cases/${encodeURIComponent(firNumber)}`).then(r => r.data)

export const logoutUser = async () => {
  try {
    await axios.post(`${AUTH_API_URL}/api/auth/logout`, {}, { withCredentials: true })
  } catch (err) {
    console.error('Logout error:', err)
  }
}

export const submitTextReport = (caseId, text) =>
  api.post('/api/reports/text', { case_id: caseId, text }).then(r => r.data)

export const submitVoiceReport = (caseId, audioBlob) => {
  const form = new FormData()
  form.append('case_id', caseId)
  form.append('audio', audioBlob, 'recording.webm')
  return api.post('/api/reports/voice', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const transcribeAudio = (audioBlob) => {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  return api.post('/api/reports/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const getGraph = (caseId) =>
  api.get('/api/graph', { params: caseId ? { case_id: caseId } : {} }).then(r => r.data)

export const getNeighborhood = (nodeId, depth = 3) =>
  api.get(`/api/graph/neighborhood/${nodeId}`, { params: { depth } }).then(r => r.data)

export const getAnomalies = () => api.get('/api/anomalies').then(r => r.data)
