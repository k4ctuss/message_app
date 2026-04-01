import './App.css'
import {Connection} from '@/views/Connection';
import { Accueil } from '@/views/Accueil';
import { AdminGroup } from "@/components/group/AdminGroup";
import { AuthContextProvider, useAuth } from '@/contexts/AuthContext';

import {HashRouter as Router, Route, Routes} from "react-router-dom";


function AppContent() {
  const { isConnected } = useAuth();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      {isConnected() ? (
        <Router>
          <Routes>
            <Route path="/" element={<Accueil />} >
              <Route path="groups/:gid" element={<AdminGroup/>}/>
            </Route>
          </Routes>
        </Router>
      )
      : 
      <Connection />
      }
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
