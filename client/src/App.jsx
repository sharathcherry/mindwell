import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ChatPage from './pages/ChatPage';
import MoodTrackerPage from './pages/MoodTrackerPage';
import JournalPage from './pages/JournalPage';
import ExercisesPage from './pages/ExercisesPage';
import ReportsPage from './pages/ReportsPage';
import ProgressPage from './pages/ProgressPage';
import CrisisPage from './pages/CrisisPage';
import './styles/index.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/mood" element={<MoodTrackerPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/crisis" element={<CrisisPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
