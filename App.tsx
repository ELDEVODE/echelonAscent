import Dashboard from './components/Dashboard';
import { ToastProvider } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';

function App() {
  return (
    <ToastProvider>
      <Dashboard />
      <ToastContainer />
    </ToastProvider>
  );
}

export default App; 