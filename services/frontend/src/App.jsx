import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Dashboard from './pages/Dashboard.jsx';
import Config from './pages/Config.jsx';
import DigitalTwinNavbar from './components/Navbar.jsx';

function App() {
    return (
        <Router>
            <DigitalTwinNavbar />
            <div className="container mt-4">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/config" element={<Config />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
