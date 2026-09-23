import { useEffect, useState, useCallback } from 'react'
import Navbar from './components/Navbar'
import ReportInput from './components/ReportInput'
import GraphView from './components/GraphView'
import AnomalyPanel from './components/AnomalyPanel'
import { checkHealth, getGraph, getAnomalies, getCurrentUser, logoutUser, getCase, AUTH_APP_URL } from './services/api'

const EMPTY_GRAPH = { nodes: [], edges: [] }

export default function App() {
  const [user, setUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [apiOnline, setApiOnline] = useState(false)
  const [caseId, setCaseId] = useState('')
  const [fullGraph, setFullGraph] = useState(EMPTY_GRAPH)
  const [viewGraph, setViewGraph] = useState(EMPTY_GRAPH)
  const [selectedNode, setSelectedNode] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [scanning, setScanning] = useState(false)
  const [isGraphFullScreen, setIsGraphFullScreen] = useState(false)
  // Persist report title and narrative across fullscreen toggles
  const [persistReportTitle, setPersistReportTitle] = useState('')
  const [persistReportText, setPersistReportText] = useState('')

  // 1. Session verification on mount: redirect to auth app if unauthenticated
  useEffect(() => {
    getCurrentUser()
      .then((data) => {
        if (data?.success && data?.user) {
          setUser(data.user)
          setAuthChecking(false)
        } else {
          window.location.href = AUTH_APP_URL
        }
      })
      .catch(() => {
        window.location.href = AUTH_APP_URL
      })
  }, [])

  const refreshGraph = useCallback(async () => {
    try {
      const data = await getGraph(caseId || undefined)
      setFullGraph(data || EMPTY_GRAPH)
      setViewGraph(data || EMPTY_GRAPH)
    } catch {
      /* backend offline */
    }
  }, [caseId])

  useEffect(() => {
    if (authChecking) return
    checkHealth().then(() => setApiOnline(true)).catch(() => setApiOnline(false))
    const interval = setInterval(() => {
      checkHealth().then(() => setApiOnline(true)).catch(() => setApiOnline(false))
    }, 15000)
    return () => clearInterval(interval)
  }, [authChecking])

  // Listen for Escape key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isGraphFullScreen) {
        setIsGraphFullScreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGraphFullScreen])

  // Reset active case, graph, and inputs whenever user changes
  useEffect(() => {
    setCaseId('')
    setFullGraph(EMPTY_GRAPH)
    setViewGraph(EMPTY_GRAPH)
    setSelectedNode(null)
    setAlerts([])
    setPersistReportTitle('')
    setPersistReportText('')
  }, [user?.id])

  // When caseId changes, automatically refresh graph
  useEffect(() => {
    if (caseId) {
      refreshGraph()
    }
  }, [caseId, refreshGraph])

  // Select an active case from profile menu or list
  const handleSelectCase = useCallback(async (selectedFir) => {
    if (!selectedFir) return
    const cleanFir = String(selectedFir).trim()
    setCaseId(cleanFir)
    setPersistReportTitle(cleanFir)

    // Fetch full case details from authoritative backend
    try {
      const res = await getCase(cleanFir)
      if (res?.success && res?.case) {
        if (res.case.case_study) {
          setPersistReportText(res.case.case_study)
        }
        if (res.case.case_title) {
          setPersistReportTitle(res.case.case_title)
        }
      }
    } catch {
      // Keep selected caseId even if narrative fetch fails
    }

    // Refresh graph for this selected case
    try {
      const data = await getGraph(cleanFir)
      setFullGraph(data || EMPTY_GRAPH)
      setViewGraph(data || EMPTY_GRAPH)
    } catch {
      /* backend offline */
    }
  }, [])

  async function handleLogout() {
    setUser(null)
    setCaseId('')
    setFullGraph(EMPTY_GRAPH)
    setViewGraph(EMPTY_GRAPH)
    setSelectedNode(null)
    setAlerts([])
    setPersistReportTitle('')
    setPersistReportText('')
    await logoutUser()
    window.location.href = AUTH_APP_URL
  }

  function handleNodeSelect(nodeId) {
    setSelectedNode(nodeId)
  }

  function handleReset() {
    setCaseId('')
    setFullGraph(EMPTY_GRAPH)
    setViewGraph(EMPTY_GRAPH)
    setSelectedNode(null)
    setAlerts([])
    setPersistReportTitle('')
    setPersistReportText('')
  }

  async function handleIngested() {
    await refreshGraph()
    await runScan()
  }

  async function runScan() {
    setScanning(true)
    try {
      const data = await getAnomalies()
      setAlerts(data || [])
    } catch {
      /* ignore -- backend offline */
    } finally {
      setScanning(false)
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide">Authenticating VigilNODE session...</span>
        </div>
      </div>
    )
  }

  // ==========================================================
  // FULL SCREEN VIEW: Covers 100% of the entire window
  // ==========================================================
  if (isGraphFullScreen) {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen bg-white flex flex-col overflow-hidden">
        <GraphView
          graphData={viewGraph}
          onNodeSelect={handleNodeSelect}
          selectedNodeId={selectedNode}
          isFullScreen={true}
          onToggleFullScreen={() => setIsGraphFullScreen(false)}
        />
      </div>
    )
  }

  // ==========================================================
  // NORMAL 2-COLUMN DASHBOARD VIEW
  // Crisp white theme with subtle ambient colors and dot grid
  // ==========================================================
  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 bg-tech-grid">
      {/* Eye-Catchy Ambient Glow Orbs behind the cards (subtle, airy, light) */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full blur-[100px] opacity-40 z-0"
        style={{ background: 'radial-gradient(circle, #93C5FD 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute top-1/2 -left-10 w-[450px] h-[450px] rounded-full blur-[100px] opacity-30 z-0"
        style={{ background: 'radial-gradient(circle, #FDE68A 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 right-10 w-[600px] h-[600px] rounded-full blur-[120px] opacity-35 z-0"
        style={{ background: 'radial-gradient(circle, #C4B5FD 0%, transparent 70%)' }}
      />

      {/* Modern Glassmorphic Navbar with compact Gmail-style profile popover */}
      <Navbar
        user={user}
        selectedCaseId={caseId}
        onLogout={handleLogout}
        onSelectCase={handleSelectCase}
      />

      {/* Main Workspace Area */}
      <main className="relative z-10 p-4 lg:p-5 max-w-[1760px] w-full mx-auto flex flex-col gap-4">
        {/* 2-COLUMN MAIN WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[620px]">
          {/* LEFT COLUMN (col-span-4): FIR Input (Top) + Anomaly Panel (Bottom) */}
          <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-[580px]">
            {/* 1. FIR / INCIDENT REPORT CARD (Highlights with Electric Blue border on hover) */}
            <ReportInput
              caseId={caseId}
              setCaseId={setCaseId}
              onIngested={handleIngested}
              onReset={handleReset}
              persistTitle={persistReportTitle}
              setPersistTitle={setPersistReportTitle}
              persistText={persistReportText}
              setPersistText={setPersistReportText}
            />

            {/* 2. ANOMALY & THREAT RADAR CARD (Highlights with Radiant Amber border on hover) */}
            <AnomalyPanel
              alerts={alerts}
              onRefresh={runScan}
              loading={scanning}
              onFocusNode={handleNodeSelect}
            />
          </div>

          {/* RIGHT COLUMN (col-span-8): Expanded Graph View */}
          {/* 3. INTELLIGENCE GRAPH CARD (Highlights with Violet/Indigo border on hover) */}
          <div className="lg:col-span-8 h-full min-h-[580px] flex flex-col">
            <GraphView
              graphData={viewGraph}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNode}
              isFullScreen={false}
              onToggleFullScreen={() => setIsGraphFullScreen(true)}
            />
          </div>
        </div>
      </main>
    </div>
  )
}