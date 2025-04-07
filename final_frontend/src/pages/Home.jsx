import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import {
  Headphones,
  BookOpen,
  Sparkles,
  Clock,
  User,
  Menu,
  X, 
} from "lucide-react";



const Home = () => {
  const navigate = useNavigate();
  const generateVoice = async () => {
    // Navigate to /audio page with the story data
    navigate('/audio', { 
      state: { 
        story: generatedStory,
        taggedStory: generatedTagged
      }
    });
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedStory, setGeneratedStory] = useState(null);
  const [generatedTagged, setTaggedStory] = useState(null);
  const [loadingText, setLoadingText] = useState("Gathering inspiration...");
  const [selectedGenre, setSelectedGenre] = useState("fantasy");
  const [selectedLength, setSelectedLength] = useState("medium");
  const [storyContext, setStoryContext] = useState("");
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const threeContainerRef = useRef(null);
  const heroRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [shareLink, setShareLink] = useState("");
  // const [isVoiceGenerating, setVoiceGeneration] = useState(false);
  // const [voiceProgress, setVoiceProgress] = useState(0);
  // const [audioUrl, setAudioUrl] = useState(null);
  // const [voiceError, setVoiceError] = useState(null);

  const [isTranscribing, setIsTranscribing] = useState(false);

const handleAudioUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setIsTranscribing(true);
  
  try {
    const formData = new FormData();
    formData.append("audio_file", file);

    const response = await fetch("http://localhost:8001/transcribe-audio", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Transcription failed");
    }

    const data = await response.json();
    setStoryContext(data.text);
  } catch (error) {
    console.error("Error transcribing audio:", error);
    alert("Failed to transcribe audio. Please try again.");
  } finally {
    setIsTranscribing(false);
  }
};
  const downloadAsPDF = async () => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.createElement("div");
      element.innerHTML = `
        <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
          <h1 style="text-align: center; color: #4f46e5; margin-bottom: 20px;">Your Story</h1>
          <div style="line-height: 1.6; font-size: 16px;">
            ${generatedStory.split("\n\n").map(para => `<p style="margin-bottom: 15px;">${para}</p>`).join('')}
          </div>
        </div>
      `;
  
      const opt = {
        margin: 10,
        filename: 'my-story.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          logging: true,
          useCORS: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };
  
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };
  const copyStory = () => {
    navigator.clipboard
      .writeText(generatedStory)
      .then(() => {
        // You can add a toast or temporary message here
        alert("Story copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy story:", err);
        alert("Failed to copy story. Please try again.");
      });
  };
  const shareStory = () => {
    // For a real app, you would generate a unique link and save the story on your server
    // For demo purposes, we'll create a data URL
    const storyBlob = new Blob([generatedStory], { type: "text/plain" });
    const url = URL.createObjectURL(storyBlob);
    setShareLink(url);

    if (navigator.share) {
      navigator
        .share({
          title: "Check out this story I created",
          text: "I created this story using an AI story generator",
          url: url,
        })
        .catch((error) => console.log("Error sharing:", error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
      });
    }
  };
  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Three.js background animation
  useEffect(() => {
    if (!canvasRef.current || !threeContainerRef.current) return;

    const container = threeContainerRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Create sound wave effect
    const createSoundWave = (radius, segments, color) => {
      const geometry = new THREE.TorusGeometry(radius, 0.02, 16, segments);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7,
      });
      const wave = new THREE.Mesh(geometry, material);
      scene.add(wave);
      return wave;
    };

    const waves = [
      createSoundWave(1.5, 60, 0x4f46e5),
      createSoundWave(2.0, 180, 0x7c3aed),
      createSoundWave(2.5, 100, 0x8b5cf6),
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

      // Colors - purple to blue gradient
      colors[i] = 0.5 + Math.random() * 0.5; // R
      colors[i + 1] = 0.1 + Math.random() * 0.2; // G
      colors[i + 2] = 0.7 + Math.random() * 0.3; // B
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
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

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      scene.remove(particles);
      waves.forEach((wave) => scene.remove(wave));
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  // Loading text animation
  useEffect(() => {
    if (!isGenerating) return;

    const loadingTexts = [
      "Gathering inspiration...",
      "Creating characters...",
      "Designing plot twists...",
      "Crafting dialogue...",
      "Polishing narrative...",
      "Adding final touches...",
    ];

    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % loadingTexts.length;
      setLoadingText(loadingTexts[currentIndex]);
    }, 2500);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const generate_Voice = async () => {
    // setVoiceGeneration(true);
    // setVoiceProgress(0);
    // setAudioUrl(null);
    // setVoiceError(null);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        // setVoiceProgress((prev) => {
        //   const newProgress = prev + Math.random() * 10;
        //   return newProgress > 90 ? 90 : newProgress;
        // });
      }, 300);

      // Send the story to your TTS API
      const response = await fetch("http://localhost:8001/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: generatedTagged,
          // Add any additional voice parameters here
        }),
      });

      clearInterval(progressInterval);
      // setVoiceProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);
    } catch (error) {
      console.error("Error generating voice:", error);
      // setVoiceError("Failed to generate voice. Please try again.");
      // setVoiceGeneration(false);
    }
  };
  // Simulated story generation
  
  const generateStory = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedStory(null);
    setError(null);

    let apiCompleted = false;
    const startTime = Date.now();
    const minDuration = 3000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 150000);

    // Progress animation
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const baseProgress = Math.min((elapsed / minDuration) * 100, 90);

      setGenerationProgress((prev) => {
        const fluctuation = Math.random() * 10;
        return Math.min(prev + fluctuation, baseProgress);
      });

      if (apiCompleted && elapsed >= minDuration) {
        clearInterval(progressInterval);
        setGenerationProgress(100);
      }
    }, 300);

    try {
      const response = await fetch("http://localhost:8001/generate-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          genre: selectedGenre,
          length: selectedLength,
          context: storyContext,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      apiCompleted = true;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.story || typeof data.story !== "string") {
        throw new Error("Invalid response format");
      }

      const remainingTime = minDuration - (Date.now() - startTime);
      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      setGeneratedStory(data.story);
      setTaggedStory(data.tagged_story);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error:", error);

      if (error.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError("Failed to generate story. Using sample story instead.");
      }

      // Fallback to designer stories
      const stories = {
        fantasy: "...", // your sample story
        scifi: "...",
        mystery: "...",
      };
      setGeneratedStory(stories[selectedGenre]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-white text-gray-900 overflow-hidden">
      {/* Three.js Background Container */}
      <div ref={threeContainerRef} className="absolute inset-0 z-0">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>

      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrollY > 50
            ? "bg-white bg-opacity-90 backdrop-blur-md py-2 shadow-sm"
            : "py-4"
        }`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="relative w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg overflow-hidden flex items-center justify-center mr-2">
              <BookOpen size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              AI_MASTERS
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="hover:text-purple-600 transition-colors font-medium"
            >
              Features
            </a>
            <a
              href="#examples"
              className="hover:text-purple-600 transition-colors font-medium"
            >
              Examples
            </a>
            <a
              href="#pricing"
              className="hover:text-purple-600 transition-colors font-medium"
            >
              Pricing
            </a>
            <a
              href="#login"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-2 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl text-white font-medium"
            >
              Sign In
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-800"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden"
            >
              <div className="container mx-auto px-4 py-2 flex flex-col space-y-4 bg-white bg-opacity-95 backdrop-blur-md">
                <a
                  href="#features"
                  className="py-2 hover:text-purple-600 transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </a>
                <a
                  href="#examples"
                  className="py-2 hover:text-purple-600 transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Examples
                </a>
                <a
                  href="#pricing"
                  className="py-2 hover:text-purple-600 transition-colors font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </a>
                <a
                  href="#login"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-full transition-all text-center text-white font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Generator Section */}
          <section className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                  AI Story Generator
                </span>
              </h1>
              <p className="text-lg text-gray-700 mb-6">
                Create unique, captivating stories with advanced AI technology
              </p>
            </motion.div>

            {/* Story Generator Form */}
            {!isGenerating && !generatedStory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="bg-white rounded-xl shadow-lg p-6 md:p-8 backdrop-blur-md border border-gray-200"
              >
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Genre
                    </label>
                    <select
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={selectedGenre}
                      onChange={(e) => setSelectedGenre(e.target.value)}
                    >
                      <option value="fantasy">Fantasy</option>
                      <option value="scifi">Science Fiction</option>
                      <option value="mystery">Mystery/Thriller</option>
                      <option value="romance">Romance</option>
                      <option value="horror">Horror</option>
                      <option value="adventure">Adventure</option>
                      <option value="historical">Historical Fiction</option>
                      <option value="comedy">Comedy</option>
                      <option value="crime">Crime</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Length
                    </label>
                    <select
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={selectedLength}
                      onChange={(e) => setSelectedLength(e.target.value)}
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                </div>
                <div className="mb-6">
  <label className="block text-gray-700 font-medium mb-2">
    Story Context/Summary (Optional)
  </label>
  <textarea
    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[100px]"
    placeholder="E.g. 'A young mage discovers she's the last descendant of an ancient line of dragon riders...'"
    value={storyContext}
    onChange={(e) => setStoryContext(e.target.value)}
  />
  
  {/* Add this section for audio upload */}
  <div className="mt-4">
    <label className="block text-gray-700 font-medium mb-2">
      Or upload audio (MP3/WAV)
    </label>
    <div className="flex items-center gap-4">
      <label className="cursor-pointer">
        <div className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Choose Audio File
          <input 
            type="file" 
            className="hidden" 
            accept=".mp3,.wav"
            onChange={handleAudioUpload}
          />
        </div>
      </label>
      {isTranscribing && (
        <div className="flex items-center text-gray-600">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2"></div>
          Transcribing...
        </div>
      )}
    </div>
    <p className="text-sm text-gray-500 mt-1">
      Provide any details, themes, or ideas you'd like included in your story
    </p>
  </div>
</div>
                <div className="text-center">
                  <button
                    onClick={generateStory}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-white font-medium text-lg flex items-center justify-center mx-auto"
                  >
                    <Sparkles size={20} className="mr-2" />
                    Generate Story
                  </button>
                </div>
              </motion.div>
            )}

            {/* Loading/Generating Animation */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl shadow-lg p-8 backdrop-blur-md border border-gray-200 text-center"
              >
                <div className="flex justify-center mb-6">
                  <div className="relative w-24 h-24">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0 rounded-full border-4 border-purple-300 border-t-purple-600"
                    ></motion.div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles size={32} className="text-purple-600" />
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  {loadingText}
                </h3>

                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <motion.div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.5 }}
                  ></motion.div>
                </div>

                <p className="text-gray-600">
                  {Math.floor(generationProgress)}% complete
                </p>
              </motion.div>
            )}

            {/* Generated Story Display */}
            {!isGenerating && generatedStory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-xl shadow-lg p-6 md:p-8 backdrop-blur-md border border-gray-200"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Your Story
                  </h2>
                  <button
                    onClick={() => setGeneratedStory(null)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-gray-700 font-medium"
                  >
                    Create New
                  </button>
                </div>

                <div className="prose prose-lg max-w-none mb-6">
                  {editing ? (
                    <textarea
                      value={generatedStory}
                      onChange={(e) => setGeneratedStory(e.target.value)}
                      className="w-full h-64 p-4 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    generatedStory.split("\n\n").map((paragraph, index) => (
                      <p
                        key={index}
                        className="mb-4 text-gray-700 leading-relaxed"
                      >
                        {paragraph}
                      </p>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={downloadAsPDF}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg text-white font-medium"
                  >
                    <i className="fas fa-download mr-2"></i> Download
                  </button>
                  <button
                    onClick={copyStory}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg text-white font-medium"
                  >
                    <i className="fas fa-copy mr-2"></i> Copy Text
                  </button>
                  <button
                    onClick={shareStory}
                    className="px-6 py-2.5 bg-white border border-purple-500 hover:bg-purple-50 rounded-lg transition-all duration-300 text-purple-600 font-medium"
                  >
                    <i className="fas fa-share-alt mr-2"></i> Share
                  </button>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all duration-300 text-gray-700 font-medium"
                  >
                    <i className="fas fa-edit mr-2"></i>{" "}
                    {editing ? "Save" : "Edit"}
                  </button>
                  <button
                    onClick={() => generateVoice()}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg text-white font-medium"
                  >
                    <i className="fas fa-volume-up mr-2"></i> Generate Voice
                  </button>
                </div>
              </motion.div>
            )}
            {/* {isVoiceGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setVoiceGeneration(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      Generate Audio Story
                    </h3>
                    <button
                      onClick={() => setVoiceGeneration(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {!audioUrl ? (
                    <div className="text-center py-6">
                      <div className="flex justify-center mb-6">
                        <div className="relative w-20 h-20">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="absolute inset-0 rounded-full border-4 border-teal-300 border-t-teal-600"
                          ></motion.div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Headphones size={32} className="text-teal-600" />
                          </div>
                        </div>
                      </div>

                      <h4 className="text-lg font-medium mb-3">
                        {voiceProgress < 100
                          ? "Generating audio..."
                          : "Audio ready!"}
                      </h4>

                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <motion.div
                          className="bg-gradient-to-r from-teal-600 to-green-600 h-2.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${voiceProgress}%` }}
                          transition={{ duration: 0.5 }}
                        ></motion.div>
                      </div>

                      <p className="text-gray-600 mb-4">
                        {voiceProgress < 100
                          ? `${Math.floor(voiceProgress)}% complete`
                          : "Your audio story is ready to play"}
                      </p>

                      {voiceProgress < 100 ? (
                        <p className="text-sm text-gray-500">
                          This may take a few moments...
                        </p>
                      ) : (
                        <div className="mt-6">
                          <audio controls className="w-full">
                            <source src={audioUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                          <button
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = audioUrl;
                              link.download = "story-audio.mp3";
                              link.click();
                            }}
                            className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white w-full"
                          >
                            Download Audio
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {voiceError && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
                      {voiceError}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )} */}
          </section>

          {/* Features Section - Shown only when not generating/displaying story */}
          {!isGenerating && !generatedStory && (
            <section id="features" className="py-20 mt-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">
                  How StoryForge Works
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Our advanced AI understands narrative structure, character
                  development, and creative storytelling techniques
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <motion.div
                  whileHover={{
                    y: -10,
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
                  }}
                  className="bg-white rounded-xl p-6 shadow-md border border-gray-200"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles size={24} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    AI-Powered Creation
                  </h3>
                  <p className="text-gray-600">
                    Utilizes advanced neural networks trained on millions of
                    stories to generate unique, compelling narratives.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{
                    y: -10,
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
                  }}
                  className="bg-white rounded-xl p-6 shadow-md border border-gray-200"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <BookOpen size={24} className="text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Multiple Genres</h3>
                  <p className="text-gray-600">
                    Create fantasy epics, sci-fi adventures, mysteries,
                    romances, and more with genre-specific storytelling.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{
                    y: -10,
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
                  }}
                  className="bg-white rounded-xl p-6 shadow-md border border-gray-200"
                >
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                    <User size={24} className="text-pink-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    Character Development
                  </h3>
                  <p className="text-gray-600">
                    Creates detailed, believable characters with unique
                    personalities, motivations, and growth arcs.
                  </p>
                </motion.div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="relative w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg overflow-hidden flex items-center justify-center mr-2">
                <BookOpen size={24} className="text-white" />
              </div>
              <div className="text-xl font-bold">AI_MASTERS</div>
            </div>

            <div className="flex space-x-6">
              <a href="#" className="hover:text-purple-400 transition-colors">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="hover:text-purple-400 transition-colors">
                <i className="fab fa-facebook text-xl"></i>
              </a>
              <a href="#" className="hover:text-purple-400 transition-colors">
                <i className="fab fa-instagram text-xl"></i>
              </a>
              <a href="#" className="hover:text-purple-400 transition-colors">
                <i className="fab fa-github text-xl"></i>
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>© 2025 StoryForge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
