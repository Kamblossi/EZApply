import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-6">EZApply</h2>
        <nav className="space-y-3">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/jobs">Jobs</Link>
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
