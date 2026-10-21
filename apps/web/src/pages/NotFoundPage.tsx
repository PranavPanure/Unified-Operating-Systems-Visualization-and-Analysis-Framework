import { Link } from 'react-router-dom';
export function NotFoundPage() { return <div className="empty-page"><span className="eyebrow">404 / PAGE NOT FOUND</span><h1>The process wandered off.</h1><p>That route does not exist in the current curriculum.</p><Link to="/dashboard" className="button button-primary">Return to dashboard</Link></div>; }
