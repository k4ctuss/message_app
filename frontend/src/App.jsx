import './App.css'
import {Login} from '@/views/Login';
import { Accueil } from '@/views/Accueil';
import { AuthContextProvider, useAuth } from '@/contexts/AuthContext';

function AppContent() {
  const { isConnected } = useAuth();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {isConnected() ? <Accueil /> : <Login />}
      </div>
    </div>
  );
}

function App() {

  return (
    <AuthContextProvider>
      <AppContent />
    </AuthContextProvider>  )
}

export default App
