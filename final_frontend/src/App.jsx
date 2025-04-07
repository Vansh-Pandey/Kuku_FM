import { Navigate } from "react-router-dom";
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import Navbar from "./components/Navbar";
import { Routes, Route } from "react-router-dom";
import AudioPage from "./pages/AudioPage";
const App = () => {
  return (
    
    <div>
     
    <Navbar/>
    <Routes>
      <Route path="/" element={<LandingPage/>}/>
      {/* <Route path="/about" element={<About/>}/> */}
      {/* <Route path="/contact" element={<Contact/>}/> */}
      {/* <Route path="/login" element={<Login/>}/>
      <Route path="/signup" element={<SignUp/>}/>
      <Route path="/profile" element={<Profile/>}/> */}
      <Route path="/audio" element={<AudioPage/>}/>
      <Route path="/home" element={<Home/>}/>
    </Routes>
    </div>
  );
};

export default App;