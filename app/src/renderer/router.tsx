import { createBrowserRouter } from 'react-router-dom';

// Simple test components
const TestDashboard = () => (
  <div style={{ padding: '20px' }}>
    <h1>Dashboard Test</h1>
    <p>If you see this, routing is working!</p>
  </div>
);

const TestLayout = () => (
  <div style={{ display: 'flex', height: '100vh' }}>
    <div style={{ width: '200px', backgroundColor: '#1f2937', color: 'white', padding: '20px' }}>
      <h2>EZApply</h2>
      <nav>
        <div style={{ marginBottom: '10px' }}>
          <a href="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</a>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <a href="/profile" style={{ color: 'white', textDecoration: 'none' }}>Profile</a>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <a href="/jobs" style={{ color: 'white', textDecoration: 'none' }}>Jobs</a>
        </div>
      </nav>
    </div>
    <div style={{ flex: 1, padding: '20px' }}>
      <TestDashboard />
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <TestLayout />,
  },
  {
    path: '/dashboard',
    element: <TestLayout />,
  },
]);
