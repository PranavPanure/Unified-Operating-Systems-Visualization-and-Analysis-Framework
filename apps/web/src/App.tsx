import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStateProvider } from './app/AppState';
import { AuthProvider } from './app/AuthState';
import { Layout } from './components/Layout';
import { AccountPage } from './pages/AccountPage';
import { CommandsPage } from './pages/CommandsPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { MissionsPage } from './pages/MissionsPage';
import { ModulePage } from './pages/ModulePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PracticePage } from './pages/PracticePage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SettingsPage } from './pages/SettingsPage';
import { TerminalPage } from './pages/TerminalPage';

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(({ AnalyticsPage }) => ({ default: AnalyticsPage })));
const VisualizerPage = lazy(() => import('./pages/VisualizerPage').then(({ VisualizerPage }) => ({ default: VisualizerPage })));

export default function App() {
  return <AuthProvider><AppStateProvider><BrowserRouter><Suspense fallback={<div className="empty-page"><span className="eyebrow">LOADING LAB</span><h1>Waking the simulator…</h1></div>}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route element={<Layout />}>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="roadmap" element={<RoadmapPage />} />
      <Route path="roadmap/:moduleSlug" element={<ModulePage />} />
      <Route path="lesson/:lessonSlug" element={<LessonPage />} />
      <Route path="commands" element={<CommandsPage />} />
      <Route path="commands/:commandSlug" element={<CommandsPage />} />
      <Route path="missions" element={<MissionsPage />} />
      <Route path="terminal" element={<TerminalPage />} />
      <Route path="practice" element={<PracticePage />} />
      <Route path="visualizers/:kind" element={<VisualizerPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="bookmarks" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></Suspense></BrowserRouter></AppStateProvider></AuthProvider>;
}
