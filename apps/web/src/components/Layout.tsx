import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, Command, Cpu, FileCode2, Gauge, GitBranch, Home, LockKeyhole, MemoryStick, Menu, Search, Settings, TerminalSquare, UserRound, Workflow, X } from 'lucide-react';
import { useAppState } from '../app/AppState';
import { useAuth } from '../app/AuthState';
import { CommandPalette } from './CommandPalette';
import { currentStreak } from '../lib/storage';

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
  { to: '/visualizers/paging', label: 'Paging', icon: MemoryStick },
  { to: '/visualizers/synchronization', label: 'Synchronization', icon: Workflow },
  { to: '/visualizers/deadlocks', label: 'Deadlocks', icon: LockKeyhole },
  { to: '/visualizers/disk', label: 'Disk scheduling', icon: Gauge },
];
const labRoutes = labLinks.map((link) => link.to);

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state } = useAppState();
  const { user } = useAuth();
  const location = useLocation();
  const streak = currentStreak(state);
  if (labRoutes.includes(location.pathname)) return <div className="cpu-scheduler-fullscreen"><Outlet /></div>;
  return <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <button className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
    <aside className={`sidebar ${mobileOpen ? 'mobile-visible' : ''}`}>
      <div className="brand-row">
        <Link to="/" className="brand"><span className="brand-mark">∫</span><span className="brand-text">OS A2Z</span></Link>
        <button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button>
      </div>
      <Link to="/account" className="profile-card"><div className="avatar">{user ? <UserRound size={15} /> : 'OS'}</div><div className="profile-copy"><strong>{user?.display_name ?? 'Guest learner'}</strong><span>{user ? 'Account connected' : 'Building foundations'}</span></div></Link>
      <nav className="nav-section"><span className="nav-label">Workspace</span>{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav>
      <nav className="nav-section"><span className="nav-label">Interactive labs</span>{labLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom">
        <NavLink to="/analytics" className="nav-link"><FileCode2 size={17} /><span>Analytics</span></NavLink>
        <NavLink to="/settings" className="nav-link"><Settings size={17} /><span>Settings</span></NavLink>
      </div>
      <button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}<span>{collapsed ? 'Expand' : 'Collapse'}</span></button>
    </aside>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs"><span>OS A2Z</span><span>/</span><strong>{location.pathname === '/' ? 'Overview' : location.pathname.split('/').filter(Boolean).slice(-1)[0]?.replaceAll('-', ' ')}</strong></div>
        <div className="topbar-actions">
          <button className="search-button" aria-label="Search lessons, commands and exercises" onClick={() => document.dispatchEvent(new CustomEvent('os-a2z-search'))}><Search size={16} /><span>Search</span><kbd>Ctrl K</kbd></button>
          <div className="streak" title="Consecutive days with recorded work"><span>◒</span> {streak} day{streak === 1 ? '' : 's'} streak</div>
        </div>
      </header>
      <div className="page-content"><Outlet /></div>
    </main>
    <CommandPalette />
  </div>;
}
