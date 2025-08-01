// Simple React test without router
import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('🧪 Testing React without router...');

const SimpleApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1 style={{ color: 'blue' }}>🎉 React is Working!</h1>
      <p>If you see this, React + TypeScript + Vite are all working together!</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  );
};

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<SimpleApp />);
  console.log('✅ Simple React app mounted successfully');
} else {
  console.error('❌ Root element not found!');
}
