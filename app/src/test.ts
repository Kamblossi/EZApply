console.log('Simple TypeScript test loaded!');

const root = document.getElementById('root');
if (root) {
  root.innerHTML = '<h1 style="color: green;">✅ TypeScript is working!</h1>';
} else {
  console.error('Root element not found');
}
