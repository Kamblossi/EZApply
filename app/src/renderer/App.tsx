import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

// Simple page components
const Dashboard = () => (
  <div className="max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-gray-900 mb-6">🎯 Dashboard</h1>
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-semibold mb-4">Application Overview</h2>
      <p className="text-gray-600">Track your job application progress here.</p>
    </div>
  </div>
);

const Profile = () => (
  <div className="max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-gray-900 mb-6">👤 Profile</h1>
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
      <p className="text-gray-600">Manage your professional information here.</p>
    </div>
  </div>
);

const Jobs = () => (
  <div className="max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-gray-900 mb-6">💼 Jobs</h1>
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-semibold mb-4">Job Opportunities</h2>
      <p className="text-gray-600">Browse and apply to jobs here.</p>
    </div>
  </div>
);

// Layout component with navigation
const Layout = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-6">EZApply</h2>
        <nav className="space-y-2">
          <Link 
            to="/dashboard" 
            className={`block p-3 rounded transition-colors ${
              isActive('/dashboard') 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-700'
            }`}
          >
            📊 Dashboard
          </Link>
          <Link 
            to="/profile" 
            className={`block p-3 rounded transition-colors ${
              isActive('/profile') 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-700'
            }`}
          >
            👤 Profile
          </Link>
          <Link 
            to="/jobs" 
            className={`block p-3 rounded transition-colors ${
              isActive('/jobs') 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-700'
            }`}
          >
            💼 Jobs
          </Link>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/jobs" element={<Jobs />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  console.log('App component rendering with React Router...');
  
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
