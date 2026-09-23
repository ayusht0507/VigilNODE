import { useState, useRef, useEffect } from 'react'
import { LogOut, Briefcase, ChevronRight, Shield, User as UserIcon, Check } from 'lucide-react'
import { getUserCases } from '../services/api'

export default function ProfileMenu({ user, selectedCaseId, onLogout, onSelectCase }) {
  const [isOpen, setIsOpen] = useState(false)
  const [cases, setCases] = useState([])
  const [loadingCases, setLoadingCases] = useState(false)
  const menuRef = useRef(null)

  const displayName = user?.name || user?.email?.split('@')[0] || 'Investigator'
  const userInitial = displayName.charAt(0).toUpperCase()
  const userEmail = user?.email || ''

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close popover on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Reset cases immediately when user changes
  useEffect(() => {
    setCases([])
    setIsOpen(false)
  }, [user?.id])

  // Fetch authenticated user's active cases when popover opens
  useEffect(() => {
    if (isOpen && user?.id) {
      setLoadingCases(true)
      getUserCases()
        .then((res) => {
          if (res?.success && Array.isArray(res?.cases)) {
            setCases(res.cases)
          } else if (Array.isArray(res)) {
            setCases(res)
          } else {
            setCases([])
          }
        })
        .catch(() => {
          setCases([])
        })
        .finally(() => {
          setLoadingCases(false)
        })
    } else if (!isOpen) {
      // Optional: keep cases or keep clean
    }
  }, [isOpen, user?.id])

  function handleCaseClick(c) {
    if (onSelectCase && c?.fir_number) {
      onSelectCase(c.fir_number)
      setIsOpen(false)
    }
  }

  function handleLogoutClick() {
    setIsOpen(false)
    if (onLogout) {
      onLogout()
    }
  }

  return (
    <div className="relative z-30" ref={menuRef}>
      {/* Compact Circular Profile Button (Gmail-style) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-xs border-2 transition-all duration-200 cursor-pointer focus:outline-hidden ${
          isOpen
            ? 'border-blue-500 ring-3 ring-blue-500/25 scale-105'
            : 'border-white/90 hover:border-blue-400 hover:shadow-md hover:scale-105 active:scale-95'
        }`}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        <span>{userInitial}</span>
      </button>

      {/* Gmail-style Floating Popover Anchored Below Avatar */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2.5 w-[330px] sm:w-[350px] bg-white rounded-2xl border border-slate-200/90 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.14)] overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-2"
          role="menu"
        >
          {/* Subtle Top Accent Gradient */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

          {/* SECTION A: USER PROFILE HEADER */}
          <div className="p-4 flex flex-col items-center text-center bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-xl flex items-center justify-center shadow-md mb-2 border-2 border-white ring-2 ring-blue-100">
              {userInitial}
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
              {displayName}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[280px]">
              {userEmail}
            </p>
          </div>

          {/* SECTION B: USER DETAILS */}
          <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Shield size={13} className="text-blue-600" />
              <span>Role</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-200/60">
              Investigator
            </span>
          </div>

          {/* SECTION C: ACTIVE CASES CURRENTLY SOLVING */}
          <div className="p-3.5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 tracking-wide uppercase">
                <Briefcase size={13} className="text-slate-500" />
                <span>Active Cases</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                {cases.length} assigned
              </span>
            </div>

            {loadingCases ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading cases...</span>
              </div>
            ) : cases.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No active cases yet.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-0.5">
                {cases.map((c) => {
                  const isSelected = selectedCaseId && (c.fir_number === selectedCaseId || c.id === selectedCaseId)
                  return (
                    <button
                      key={c.id || c.fir_number}
                      type="button"
                      onClick={() => handleCaseClick(c)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 group cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/40 shadow-xs'
                          : 'bg-slate-50/90 hover:bg-blue-50/70 border-slate-200/70 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold truncate ${
                          isSelected ? 'text-emerald-900' : 'text-slate-800 group-hover:text-blue-700'
                        }`}>
                          {c.fir_number}
                        </span>
                        {isSelected ? (
                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100/90 border border-emerald-300/80 rounded-full px-1.5 py-0.5 shrink-0 shadow-xs" title="Currently Selected Case">
                            <Check size={11} strokeWidth={3} />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider">Active</span>
                          </div>
                        ) : (
                          <ChevronRight size={13} className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                        )}
                      </div>
                      {c.case_title && c.case_title !== c.fir_number && (
                        <p className={`text-[11px] font-medium truncate mt-0.5 ${
                          isSelected ? 'text-emerald-700/80' : 'text-slate-600'
                        }`}>
                          {c.case_title}
                        </p>
                      )}
                      {c.case_study && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {c.case_study}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* SECTION D: LOGOUT */}
          <div className="p-2 bg-slate-50/70">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 hover:text-red-600 bg-white hover:bg-red-50/80 rounded-xl border border-slate-200/80 hover:border-red-200 shadow-2xs transition-all duration-150 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
