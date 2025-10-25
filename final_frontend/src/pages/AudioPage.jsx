import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import SubtitlePlayer from "./SubPlayer"; // Adjust the import path as needed
import { Mic, Headphones } from "lucide-react";

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
  const [displayProgress, setDisplayProgress] = useState(0); // For smooth animation
  const [progressStage, setProgressStage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastProgressUpdate, setLastProgressUpdate] = useState(Date.now()); // Track last update time

  // Voice data
  const [defaultVoices, setDefaultVoices] = useState([]);
  const [voiceCategories, setVoiceCategories] = useState({});

  // Smooth progress animation with fallback
  useEffect(() => {
    if (!isGenerating) return;

    const animateProgress = () => {
      setDisplayProgress((prev) => {
        if (prev < progress) {
          return Math.min(prev + 0.5, progress); // Smooth increment
        }
        // Fallback: if stuck for 30 seconds, simulate progress up to 75%
        const now = Date.now();
        if (
          progress === prev &&
          now - lastProgressUpdate > 30000 &&
          prev < 75
        ) {
          return Math.min(prev + 0.2, 75); // Slow incremental fallback
        }
        return prev;
      });
    };

    const interval = setInterval(animateProgress, 50); // Update every 50ms
    return () => clearInterval(interval);
  }, [isGenerating, progress, lastProgressUpdate]);

  // Progress polling effect
  useEffect(() => {
    if (!isGenerating) return;

    const progressPollInterval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/generation-progress/`);
        setProgress(data.progress);
        setProgressStage(data.stage);
        setLastProgressUpdate(Date.now()); // Update last progress time

        if (
          data.progress >= 100 ||
          !data.is_generating ||
          data.stage.startsWith("Error")
        ) {
          clearInterval(progressPollInterval);
          setIsGenerating(false);
          setDisplayProgress(100); // Ensure display reaches 100%
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
        data.characters.forEach(
          (character) => (newCharacterVoices[character] = "")
        );
        setCharacterVoices(newCharacterVoices);

        setStatus(
          `Loaded "${data.filename}" with ${data.characters.length} characters.`
        );
      } catch (error) {
        console.error("Error fetching latest story:", error);
        setStatus(
          `Error loading story: ${
            error.response?.data?.detail || error.message
          }`
        );
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

      if (!uploadedFilename)
        throw new Error("Backend did not return a filename");

      setVoiceFiles((prev) => ({ ...prev, [character]: file }));
      setCharacterVoices((prev) => ({
        ...prev,
        [character]: `uploaded:${uploadedFilename}`,
      }));
      setStatus(`Voice for ${character} uploaded successfully.`);
    } catch (error) {
      console.error("Error uploading voice:", error);
      setStatus(
        `Error uploading voice: ${
          error.response?.data?.detail || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Generate the audiobook
  const handleSubmit = async () => {
    // Check if all characters have voices assigned
    const invalidCharacters = Object.entries(characterVoices)
      .filter(([_, voice]) => !voice)
      .map(([character, _]) => character);

    if (invalidCharacters.length > 0) {
      setStatus(
        `Please select or upload a voice for: ${invalidCharacters.join(", ")}`
      );
      return;
    }

    // Start generation process
    setStatus("Generating audio...");
    setIsLoading(true);
    setAudioUrl(null);
    setProgress(0);
    setDisplayProgress(0);
    setProgressStage("Starting generation process");
    setIsGenerating(true);

    const formData = new FormData();

    // Create a blank file representation for input_file
    const emptyBlob = new Blob([""], { type: "text/plain" });
    const dummyFile = new File([emptyBlob], "input.txt", {
      type: "text/plain",
    });
    formData.append("input_file", dummyFile);

    // Process voice paths for the API
    const processedVoices = {};
    Object.entries(characterVoices).forEach(([character, voice]) => {
      if (voice.startsWith("default:")) {
        processedVoices[character] = `default_voices/${voice.replace(
          "default:",
          ""
        )}`;
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
      setDisplayProgress(100);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-100 to-blue-50 text-gray-800 relative overflow-hidden">
      <div className="container mx-auto px-4 py-6 max-w-3xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-center mb-5">
          <div className="relative w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg overflow-hidden flex items-center justify-center mr-2">
            <Headphones size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            Audiobook Generator
          </h1>
        </div>

        {/* Story Info Section */}
        <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-xl p-5 mb-5 border border-purple-200 shadow-md">
          <h3 className="text-xl font-bold mb-3 text-gray-800">
            Current Story
          </h3>
          {storyFilename ? (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <p className="text-base mb-1">
                <strong className="text-purple-700">Story:</strong>{" "}
                {storyFilename}
              </p>
              <p className="text-base">
                <strong className="text-purple-700">Characters:</strong>{" "}
                {parsedCharacters.length > 0
                  ? parsedCharacters.join(", ")
                  : "No characters found"}
              </p>
            </div>
          ) : (
            <div className="text-center text-base text-gray-600 italic p-3 bg-gray-50 rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="orbit-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="ml-2">Loading story...</span>
                </div>
              ) : (
                "No story loaded."
              )}
            </div>
          )}
        </div>

        {/* Character Voices Section */}
        {parsedCharacters.length > 0 && (
          <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-xl p-5 mb-5 border border-purple-200 shadow-md">
            <h3 className="text-xl font-bold mb-3 text-gray-800">
              Character Voices
            </h3>
            <p className="text-base text-gray-600 mb-3">
              Assign a voice to each character:
            </p>
            {parsedCharacters.map((character) => (
              <CharacterVoiceSelector
                key={character}
                character={character}
                characterVoices={characterVoices}
                setCharacterVoices={setCharacterVoices}
                voiceFiles={voiceFiles}
                voiceCategories={voiceCategories}
                handleVoiceFileChange={handleVoiceFileChange}
                isLoading={isLoading}
                isGenerating={isGenerating}
              />
            ))}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleSubmit}
          disabled={
            isLoading ||
            isGenerating ||
            parsedCharacters.length === 0 ||
            remainingCharacters.length > 0
          }
          className={`w-full px-6 py-3 rounded-xl transition-all duration-300 shadow-md text-lg font-medium text-white ${
            isLoading ||
            isGenerating ||
            parsedCharacters.length === 0 ||
            remainingCharacters.length > 0
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 hover:shadow-lg"
          }`}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <div className="orbit-animation">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="ml-2">Generating...</span>
            </div>
          ) : (
            "Generate Audiobook"
          )}
        </button>

        {/* Progress Bar */}
        {(isLoading || isGenerating) && (
          <ProgressBar
            progress={displayProgress}
            progressStage={progressStage}
          />
        )}

        {/* Status and Result Section */}
        <div className="mt-5">
          {status && (
            <p
              className={`p-3 rounded-xl font-medium text-base ${
                status.startsWith("Error")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : status.startsWith("Audio generated")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {status}
            </p>
          )}

          {/* Audio Player */}
          {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
        </div>
      </div>

      {/* Inline CSS for Loading Animation */}
      <style jsx>{`
        .soundwave-animation {
          position: relative;
          width: 40px;
          height: 20px;
          display: inline-block;
        }
        .soundwave-animation span {
          position: absolute;
          bottom: 0;
          width: 4px;
          background: linear-gradient(to top, #4f46e5, #9333ea);
          animation: soundwave 1.5s infinite ease-in-out;
          transform-origin: bottom;
        }
        .soundwave-animation span:nth-child(1) {
          left: 0;
          height: 10px;
          animation-delay: 0s;
        }
        .soundwave-animation span:nth-child(2) {
          left: 10px;
          height: 15px;
          animation-delay: 0.2s;
        }
        .soundwave-animation span:nth-child(3) {
          left: 20px;
          height: 12px;
          animation-delay: 0.4s;
        }
        .soundwave-animation span:nth-child(4) {
          left: 30px;
          height: 18px;
          animation-delay: 0.6s;
        }
        @keyframes soundwave {
          0%,
          100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(2.5);
          }
        }
      `}</style>
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
  isLoading,
  isGenerating,
}) => {
  const hasVoice = Boolean(characterVoices[character]);
  const isUploadedVoice = characterVoices[character]?.startsWith("uploaded:");
  const isDefaultVoice = !isUploadedVoice && hasVoice;

  // Reference to the file input element
  const fileInputRef = useRef(null);

  // Function to handle the "Upload Voice" tab click
  const handleUploadTabClick = () => {
    if (!isUploadedVoice) {
      setCharacterVoices((prev) => ({ ...prev, [character]: "" }));

      // Automatically trigger the file input dialog after switching to the upload tab
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 100);
    }
  };

  return (
    <div
      className={`mb-3 p-3 rounded-lg border transition-all duration-300 ${
        hasVoice ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"
      }`}
    >
      <div className="flex items-center mb-2">
        <Mic size={18} className="text-purple-600 mr-2" />
        <label className="text-lg font-semibold text-gray-800">
          {character}
        </label>
      </div>

      <div className="mt-1">
        <div className="flex border-b border-gray-200 mb-2">
          <button
            onClick={() =>
              setCharacterVoices((prev) => ({ ...prev, [character]: "" }))
            }
            className={`px-2 py-1 font-medium text-gray-700 rounded-t-lg transition-all duration-300 text-sm ${
              isDefaultVoice || !hasVoice
                ? "bg-white border-b-2 border-purple-600"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            disabled={isLoading || isGenerating}
          >
            Default Voices
          </button>
          <button
            onClick={handleUploadTabClick}
            className={`px-2 py-1 font-medium text-gray-700 rounded-t-lg transition-all duration-300 text-sm ${
              isUploadedVoice
                ? "bg-white border-b-2 border-purple-600"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            disabled={isLoading || isGenerating}
          >
            Upload Voice
          </button>
        </div>

        {/* Default Voice Selector */}
        {(!hasVoice || isDefaultVoice) && (
          <div className="p-2 bg-white rounded-b-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select a default voice:
            </label>
            <select
              value={characterVoices[character]?.replace("default:", "") || ""}
              onChange={(e) => {
                const selectedVoice = e.target.value;
                setCharacterVoices((prev) => ({
                  ...prev,
                  [character]: selectedVoice ? `default:${selectedVoice}` : "",
                }));
              }}
              className="w-full px-2 py-1 rounded-lg bg-white border border-gray-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all text-base"
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

            {/* Voice Preview */}
            {isDefaultVoice && (
              <div className="mt-2 bg-gray-50 p-2 rounded-lg">
                <audio
                  controls
                  className="w-full"
                  style={{ height: "32px" }}
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

        {/* Voice Upload Option */}
        {(isUploadedVoice || !hasVoice || isDefaultVoice) && (
          <div
            className={
              isUploadedVoice
                ? "p-2 bg-white rounded-b-lg border border-gray-200"
                : "hidden"
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3"
              onChange={(e) => handleVoiceFileChange(character, e)}
              className={
                isUploadedVoice
                  ? "block w-full text-base text-gray-700"
                  : "hidden"
              }
              disabled={isLoading || isGenerating}
            />

            {voiceFiles[character] && (
              <div className="mt-2 bg-green-50 p-2 rounded-lg flex items-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 10"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="mr-1"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span className="text-base text-green-700">
                  <strong>{voiceFiles[character].name}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ progress, progressStage }) => (
  <div className="mt-5 p-3 bg-white bg-opacity-90 backdrop-blur-md rounded-xl border border-purple-200 shadow-md">
    <p className="text-base font-semibold text-gray-800 text-center mb-2">
      {progressStage}
    </p>
    <div className="relative w-full h-5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      ></div>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {Math.round(progress)}%
      </div>
    </div>
  </div>
);

// Audio Player Component
const AudioPlayer = ({ audioUrl }) => (
  <div className="mt-5 p-5 bg-white bg-opacity-90 backdrop-blur-md rounded-xl border border-purple-200 shadow-md">
    <h3 className="text-xl font-bold text-gray-800 text-center mb-3">
      Your Audiobook
    </h3>
    <SubtitlePlayer audioUrl={audioUrl} />
    <a
      href={audioUrl}
      download="audiobook.mp3"
      className="block w-full text-center mt-3 px-5 py-2 bg-gradient-to-r from-green-600 to-teal-500 hover:from-green-700 hover:to-teal-600 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg font-medium text-base text-white"
    >
      Download Audiobook
    </a>
  </div>
);

export default AudioPage;
