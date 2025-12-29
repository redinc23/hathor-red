/**
 * Emotional Thermostat Component
 *
 * A visual component that displays and allows users to adjust their emotional state
 * to get music recommendations that match or help shift their mood.
 */

import React, { useState, useEffect } from 'react';
import { detectMood, createEmotionalJourney, getPredictivePlaylist } from '../services/aiService';
import './EmotionalThermostat.css';

const EmotionalThermostat = ({ onPlaylistGenerated }) => {
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [targetEmotion, setTargetEmotion] = useState('neutral');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [loading, setLoading] = useState(false);
  const [showJourney, setShowJourney] = useState(false);

  const emotions = [
    { value: 'calm', label: 'Calm', color: '#3498db', icon: '😌' },
    { value: 'happy', label: 'Happy', color: '#f39c12', icon: '😊' },
    { value: 'energized', label: 'Energized', color: '#e74c3c', icon: '⚡' },
    { value: 'focused', label: 'Focused', color: '#9b59b6', icon: '🎯' },
    { value: 'relaxed', label: 'Relaxed', color: '#1abc9c', icon: '😴' },
    { value: 'motivated', label: 'Motivated', color: '#e67e22', icon: '💪' },
    { value: 'neutral', label: 'Neutral', color: '#95a5a6', icon: '😐' }
  ];

  useEffect(() => {
    // Auto-detect mood on mount
    detectCurrentMood();
  }, []);

  const detectCurrentMood = async () => {
    setLoading(true);
    try {
      const result = await detectMood('auto-detect', {
        timeOfDay: new Date().getHours()
      });
      
      if (result.mood) {
        setCurrentEmotion(result.mood);
        setEnergyLevel(result.energy || 5);
      }
    } catch (error) {
      console.error('Failed to detect mood:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmotionSelect = (emotion) => {
    setTargetEmotion(emotion);
  };

  const handleEnergyChange = (e) => {
    setEnergyLevel(parseInt(e.target.value));
  };

  const generatePlaylistForMood = async () => {
    if (!targetEmotion) return;

    setLoading(true);
    try {
      const result = await getPredictivePlaylist({
        mood: targetEmotion,
        energy: energyLevel,
        activity: 'listening'
      });

      if (onPlaylistGenerated) {
        onPlaylistGenerated(result);
      }
    } catch (error) {
      console.error('Failed to generate playlist:', error);
      alert('Failed to generate playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEmotionalJourney = async () => {
    if (!targetEmotion || targetEmotion === currentEmotion) {
      alert('Please select a different target emotion');
      return;
    }

    setLoading(true);
    try {
      const result = await createEmotionalJourney(targetEmotion);
      setShowJourney(true);
      
      if (onPlaylistGenerated) {
        onPlaylistGenerated(result);
      }
    } catch (error) {
      console.error('Failed to create emotional journey:', error);
      alert('Failed to create emotional journey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentEmotionData = () => {
    return emotions.find(e => e.value === currentEmotion) || emotions[emotions.length - 1];
  };

  const getTargetEmotionData = () => {
    return emotions.find(e => e.value === targetEmotion) || emotions[emotions.length - 1];
  };

  const currentEmotionData = getCurrentEmotionData();
  const targetEmotionData = getTargetEmotionData();

  return (
    <div className="emotional-thermostat">
      <div className="thermostat-header">
        <h2>Emotional Thermostat</h2>
        <p>Adjust your mood and let music guide your journey</p>
      </div>

      <div className="thermostat-body">
        {/* Current State */}
        <div className="emotion-section">
          <h3>Current Mood</h3>
          <div 
            className="emotion-display current"
            style={{ borderColor: currentEmotionData.color }}
          >
            <span className="emotion-icon">{currentEmotionData.icon}</span>
            <span className="emotion-label">{currentEmotionData.label}</span>
          </div>
          <button 
            className="btn-secondary"
            onClick={detectCurrentMood}
            disabled={loading}
          >
            Detect My Mood
          </button>
        </div>

        {/* Energy Level Slider */}
        <div className="energy-section">
          <h3>Energy Level: {energyLevel}/10</h3>
          <input
            type="range"
            min="1"
            max="10"
            value={energyLevel}
            onChange={handleEnergyChange}
            className="energy-slider"
            style={{
              background: `linear-gradient(to right, #3498db 0%, ${targetEmotionData.color} ${energyLevel * 10}%, #ddd ${energyLevel * 10}%, #ddd 100%)`
            }}
          />
          <div className="energy-labels">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Target State */}
        <div className="emotion-section">
          <h3>Target Mood</h3>
          <div className="emotion-grid">
            {emotions.map(emotion => (
              <button
                key={emotion.value}
                className={`emotion-button ${targetEmotion === emotion.value ? 'selected' : ''}`}
                style={{
                  borderColor: emotion.color,
                  backgroundColor: targetEmotion === emotion.value ? emotion.color : 'transparent',
                  color: targetEmotion === emotion.value ? '#fff' : emotion.color
                }}
                onClick={() => handleEmotionSelect(emotion.value)}
              >
                <span className="emotion-icon">{emotion.icon}</span>
                <span className="emotion-label">{emotion.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="thermostat-actions">
          <button
            className="btn-primary"
            onClick={generatePlaylistForMood}
            disabled={loading || !targetEmotion}
          >
            {loading ? 'Generating...' : 'Generate Playlist'}
          </button>

          {currentEmotion !== targetEmotion && (
            <button
              className="btn-journey"
              onClick={startEmotionalJourney}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Start Emotional Journey'}
            </button>
          )}
        </div>

        {/* Journey Visualization */}
        {showJourney && currentEmotion !== targetEmotion && (
          <div className="journey-visualization">
            <h3>Your Emotional Journey</h3>
            <div className="journey-path">
              <div className="journey-step current-step">
                <span className="step-icon">{currentEmotionData.icon}</span>
                <span className="step-label">{currentEmotionData.label}</span>
              </div>
              <div className="journey-arrow">→</div>
              <div className="journey-step intermediate-step">
                <span className="step-icon">🎵</span>
                <span className="step-label">Transition</span>
              </div>
              <div className="journey-arrow">→</div>
              <div className="journey-step target-step">
                <span className="step-icon">{targetEmotionData.icon}</span>
                <span className="step-label">{targetEmotionData.label}</span>
              </div>
            </div>
            <p className="journey-description">
              Music will guide you from {currentEmotionData.label.toLowerCase()} to {targetEmotionData.label.toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmotionalThermostat;
