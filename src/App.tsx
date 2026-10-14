import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Dynamically load the user's pure HTML demo file
    window.location.replace('/demo.html');
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#141210', color: '#f0cf72', fontFamily: 'sans-serif' }}>
      در حال بارگذاری نرم‌افزار حسابداری کوشا...
    </div>
  );
}
