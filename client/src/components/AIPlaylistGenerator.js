import React, { useState } from 'react';
import { musicService } from '../services/music';
import './AIPlaylistGenerator.css';

const AIPlaylistGenerator = ({ onPlaylistCreated }) => {
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await musicService.generateAIPlaylist(prompt, name);
      setSuccess(`Created playlist "${data.playlist.name}" with ${data.songs.length} songs!`);
      setPrompt('');
      setName('');
      if (onPlaylistCreated) {
        onPlaylistCreated(data.playlist);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate playlist');
    } finally {
      setLoading(false);
    }
  };

  const examplePrompts = [
    'Upbeat workout songs with high energy',
    'Chill relaxing music for studying',
    'Party dance tracks for the weekend',
    'Emotional acoustic songs for reflection',
  ];

  return (
    <div className="ai-generator-container">
      <h2>🤖 AI Playlist Generator</h2>
      <p className="subtitle">Describe your mood or occasion, and let AI create the perfect playlist</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleGenerate}>
        <div className="form-group">
          <label>Playlist Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leave empty for auto-generated name"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Describe your ideal playlist</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Energetic rock songs for a road trip"
            rows="4"
            required
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn-generate" disabled={loading}>
          {loading ? 'Generating...' : '✨ Generate Playlist'}
        </button>
      </form>

      <div className="examples">
        <h4>Try these examples:</h4>
        <div className="example-tags">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              onClick={() => setPrompt(example)}
              className="example-tag"
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIPlaylistGenerator;
