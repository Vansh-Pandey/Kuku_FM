import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Camera, ChevronRight, Code, Award, Cpu, Zap, Users, Headphones, Mic, Music, Podcast } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import emailjs from "@emailjs/browser";
import vanshImage from '../vansh.jpg'; // Adjust path as needed
import prianshImage from '../priansh.jpg';
import sakshamImage from '../saksham.jpg';
export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const threeContainerRef = useRef(null);
  const navigate = useNavigate();
  const form = useRef();

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);  
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); 
   

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs
      .sendForm(
        "service_2jhytmf",     // Replace with your actual service ID
        "template_t4ybf49",    // Replace with your actual template ID
        form.current,
        "Bs_6oVesMmS7CqI06"      // Replace with your actual public key
      )
      .then(
        (result) => {
          console.log(result.text); 
          form.current.reset(); // Reset the form after successful submission
        },
        (error) => {
          console.log(error.text); 
        }
      );
  };
  // Three.js setup
  useEffect(() => {
    if (!threeContainerRef.current) return;
    
    const container = threeContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;
    
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    
    if (canvasRef.current) {
      // Clear previous canvas if it exists
      while (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }
      canvasRef.current.appendChild(renderer.domElement);
    }
    
    // Add floating sound waves
    const createSoundWave = (radius, segments, color) => {
      const geometry = new THREE.TorusGeometry(radius, 0.05, 16, segments);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
        transparent: true,
        opacity: 0.6
      });
      const wave = new THREE.Mesh(geometry, material);
      scene.add(wave);
      return wave;
    };
    
    const waves = [
      createSoundWave(1.5, 60, 0x4f46e5),
      createSoundWave(2.0, 180, 0x7c3aed),
      createSoundWave(2.5, 100, 0x8b5cf6)
    ];
    
    // Add floating particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 500;
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      // Positions
      positions[i] = (Math.random() - 0.5) * 5;
      positions[i + 1] = (Math.random() - 0.5) * 15;
      positions[i + 2] = (Math.random() - 0.5) * 10;
      
      // Colors - purple to pink gradient
      // In the color generation loop:
colors[i] = 0.9 + Math.random() * 0.9;     // R (0.9-1.0)
colors[i + 1] = 0.1 + Math.random() * 0.2; // G (0.1-0.3)
colors[i + 2] = 0.1 + Math.random() * 0.2; // B (0.1-0.3)
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      // color: new THREE.Color(0xff0000),
      opacity: 1.0
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      particles.rotation.x += 0.0005;
      particles.rotation.y += 0.0007;
      
      waves.forEach((wave, i) => {
        wave.rotation.x += 0.001 * (i + 1);
        wave.rotation.y += 0.0015 * (i + 1);
        wave.scale.setScalar(1 + Math.sin(Date.now() * 0.001 + i) * 0.1);
      });
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up
      scene.remove(particles);
      waves.forEach(wave => scene.remove(wave));
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-white text-gray-900 overflow-hidden">
      {/* Three.js Background Container */}
      <div ref={threeContainerRef} className="absolute inset-0 z-0">
        <div ref={canvasRef} className="w-full h-full"></div>
      </div>
      
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-white bg-opacity-90 backdrop-blur-md py-2 shadow-sm' : 'py-4'}`}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="relative w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg overflow-hidden flex items-center justify-center mr-2">
              <Headphones size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">AI Masters</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="hover:text-purple-600 transition-colors font-medium">Features</a>
            <a href="#solution" className="hover:text-purple-600 transition-colors font-medium">Our Solution</a>
            <a href="#team" className="hover:text-purple-600 transition-colors font-medium">Team</a>
            <a onClick={() => navigate('/home')}  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-2 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl text-white font-medium cursor-pointer">
              Try Demo
            </a>
          </nav>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden text-gray-800" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`h-0.5 w-full bg-current transform transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`h-0.5 w-full bg-current transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
              <span className={`h-0.5 w-full bg-current transform transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>
        
        {/* Mobile menu */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${isMenuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="container mx-auto px-4 py-2 flex flex-col space-y-4 bg-white bg-opacity-95 backdrop-blur-md">
            <a href="#features" className="py-2 hover:text-purple-600 transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Features</a>
            <a href="#solution" className="py-2 hover:text-purple-600 transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Our Solution</a>
            <a href="#team" className="py-2 hover:text-purple-600 transition-colors font-medium" onClick={() => setIsMenuOpen(false)}>Team</a>
            <a 
              href="/home"  
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-full transition-all text-center text-white font-medium cursor-pointer"
              onClick={() => setIsMenuOpen(false)}
            >
              Try Demo
            </a>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20">
        <div className="container mx-auto px-4 z-10">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-block mb-6 px-4 py-2 bg-purple-100 rounded-full backdrop-blur-sm border border-purple-200">
              <span className="text-sm font-medium text-purple-700">KUKU FM Hackathon Submission</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                Revolutionizing Audio with AI
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-3xl mx-auto">
              AI-powered personalization, enhanced discovery, and immersive listening experiences for KUKU FM's next generation platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <a onClick={() => navigate('/home')} className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-xl text-white cursor-pointer">
                Experience Demo
              </a>
              <a href="#solution" className="px-10 py-4 border border-purple-600 hover:border-purple-700 rounded-full transition-all duration-300 backdrop-blur-sm bg-white bg-opacity-70 hover:bg-opacity-90 font-medium text-xl text-purple-700 cursor-pointer">
                Learn More
              </a>
            </div>
          </div>
          
          {/* Stats/Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto">
            <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-xl p-6 border border-gray-200 hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-md">
              <div className="font-bold text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">40%</div>
              <div className="text-gray-600 font-medium">More Engagement</div>
            </div>
            <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-xl p-6 border border-gray-200 hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-md">
              <div className="font-bold text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">5x</div>
              <div className="text-gray-600 font-medium">Faster Discovery</div>
            </div>
            <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-xl p-6 border border-gray-200 hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-md">
              <div className="font-bold text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">100+</div>
              <div className="text-gray-600 font-medium">Story Generations</div>
            </div>
            <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-xl p-6 border border-gray-200 hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-1 shadow-sm hover:shadow-md">
              <div className="font-bold text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">0ms</div>
              <div className="text-gray-600 font-medium">Latency</div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white bg-opacity-80 backdrop-blur-sm border border-gray-200 shadow-sm">
            <ChevronRight size={24} className="text-purple-600 rotate-90" />
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-24 relative z-10 bg-white bg-opacity-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                AI-Powered Audio Features
              </span>
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Transforming the KUKU FM experience with cutting-edge artificial intelligence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl p-8 border border-gray-200 hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-3 group shadow-sm hover:shadow-lg">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all duration-300">
                <Mic size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Voice Personalization</h3>
              <p className="text-gray-600 text-lg">
                Customize narration voices to match your preferences - adjust tone, speed, and even emotional delivery.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl p-8 border border-gray-200 hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-3 group shadow-sm hover:shadow-lg">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all duration-300">
                <Cpu size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Smart Recommendations</h3>
              <p className="text-gray-600 text-lg">
                Our AI learns your listening patterns to suggest content you'll love before you know you want it.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl p-8 border border-gray-200 hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-3 group shadow-sm hover:shadow-lg">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all duration-300">
                <Music size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Dynamic Audio Enhancement</h3>
              <p className="text-gray-600 text-lg">
                Automatically optimize audio quality based on your device, environment, and hearing preferences.
              </p>
            </div>
          </div>
          
          {/* Additional Features List */}
          <div className="mt-20 max-w-5xl mx-auto">
            <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">More Innovative Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                "Real-time language translation for global content",
                "Context-aware volume normalization",
                "Personalized audio summaries",
                "Multi-voice narration switching",
                "Background noise cancellation",
                "Emotion-based content filtering",
                "Audio bookmarking with AI-generated notes"
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.2 1.5L5.5 11.5L0.8 6.7L0 5.5L5.5 0L15.2 9.3L15.2 1.5Z" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-gray-700 text-lg">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Solution Section */}
      <section id="solution" className="py-28 relative z-10 bg-gradient-to-b from-white to-purple-50/90">
  <div className="container mx-auto px-4 max-w-7xl">
    <div className="text-center mb-24">
      <div className="inline-flex items-center justify-center mb-4">
        <span className="relative flex h-3 w-3 mr-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-600 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600"></span>
        </span>
        <span className="text-lg font-medium text-purple-600">AI Audio Technology</span>
      </div>
      <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Audiobook Generator
        </span>
        <span className="ml-4 text-purple-600">🎧</span>
      </h2>
      <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
        Transform text into professional audiobooks with AI-powered voice synthesis, 
        immersive soundscapes, and seamless production workflows.
      </p>
    </div>
    
    <div className="grid lg:grid-cols-2 gap-20 items-center">
      <div className="space-y-12">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mr-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-800">Cutting-Edge Features</h3>
          </div>
          <ul className="space-y-5">
            <li className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="ml-4 text-gray-700 text-lg leading-relaxed">
                <span className="font-semibold text-gray-900">Studio-Quality TTS</span> - MeloTTS and OpenVoice V2 deliver natural-sounding narration
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="ml-4 text-gray-700 text-lg leading-relaxed">
                <span className="font-semibold text-gray-900">Voice Cloning</span> - Customize and clone voices for unique narration styles
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="ml-4 text-gray-700 text-lg leading-relaxed">
                <span className="font-semibold text-gray-900">Immersive Audio</span> - Background music and sound effects from Jamendo
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="ml-4 text-gray-700 text-lg leading-relaxed">
                <span className="font-semibold text-gray-900">AI Story Crafting</span> - OpenAI API generates compelling narratives
              </p>
            </li>
          </ul>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-3xl font-bold text-gray-800 mb-6">Technology Stack</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Frontend
              </h4>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  React + Vite
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  Three.js
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  Tailwind CSS
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                Backend
              </h4>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                  Python + FastAPI
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                  OpenAI Whisper
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                  FFmpeg + PyDub
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl transform rotate-1 group-hover:rotate-2 transition-all duration-300 opacity-90"></div>
        <div className="relative bg-white rounded-3xl p-10 shadow-2xl border border-gray-100 transform -rotate-1 group-hover:-rotate-2 transition-all duration-300 h-full overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-purple-200/30 blur-xl"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-blue-200/30 blur-xl"></div>
          
          <div className="flex items-center mb-8 relative z-10">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mr-5 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-800">Get Started</h3>
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                System Requirements
              </h4>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full border border-blue-200 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-gray-700">Node.js v16+</span>
                </li>
                <li className="flex items-center">
                  <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full border border-blue-200 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-gray-700">Python v3.10+</span>
                </li>
                <li className="flex items-center">
                  <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full border border-blue-200 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-gray-700">FFmpeg installed</span>
                </li>
              </ul>
            </div>

            <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                API Keys Required
              </h4>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full border border-purple-200 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-gray-700">OpenAI API key</span>
                </li>
                <li className="flex items-center">
                  <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full border border-purple-200 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-gray-700">Jamendo API (optional)</span>
                </li>
              </ul>
            </div>

            <button 
  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
  onClick={() => {
    // Create the installation guide content
    const guideContent = `Audiobook Generator Installation Guide
===============================

Frontend Setup:
-------------
cd final_frontend
npm install
npm run dev

Backend Setup:
-------------
cd final_backend
# Create .env file with your OpenAI API key
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

Voice Backend Setup:
------------------
cd final_backend/voice-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Download and extract checkpoints:
# https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_1226.zip
# https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_v2_0417.zip

pip install -r requirements.txt
pip install git+https://github.com/myshell-ai/MeloTTS.git
python -m unidic download

uvicorn backend_main:app --reload

Project Structure:
----------------
final_kuku/
├── final_frontend/       # React frontend
│   ├── public/          # Static assets
│   └── src/             # Source code
│       ├── assets/      # Images, SVGs
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── store/       # State management
│       └── ...          # Other frontend files
├── backend/             # Python backend
│   ├── services/        # API services
│   ├── stories/         # Generated stories
│   └── Voice-backend/   # Voice processing
│       ├── default_voices/  # Preloaded voice samples
│       └── openvoice/   # OpenVoice implementation
│           ├── outputs/ # Generated audio files
│           └── ...      # Other voice processing files
└── ...`;

    // Create a Blob with the text content
    const blob = new Blob([guideContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Audiobook_Generator_Installation_Guide.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }}
>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
  Download Installation Guide
</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
      
      {/* Team Section */}
      <section id="team" className="py-24 relative z-10 bg-white">
  <div className="container mx-auto px-4">
    <div className="text-center mb-20">
      <h2 className="text-4xl md:text-6xl font-bold mb-6">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          The AI Masters Team
        </span>
      </h2>
      <p className="text-xl text-gray-700 max-w-3xl mx-auto">
        Passionate engineers and designers creating the future of audio experiences.
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {[
        { 
          name: "Vansh Pandey", 
          role: "Team Member", 
          bio: "Student at IIT Mandi",
          // bg: "from-blue-200 to-indigo-100",
          image: vanshImage
        },
        { 
          name: "Priansh Yajnik", 
          role: "Team Member", 
          bio: "Student at IIT Mandi",
          // bg: "from-purple-600 to-pink-600",
          image: prianshImage
        },
        { 
          name: "Saksham Kundu", 
          role: "Team Member", 
          bio: "Student at IIT Mandi",
          // bg: "from-green-600 to-teal-600",
          image: sakshamImage
        }
      ].map((member, index) => (
        <div key={index} className="group relative overflow-hidden rounded-2xl aspect-square shadow-lg hover:shadow-xl transition-all duration-300">
          {/* Background image with gradient overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: `url(${member.image})` }}
          ></div>
          <div className={`absolute inset-0 bg-gradient-to-br ${member.bg} opacity-60 z-1`}></div>
          <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black to-transparent opacity-90 group-hover:opacity-70 transition-all duration-300 z-10">
            <h3 className="text-2xl font-bold text-white mb-1">{member.name}</h3>
            <p className="text-purple-200 font-medium mb-3">{member.role}</p>
            <p className="text-gray-300 text-sm">{member.bio}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
      
      {/* CTA Section */}
      <section id="contact" className="py-24 relative z-10 overflow-hidden bg-gradient-to-b from-purple-50 to-white">
        <div className="container mx-auto px-4 relative">
          <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-blue-400 filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-purple-400 filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>
          
          <div className="max-w-4xl mx-auto bg-white bg-opacity-90 backdrop-blur-md rounded-3xl p-10 border border-gray-200 shadow-xl relative z-10">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-6">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  Experience the Future of Audio
                </span>
              </h2>
              <p className="text-xl text-gray-700 max-w-2xl mx-auto">
                Request access to our demo and see how AI can transform your KUKU FM experience.
              </p>
            </div>
            
            <form ref={form} onSubmit={sendEmail} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    name="user_name"
                    className="w-full px-6 py-4 rounded-xl bg-white border border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-lg"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="user_email"
                    className="w-full px-6 py-4 rounded-xl bg-white border border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-lg"
                    placeholder="Your email"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  className="w-full px-6 py-4 rounded-xl bg-white border border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all text-lg h-40"
                  name="message" placeholder="Tell us about your interest in our solution"
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="w-full px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-xl text-white"
              >
                Request Demo Access
              </button>
            </form>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-16 relative z-10 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div className="flex items-center mb-8 md:mb-0">
              <div className="relative w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg overflow-hidden flex items-center justify-center mr-3">
                <Headphones size={20} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">AI Masters</h3>
            </div>
            
            <div className="flex space-x-6">
              
              <a href="https://www.instagram.com/https_vansh_/" className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center hover:bg-purple-200 transition-all">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://github.com/SakshamKundu/Kuku_FM_AI_Masters.git" className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center hover:bg-purple-200 transition-all">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div> 
              <ul className="space-y-3">
                
              </ul>
            </div>
            
            <div> 
              <ul className="space-y-3">
                 
              </ul>
            </div>
            
            <div> 
              <ul className="space-y-3">
                 
              </ul>
            </div>
            
            <div> 
              <ul className="space-y-3">
                 
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              © 2025 AI Masters - KUKU FM Hackathon Submission. All rights reserved.
            </p>
            
            {/* Animated wave effect */}
            <div className="relative h-20 overflow-hidden mt-8">
              <div className="absolute bottom-0 left-0 w-full">
                <svg className="w-full h-10" viewBox="0 0 1440 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path className="animate-wave-slow" d="M0 27L48 24.7C96 22.3 192 17.7 288 14.2C384 10.7 480 8.3 576 13.8C672 19.3 768 32.7 864 35.2C960 37.7 1056 29.3 1152 24.7C1248 20 1344 19 1392 18.5L1440 18V54H1392C1344 54 1248 54 1152 54C1056 54 960 54 864 54C768 54 672 54 576 54C480 54 384 54 288 54C192 54 96 54 48 54H0V27Z" fill="url(#paint0_linear)" fillOpacity="0.1"/>
                  <defs>
                    <linearGradient id="paint0_linear" x1="720" y1="0" x2="720" y2="54" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4F46E5"/>
                      <stop offset="1" stopColor="#9333EA"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 w-full">
                <svg className="w-full h-8" viewBox="0 0 1440 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path className="animate-wave-fast transform translate-x-12" d="M0 27L48 31.5C96 36 192 45 288 43.2C384 41.3 480 28.7 576 22.5C672 16.3 768 16.7 864 19.8C960 23 1056 29 1152 30.7C1248 32.3 1344 29.7 1392 28.3L1440 27V54H1392C1344 54 1248 54 1152 54C1056 54 960 54 864 54C768 54 672 54 576 54C480 54 384 54 288 54C192 54 96 54 48 54H0V27Z" fill="url(#paint1_linear)" fillOpacity="0.1"/>
                  <defs>
                    <linearGradient id="paint1_linear" x1="720" y1="0" x2="720" y2="54" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#8B5CF6"/>
                      <stop offset="1" stopColor="#3B82F6"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}