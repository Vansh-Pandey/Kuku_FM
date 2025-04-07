// SubtitlePlayer.jsx - Component for audio player with synchronized subtitles

import React, { useEffect, useState, useRef } from 'react';

// Backend API base URL (same as in AudioPage.jsx)
const API_URL = "http://localhost:8000";

const SubtitlePlayer = ({ audioUrl }) => {
  const [wordTimestamps, setWordTimestamps] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWords, setCurrentWords] = useState([]);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);
  const subtitleRef = useRef(null);
  const timerRef = useRef(null);
  const pollingRef = useRef(null);
  
  // Fetch word timestamps from backend with polling
  useEffect(() => {
    const fetchWordTimestamps = async () => {
      const maxAttempts = 60; // 60 seconds max wait (1 attempt per second)
      let attempts = 0;

      const poll = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`${API_URL}/word-timestamps/`);
          
          if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 404 && attempts < maxAttempts) {
              // If 404, keep polling unless max attempts reached
              attempts++;
              return false;
            }
            throw new Error(`Server returned ${response.status}: ${response.statusText} - ${errorText}`);
          }
          
          const data = await response.json();
          setWordTimestamps(data);
          prepareTimestamps(data);
          return true; // Success, stop polling
        } catch (err) {
          console.error('Error fetching word timestamps:', err);
          if (attempts >= maxAttempts) {
            setError(`Failed to load subtitles after ${maxAttempts} seconds: ${err.message}`);
            return true; // Stop polling on timeout
          }
          return false; // Continue polling
        }
      };

      // Start polling
      pollingRef.current = setInterval(async () => {
        const success = await poll();
        if (success) {
          clearInterval(pollingRef.current);
          setIsLoading(false);
        }
      }, 1000); // Poll every 1 second
    };

    if (audioUrl) {
      fetchWordTimestamps();
    }

    // Cleanup function
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [audioUrl]);
  
  // Prepare timestamps for easier lookup during playback
  const prepareTimestamps = (data) => {
    if (!data || !data.segments) return;
    
    const allWords = [];
    data.segments.forEach(segment => {
      if (segment.words && Array.isArray(segment.words)) {
        segment.words.forEach(word => {
          allWords.push({
            word: word.word,
            start: word.start,
            end: word.end
          });
        });
      }
    });
    
    allWords.sort((a, b) => a.start - b.start);
    data.preparedWords = allWords;
    setWordTimestamps(data);
  };
  
  // Handle audio time updates to sync subtitles
  const handleTimeUpdate = () => {
    if (!audioRef.current || !wordTimestamps || !wordTimestamps.preparedWords) return;
    
    const currentTime = audioRef.current.currentTime;
    updateVisibleWords(currentTime);
  };
  
  // Update which words should be visible based on current time
  const updateVisibleWords = (currentTime) => {
    if (!wordTimestamps || !wordTimestamps.preparedWords) return;
    
    const visibleWords = [];
    const lookAheadTime = 1; // Show words up to 1 second ahead
    
    wordTimestamps.preparedWords.forEach(word => {
      if (word.start <= currentTime && word.end >= currentTime - 3) {
        visibleWords.push(word);
      } else if (word.start > currentTime && word.start < currentTime + lookAheadTime) {
        visibleWords.push(word);
      }
    });
    
    setCurrentWords(visibleWords);
    
    if (subtitleRef.current && visibleWords.length > 0) {
      const activeLine = subtitleRef.current.querySelector('.active-word');
      if (activeLine) {
        activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };
  
  // Set up continuous monitoring of audio position
  useEffect(() => {
    if (audioRef.current && wordTimestamps) {
      audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        if (audioRef.current && !audioRef.current.paused) {
          updateVisibleWords(audioRef.current.currentTime);
        }
      }, 100);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [wordTimestamps]);
  
  // Determine if a word is currently active (being spoken)
  const isWordActive = (word) => {
    if (!audioRef.current) return false;
    const currentTime = audioRef.current.currentTime;
    return word.start <= currentTime && word.end >= currentTime;
  };
  
  return (
    <div className="subtitle-player-container">
      <div className="audio-player-wrapper">
        <audio 
          ref={audioRef} 
          controls 
          src={audioUrl} 
          className="audio-player"
        >
          Your browser does not support the audio element.
        </audio>
      </div>
      
      <div className="subtitle-container" ref={subtitleRef}>
        {isLoading ? (
          <div className="loading-subtitles">Loading subtitles (this may take a moment)...</div>
        ) : error ? (
          <div className="subtitle-error">{error}</div>
        ) : currentWords.length === 0 ? (
          <div className="no-subtitles">Play the audio to see subtitles</div>
        ) : (
          // In the return section of SubtitlePlayer.jsx, modify the rendering part:
<div className="subtitles-wrapper">
  {currentWords.map((word, index) => {
    // Calculate if we should add extra space before this word
    const addSpaceBefore = index > 0 && 
                         (word.start - currentWords[index-1].end) > 0.001; // Add space if gap > 0.3s
    
    return (
      <React.Fragment key={`${word.word}-${index}-${word.start}`}>
        {addSpaceBefore && <span className="word-space">&nbsp;</span>}
        <span 
          className={`subtitle-word ${isWordActive(word) ? 'active-word' : '  not-only:'}`}
        >
          {word.word}
        </span>
      </React.Fragment>
    );
  })}
</div>
        )}
      </div>
      
      <style jsx>{`
        .subtitle-player-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
        }
        
        .audio-player-wrapper {
          width: 100%;
          margin-bottom: 20px;
        }
        
        .audio-player {
          width: 100%;
        }
        
        .subtitle-container {
          min-height: 100px;
          max-height: 200px;
          overflow-y: auto;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 5px;
          font-size: 18px;
          line-height: 1.5;
          text-align: center;
        }
        
        .word-space {
        display: inline-block;
        width: 2px; /* Adjust this value to control space width */
        }

        .subtitle-word {
        display: inline-block;
        padding: 2px 0;
        margin-right: 10px; /* Small space between words */
        transition: all 0.2s ease;
        }
        
        .active-word {
          font-weight: bold;
          color: #0066cc;
          transform: scale(1.05);
        }
        
        .loading-subtitles, .subtitle-error, .no-subtitles {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100px;
          color: #666;
        }
        
        .subtitle-error {
          color: #cc0000;
        }
      `}</style>
    </div>
  );
};

export default SubtitlePlayer;