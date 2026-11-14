import { ArrowRight, BrainCircuit, Command, Cpu, Disc3, MemoryStick, ShieldCheck, TerminalSquare, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { commands, exercises, modules } from '../data/curriculum';

const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);

const labs = [
  { to: '/visualizers/scheduling', label: 'CPU scheduling', icon: Cpu, detail: 'Eight policies over one editable workload, with a ranked comparison of waiting and turnaround time.' },
  { to: '/visualizers/paging', label: 'Paging', icon: MemoryStick, detail: 'FIFO, LRU and Optimal replacement traced frame by frame against a reference string.' },
  { to: '/visualizers/synchronization', label: 'Synchronization', icon: Utensils, detail: 'Bounded buffer, readers–writers and dining philosophers as stepped interleavings.' },
  { to: '/visualizers/deadlocks', label: 'Deadlocks', icon: ShieldCheck, detail: "Banker's safety test that answers whether the system can still finish." },
  { to: '/visualizers/disk', label: 'Disk scheduling', icon: Disc3, detail: 'Six head-movement policies with total track distance and ordering.' },
];

const proof = [
  { icon: TerminalSquare, label: 'Safe simulated terminal' },
  { icon: BrainCircuit, label: 'Visual system traces' },
  { icon: Command, label: 'Original command reference' },
];

export function HomePage() {
  return <div className="landing-page">
    <div className="landing-nav">
      <Link to="/" className="brand"><span className="brand-mark">∫</span><span className="brand-text">OS A2Z</span></Link>
      <div>
        <Link to="/roadmap" className="text-link">Roadmap</Link>
        <Link to="/commands" className="text-link">Commands</Link>
        <Link to="/dashboard" className="button button-primary">Open workspace <ArrowRight size={16} /></Link>
      </div>
    </div>

    <section className="landing-hero">
      <span className="eyebrow">OPERATING SYSTEMS / INTERACTIVE LEARNING</span>
      <h1>Learn the OS.<br /><em>Master the terminal.</em><br />Understand the machine.</h1>
      <p>OS A2Z is a practice-first learning environment for students who want to stop memorising diagrams and start reasoning through system state.</p>
      <div className="hero-actions">
        <Link to="/dashboard" className="button button-primary">Start your path <ArrowRight size={16} /></Link>
        <Link to="/visualizers/scheduling" className="button button-secondary"><Cpu size={16} /> Try a lab</Link>
      </div>
      <div className="landing-proof">{proof.map(({ icon: Icon, label }) => <span key={label}><Icon size={17} /> {label}</span>)}</div>
    </section>

    <section className="landing-metrics" aria-label="Curriculum size">
      <div><strong>{modules.length}</strong><span>modules</span></div>
      <div><strong>{totalLessons}</strong><span>lessons</span></div>
      <div><strong>{exercises.length}</strong><span>practice problems</span></div>
      <div><strong>{commands.length}</strong><span>command entries</span></div>
      <div><strong>{labs.length}</strong><span>interactive labs</span></div>
    </section>

    <section className="landing-section">
      <header>
        <span className="eyebrow">THE LAB</span>
        <h2>Change one input. Predict the next state.</h2>
        <p>Every simulator runs on a deterministic model, so the trace you study is the trace that will appear in an exam.</p>
      </header>
      <div className="landing-labs">
        {labs.map(({ to, label, icon: Icon, detail }) => <Link to={to} className="landing-lab-card" key={to}>
          <span className="landing-lab-icon"><Icon size={18} /></span>
          <strong>{label}</strong>
          <p>{detail}</p>
          <span className="landing-lab-open">Open lab <ArrowRight size={14} /></span>
        </Link>)}
        <Link to="/terminal" className="landing-lab-card landing-lab-card-wide">
          <span className="landing-lab-icon"><TerminalSquare size={18} /></span>
          <div>
            <strong>A terminal that cannot break your machine</strong>
            <p>Practise pipelines and permissions in a simulated filesystem, then unlock the isolated Linux sandbox when you sign in.</p>
          </div>
          <span className="landing-lab-open">Open terminal <ArrowRight size={14} /></span>
        </Link>
      </div>
    </section>

    <section className="landing-section">
      <header>
        <span className="eyebrow">THE ROADMAP</span>
        <h2>Twelve modules, from the shell to the kernel boundary.</h2>
        <p>Each module unlocks in order, and every lesson ends with an experiment you have to record.</p>
      </header>
      <div className="landing-modules">
        {modules.map((module) => <Link to={`/roadmap/${module.slug}`} className="landing-module" key={module.id}>
          <span className="landing-module-number">{String(module.number).padStart(2, '0')}</span>
          <strong>{module.title}</strong>
          <small>{module.lessons.length} lessons · {module.difficulty}</small>
        </Link>)}
      </div>
    </section>

    <section className="landing-cards">
      <div><span>01</span><h3>Learn the rule</h3><p>Short lessons with worked examples, common mistakes, and a clear system boundary.</p></div>
      <div><span>02</span><h3>Operate the model</h3><p>Use a terminal or simulator to change inputs and observe the next state.</p></div>
      <div><span>03</span><h3>Prove the idea</h3><p>Practice problems, feedback, and a roadmap that records what you can actually do.</p></div>
    </section>

    <footer className="landing-footer">
      <div>
        <Link to="/" className="brand"><span className="brand-mark">∫</span><span className="brand-text">OS A2Z</span></Link>
        <p>An interactive operating-systems curriculum. Built for students, students of the machine.</p>
      </div>
      <nav aria-label="Footer">
        <Link to="/roadmap">Roadmap</Link>
        <Link to="/commands">Command reference</Link>
        <Link to="/terminal">Terminal lab</Link>
        <Link to="/practice">Practice</Link>
        <Link to="/analytics">Analytics</Link>
        <Link to="/account">Account</Link>
      </nav>
      <small>Progress stays in your browser until you connect an account.</small>
    </footer>
  </div>;
}
