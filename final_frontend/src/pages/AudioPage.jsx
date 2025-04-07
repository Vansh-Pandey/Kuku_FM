import React, { useState, useEffect } from "react";
import axios from "axios";
import SubtitlePlayer from './SubPlayer'; // Adjust the import path as needed

// API base URL - can be changed to environment variable for production
const API_URL = "http://localhost:8000";

function AudioPage() {
  // Core state management
  const [parsedCharacters, setParsedCharacters] = useState([]);
  const [characterVoices, setCharacterVoices] = useState({});
  const [voiceFiles, setVoiceFiles] = useState({});
  const [status, setStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [storyFilename, setStoryFilename] = useState("");
  
  // UI state management
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Voice data
  const [defaultVoices, setDefaultVoices] = useState([]);
  const [voiceCategories, setVoiceCategories] = useState({});

  // Progress polling effect
  useEffect(() => {
    if (!isGenerating) return;
    
    const progressPollInterval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/generation-progress/`);
        setProgress(data.progress);
        setProgressStage(data.stage);

        if (data.progress >= 100 || !data.is_generating || data.stage.startsWith("Error")) {
          clearInterval(progressPollInterval);
          setIsGenerating(false);
        }
      } catch (err) {
        console.error("Error polling progress:", err);
      }
    }, 1000);

    return () => clearInterval(progressPollInterval);
  }, [isGenerating]);

  // Fetch default voices on component mount
  useEffect(() => {
    const fetchDefaultVoices = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/default-voices/`);
        setDefaultVoices(data.voices);

        // Group voices by category
        const categories = {};
        data.voices.forEach((voice) => {
          if (!categories[voice.category]) categories[voice.category] = [];
          categories[voice.category].push(voice);
        });
        
        setVoiceCategories(categories);
      } catch (error) {
        console.error("Error fetching default voices:", error);
        setStatus("Failed to load default voices");
      }
    };

    fetchDefaultVoices();
  }, []);

  // Auto-fetch the latest story on component mount
  useEffect(() => {
    const fetchLatestStory = async () => {
      setStatus("Loading latest story...");
      setIsLoading(true);
      setAudioUrl(null);

      try {
        const { data } = await axios.get(`${API_URL}/latest-story/`);
        
        if (data.error) {
          setStatus(`Error: ${data.error}`);
          return;
        }
        
        setStoryFilename(data.filename);
        setParsedCharacters(data.characters);
        
        // Initialize empty voice selection for each character
        const newCharacterVoices = {};
        data.characters.forEach(character => newCharacterVoices[character] = "");
        setCharacterVoices(newCharacterVoices);
        
        setStatus(`Loaded "${data.filename}" with ${data.characters.length} characters.`);
      } catch (error) {
        console.error("Error fetching latest story:", error);
        setStatus(`Error loading story: ${error.response?.data?.detail || error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestStory();
  }, []);

  // Handle voice file upload for a character
  const handleVoiceFileChange = async (character, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus(`Uploading voice for ${character}...`);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await axios.post(`${API_URL}/upload-voice/`, formData);
      const uploadedFilename = data.filename;
      
      if (!uploadedFilename) throw new Error("Backend did not return a filename");

      setVoiceFiles(prev => ({ ...prev, [character]: file }));
      setCharacterVoices(prev => ({ ...prev, [character]: `uploaded:${uploadedFilename}` }));
      setStatus(`Voice for ${character} uploaded successfully.`);
    } catch (error) {
      console.error("Error uploading voice:", error);
      setStatus(`Error uploading voice: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new custom character
  const handleAddCharacter = () => {
    let newName = "Character";
    let counter = 1;

    while (parsedCharacters.includes(`${newName} ${counter}`)) {
      counter++;
    }

    const newCharacter = `${newName} ${counter}`;
    setParsedCharacters(prev => [...prev, newCharacter]);
    setCharacterVoices(prev => ({ ...prev, [newCharacter]: "" }));
  };

  // Remove a character
  const handleRemoveCharacter = (character) => {
    if (parsedCharacters.length <= 1) {
      setStatus("You need at least one character.");
      return;
    }

    setParsedCharacters(prev => prev.filter(char => char !== character));
    
    // Create new objects without the removed character
    const newCharacterVoices = { ...characterVoices };
    delete newCharacterVoices[character];
    setCharacterVoices(newCharacterVoices);

    const newVoiceFiles = { ...voiceFiles };
    delete newVoiceFiles[character];
    setVoiceFiles(newVoiceFiles);
  };

  // Generate the audiobook
  const handleSubmit = async () => {
    // Check if all characters have voices assigned
    const invalidCharacters = Object.entries(characterVoices)
      .filter(([_, voice]) => !voice)
      .map(([character, _]) => character);

    if (invalidCharacters.length > 0) {
      setStatus(`Please select or upload a voice for: ${invalidCharacters.join(", ")}`);
      return;
    }

    // Start generation process
    setStatus("Generating audio...");
    setIsLoading(true);
    setAudioUrl(null);
    setProgress(0);
    setProgressStage("Starting generation process");
    setIsGenerating(true);

    const formData = new FormData();
    
    // Create a blank file representation for input_file
    const emptyBlob = new Blob([''], { type: 'text/plain' });
    const dummyFile = new File([emptyBlob], 'input.txt', { type: 'text/plain' });
    formData.append("input_file", dummyFile);

    // Process voice paths for the API
    const processedVoices = {};
    Object.entries(characterVoices).forEach(([character, voice]) => {
      if (voice.startsWith("default:")) {
        processedVoices[character] = `default_voices/${voice.replace("default:", "")}`;
      } else if (voice.startsWith("uploaded:")) {
        processedVoices[character] = voice;
      }
    });

    formData.append("character_voices", JSON.stringify(processedVoices));

    try {
      const res = await axios.post(`${API_URL}/generate-audio/`, formData, {
        responseType: "blob",
      });

      setProgress(100);
      setProgressStage("Complete!");
      const url = window.URL.createObjectURL(new Blob([res.data]));
      setAudioUrl(url);
      setStatus("Audio generated successfully!");
    } catch (error) {
      console.error("Error generating audio:", error);
      handleGenerationError(error);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Helper to handle generation errors
  const handleGenerationError = (error) => {
    let errorMessage = "Error generating audio";
    
    if (error.response) {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            setStatus(`Error: ${errorData.detail || errorMessage}`);
          } catch (e) {
            setStatus(`${errorMessage}: ${reader.result}`);
          }
        };
        reader.readAsText(error.response.data);
      } catch (e) {
        setStatus(`${errorMessage}: ${error.response.statusText}`);
      }
    } else {
      setStatus(`${errorMessage}: ${error.message}`);
    }
  };

  // Characters without assigned voices
  const remainingCharacters = Object.entries(characterVoices)
    .filter(([_, voice]) => !voice)
    .map(([character]) => character);

  // Component rendering
  return (
    <div className="app-container" style={styles.container}>
      <h1 style={styles.title}>Audiobook Generator</h1>

      {/* Story info section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Current Story</h3>
        {storyFilename ? (
          <div style={styles.fileInfo}>
            <p>
              <strong>Story:</strong> {storyFilename}
            </p>
            <p>
              <strong>Characters:</strong> {parsedCharacters.length > 0 
                ? parsedCharacters.join(", ") 
                : "No characters found"
              }
            </p>
          </div>
        ) : (
          <div style={styles.loadingMessage}>
            {isLoading ? "Loading story..." : "No story loaded."}
          </div>
        )}
      </div>

      {/* Character voices section */}
      {parsedCharacters.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Character Voices</h3>
          <p>Assign a voice to each character in your story:</p>

          {parsedCharacters.map((character) => (
            <CharacterVoiceSelector
              key={character}
              character={character}
              characterVoices={characterVoices}
              setCharacterVoices={setCharacterVoices}
              voiceFiles={voiceFiles}
              voiceCategories={voiceCategories}
              handleVoiceFileChange={handleVoiceFileChange}
              handleRemoveCharacter={handleRemoveCharacter}
              isLoading={isLoading}
              isGenerating={isGenerating}
            />
          ))}

          <button
            onClick={handleAddCharacter}
            style={{
              ...styles.button,
              backgroundColor: "#4CAF50",
              opacity: isLoading || isGenerating ? 0.7 : 1,
            }}
            disabled={isLoading || isGenerating}
          >
            Add Custom Character
          </button>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleSubmit}
        disabled={
          isLoading ||
          isGenerating ||
          parsedCharacters.length === 0 ||
          remainingCharacters.length > 0
        }
        style={{
          ...styles.button,
          ...styles.generateButton,
          opacity:
            isLoading ||
            isGenerating ||
            parsedCharacters.length === 0 ||
            remainingCharacters.length > 0
              ? 0.7
              : 1,
          cursor:
            isLoading ||
            isGenerating ||
            parsedCharacters.length === 0 ||
            remainingCharacters.length > 0
              ? "not-allowed"
              : "pointer",
        }}
      >
        {isGenerating ? "Generating..." : "Generate Audiobook"}
      </button>

      {/* Progress bar */}
      {(isLoading || isGenerating) && (
        <ProgressBar progress={progress} progressStage={progressStage} />
      )}

      {/* Status and result section */}
      <div style={{ marginTop: "25px" }}>
        {status && (
          <p style={{
            ...styles.status,
            backgroundColor: status.startsWith("Error")
              ? "#ffebee"
              : status.startsWith("Audio generated")
              ? "#e8f5e9"
              : "#e3f2fd",
            color: status.startsWith("Error")
              ? "#c62828"
              : status.startsWith("Audio generated")
              ? "#2e7d32"
              : "#1565c0",
          }}>
            {status}
          </p>
        )}

        {/* Audio player */}
        {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
      </div>
    </div>
  );
}

// Component for character voice selection
const CharacterVoiceSelector = ({
  character,
  characterVoices,
  setCharacterVoices,
  voiceFiles,
  voiceCategories,
  handleVoiceFileChange,
  handleRemoveCharacter,
  isLoading,
  isGenerating
}) => {
  const hasVoice = Boolean(characterVoices[character]);
  const isUploadedVoice = characterVoices[character]?.startsWith("uploaded:");
  const isDefaultVoice = !isUploadedVoice && hasVoice;
  
  // Reference to the file input element
  const fileInputRef = React.useRef(null);
  
  // Function to handle the "Upload Voice" tab click
  const handleUploadTabClick = () => {
    if (!isUploadedVoice) {
      setCharacterVoices(prev => ({ ...prev, [character]: "" }));
      
      // Automatically trigger the file input dialog after switching to the upload tab
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 100);
    }
  };
  
  return (
    <div style={{
      ...styles.characterCard,
      backgroundColor: hasVoice ? "#f0f8ff" : "#fffaf0",
      border: hasVoice ? "1px solid #b3d7ff" : "1px solid #ffeeba",
    }}>
      <div style={styles.characterHeader}>
        <label style={styles.characterName}>{character}</label>
        <button
          onClick={() => handleRemoveCharacter(character)}
          style={styles.removeButton}
          disabled={isLoading || isGenerating}
        >
          Remove
        </button>
      </div>

      <div style={styles.voiceOptions}>
        <div style={styles.tabButtons}>
          <button
            onClick={() => setCharacterVoices(prev => ({ ...prev, [character]: "" }))}
            style={{
              ...styles.tabButton,
              backgroundColor: (isDefaultVoice || !hasVoice) ? "#f5f5f5" : "white",
              borderBottom: (isDefaultVoice || !hasVoice) ? "none" : "1px solid #ddd",
            }}
            disabled={isLoading || isGenerating}
          >
            Default Voices
          </button>
          <button
            onClick={handleUploadTabClick}
            style={{
              ...styles.tabButton,
              backgroundColor: isUploadedVoice ? "#f5f5f5" : "white",
              borderBottom: isUploadedVoice ? "none" : "1px solid #ddd",
            }}
            disabled={isLoading || isGenerating}
          >
            Upload Voice
          </button>
        </div>

        {/* Default voice selector */}
        {(!hasVoice || isDefaultVoice) && (
          <div style={styles.tabContent}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px" }}>
                Select a default voice:
              </label>
              <select
                value={characterVoices[character]?.replace("default:", "") || ""}
                onChange={(e) => {
                  const selectedVoice = e.target.value;
                  setCharacterVoices(prev => ({
                    ...prev,
                    [character]: selectedVoice ? `default:${selectedVoice}` : "",
                  }));
                }}
                style={styles.select}
                disabled={isLoading || isGenerating}
              >
                <option value="">-- Select a voice --</option>
                {Object.keys(voiceCategories).map((category) => (
                  <optgroup key={category} label={category}>
                    {voiceCategories[category].map((voice) => (
                      <option key={voice.filename} value={voice.filename}>
                        {voice.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Voice preview */}
            {isDefaultVoice && (
              <div style={styles.audioPreview}>
                <audio
                  controls
                  style={{ height: "30px", width: "100%" }}
                  src={`${API_URL}/voices/preview/${encodeURIComponent(
                    characterVoices[character].replace("default:", "")
                  )}`}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        )}

        {/* Voice upload option */}
        {(isUploadedVoice || !hasVoice || isDefaultVoice) && (
          <div style={isUploadedVoice ? styles.tabContent : { display: 'none' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3"
              onChange={(e) => handleVoiceFileChange(character, e)}
              style={isUploadedVoice ? styles.fileInput : { display: 'none' }}
              disabled={isLoading || isGenerating}
            />

            {voiceFiles[character] && (
              <div style={styles.uploadedFile}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span><strong>{voiceFiles[character].name}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Progress bar component
const ProgressBar = ({ progress, progressStage }) => (
  <div style={styles.progressContainer}>
    <p style={styles.progressStage}>{progressStage}</p>
    <div style={styles.progressBarContainer}>
      <div 
        style={{
          ...styles.progressBar,
          width: `${progress}%`,
        }}
      ></div>
      <div style={styles.progressText}>{progress}%</div>
    </div>
  </div>
);

// Audio player component
const AudioPlayer = ({ audioUrl }) => {
  return (
    <div style={styles.audioPlayerContainer}>
      <h3 style={styles.audioTitle}>Your Audiobook</h3>
      <SubtitlePlayer audioUrl={audioUrl} />
      <a href={audioUrl} download="audiobook.mp3" style={styles.downloadButton}>
        Download Audiobook
      </a>
    </div>
  );
};

// Styles
const styles = {
  container: {
    padding: "20px",
    maxWidth: "800px",
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    textAlign: "center",
    color: "#333",
  },
  section: {
    marginBottom: "20px",
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    marginBottom: "15px",
    color: "#333",
  },
  label: {
    display: "block",
    marginBottom: "10px",
    fontWeight: "bold",
    fontSize: "16px",
  },
  fileInput: {
    padding: "8px",
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  fileInfo: {
    backgroundColor: "#f8f9fa",
    padding: "12px",
    borderRadius: "4px",
    border: "1px solid #e3f2fd",
  },
  loadingMessage: {
    padding: "12px",
    borderRadius: "4px",
    backgroundColor: "#f5f5f5",
    textAlign: "center",
    fontStyle: "italic",
  },
  button: {
    marginTop: "15px",
    padding: "10px 16px",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  generateButton: {
    display: "block",
    width: "100%",
    padding: "15px 24px",
    backgroundColor: "#007BFF",
    fontSize: "16px",
    fontWeight: "bold",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    transition: "all 0.3s ease",
  },
  characterCard: {
    margin: "15px 0",
    padding: "15px",
    borderRadius: "6px",
  },
  characterHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  characterName: {
    fontWeight: "bold",
    fontSize: "16px",
  },
  removeButton: {
    padding: "5px 10px",
    backgroundColor: "#ff6b6b",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  voiceOptions: {
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  tabButtons: {
    display: "flex",
    borderBottom: "1px solid #ddd",
  },
  tabButton: {
    padding: "8px 16px",
    border: "1px solid #ddd",
    borderTopLeftRadius: "4px",
    borderTopRightRadius: "4px",
    marginRight: "4px",
    cursor: "pointer",
  },
  tabContent: {
    padding: "15px",
    border: "1px solid #ddd",
    borderTop: "none",
    borderRadius: "0 0 4px 4px",
  },
  select: {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ddd",
  },
  audioPreview: {
    backgroundColor: "#f5f5f5",
    padding: "10px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
  },
  uploadedFile: {
    marginTop: "10px",
    backgroundColor: "#e8f5e9",
    padding: "8px 12px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  progressContainer: {
    marginTop: "25px",
    padding: "15px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
  },
  progressStage: {
    fontWeight: "bold",
    textAlign: "center",
    fontSize: "16px",
    marginBottom: "10px",
    color: "#333",
  },
  progressBarContainer: {
    width: "100%",
    height: "24px",
    backgroundColor: "#e0e0e0",
    borderRadius: "12px",
    overflow: "hidden",
    position: "relative",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: "12px",
    transition: "width 0.5s ease-in-out",
  },
  progressText: {
    position: "absolute",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    transition: "color 0.3s ease",
  },
  status: {
    padding: "10px",
    borderRadius: "5px",
    fontWeight: "bold",
  },
  audioPlayerContainer: {
    marginTop: "25px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#f5f5f5",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  audioTitle: {
    textAlign: "center",
    marginBottom: "15px",
    color: "#333",
  },
  audioPlayer: {
    width: "100%",
    marginTop: "10px",
    borderRadius: "8px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
  downloadButton: {
    display: "block",
    width: "100%",
    textAlign: "center",
    marginTop: "20px",
    padding: "12px 20px",
    backgroundColor: "#28a745",
    color: "white",
    textDecoration: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  },
};

export default AudioPage;