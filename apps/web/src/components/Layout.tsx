import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, Command, Cpu, FileCode2, Gauge, GitBranch, Home, Menu, Moon, Search, Settings, Sun, TerminalSquare, UserRound, X } from 'lucide-react';
import { useAppState } from '../app/AppState';
import { useAuth } from '../app/AuthState';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/roadmap', label: 'Roadmap', icon: GitBranch },
  { to: '/commands', label: 'Command reference', icon: Command },
  { to: '/terminal', label: 'Terminal lab', icon: TerminalSquare },
  { to: '/missions', label: 'Linux missions', icon: BrainCircuit },
  { to: '/practice', label: 'Practice', icon: CheckCircle2 },
];
const labLinks = [
  { to: '/visualizers/scheduling', label: 'CPU scheduling', icon: Cpu },
  { to: '/visualizers/paging', label: 'Paging', icon: Activity },
  { to: '/visualizers/synchronization', label: 'Synchronization', icon: BrainCircuit },
  { to: '/visualizers/deadlocks', label: 'Deadlocks', icon: BrainCircuit },
  { to: '/visualizers/disk', label: 'Disk scheduling', icon: Gauge },
];

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state, setState } = useAppState();
  const { user } = useAuth();
  const location = useLocation();
  const toggleTheme = () => setState((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }));
  return <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><aside className={`sidebar ${mobileOpen ? 'mobile-visible' : ''}`}><div className="brand-row"><Link to="/" className="brand"><span className="brand-mark">∫</span><span className="brand-text">UOSVAF</span></Link><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div><Link to="/account" className="profile-card"><div className="avatar">{user ? <UserRound size={15} /> : 'OS'}</div><div className="profile-copy"><strong>{user?.display_name ?? 'Guest learner'}</strong><span>{user ? 'Account connected' : 'Building foundations'}</span></div></Link><nav className="nav-section"><span className="nav-label">Workspace</span>{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav><nav className="nav-section"><span className="nav-label">Interactive labs</span>{labLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-bottom"><NavLink to="/analytics" className="nav-link"><FileCode2 size={17} /><span>Analytics</span></NavLink><NavLink to="/settings" className="nav-link"><Settings size={17} /><span>Settings</span></NavLink><button className="theme-button" onClick={toggleTheme}>{state.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{state.theme === 'dark' ? 'Light theme' : 'Dark theme'}</span></button></div><button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}<span>{collapsed ? 'Expand' : 'Collapse'}</span></button></aside>{mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}<main className="main-area"><header className="topbar"><div className="breadcrumbs"><span>UOSVAF</span><span>/</span><strong>{location.pathname === '/' ? 'Overview' : location.pathname.split('/').filter(Boolean).slice(-1)[0]?.replaceAll('-', ' ')}</strong></div><div className="topbar-actions"><button className="search-button" onClick={() => document.dispatchEvent(new CustomEvent('os-a2z-search'))}><Search size={16} /><span>Search</span><kbd>⌘ K</kbd></button><div className="streak"><span>◒</span> 0 day streak</div></div></header><div className="page-content"><Outlet /></div></main></div>;
}
