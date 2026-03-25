import './App.css'
import {Login} from './view/Login';
import { Accueil } from './view/Accueil';
import { AuthContextProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { isConnected } = useAuth();

  return isConnected() ? <Accueil /> : <Login />;
}

function App() {

  return (
    <AuthContextProvider>
      <AppContent />
    </AuthContextProvider>  )
}

export default App
