import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Play from './pages/Play';
import Rules from './pages/Rules';
import Toast from './components/Toast/Toast';
import './App.css';

function App() {
  return (
    // basename comes from "homepage" in package.json (e.g. /arima on GitHub Pages)
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pass-and-play" element={<Play />} />
        <Route path="/online" element={<Play online />} />
        <Route path="/rules" element={<Rules />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}

export default App;