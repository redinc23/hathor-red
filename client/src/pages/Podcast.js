import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Podcast.css';

const Podcast = () => {
    const [loading, setLoading] = useState(true);
    const [sidebarActive, setSidebarActive] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [offlineMode, setOfflineMode] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playerState, setPlayerState] = useState({
        title: 'Quantum Enigma',
        artist: 'Dark Matter Podcast • Episode #147',
        progress: 35,
        volume: 70,
        currentTime: '15:42',
        duration: '1:08:30',
        shuffle: false,
        repeat: 0 // 0: off, 1: all, 2: one
    });
    const [episodes, setEpisodes] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [bgParticles, setBgParticles] = useState([]);
    const [notification, setNotification] = useState(null);

    const bgEffectsRef = useRef(null);
    const commentInputRef = useRef(null);

    // Initial Load & Particle Creation
    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);

        // Create particles
        const particles = [];
        for (let i = 0; i < 30; i++) {
            const size = Math.random() * 3 + 1;
            const posX = Math.random() * 100;
            const delay = Math.random() * 20;
            const duration = Math.random() * 20 + 20;
            const colors = ['#00d4ff', '#764ba2', '#ff1a8c', '#0099ff'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            particles.push({
                id: i,
                style: {
                    width: `${size}px`,
                    height: `${size}px`,
                    left: `${posX}%`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                    background: color
                }
            });
        }
        setBgParticles(particles);

        // Generate demo data
        generateEpisodes();
        generateComments();

        return () => clearTimeout(timer);
    }, []);

    // Notification Logic
    const showNotification = (message) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    const generateEpisodes = () => {
        const episodesData = [
            {
                number: 147,
                title: 'The Quantum Enigma: Entanglement & Reality',
                date: 'May 15, 2024',
                duration: '1:08:30',
                description: 'We explore quantum entanglement, the phenomenon Einstein called "spooky action at a distance," and what it means for our understanding of reality.',
                tags: ['Quantum Physics', 'Entanglement', 'Einstein']
            },
            {
                number: 146,
                title: 'Black Holes: The Information Paradox',
                date: 'May 8, 2024',
                duration: '1:12:15',
                description: 'Diving into Stephen Hawking\'s black hole information paradox and the latest theories attempting to resolve it.',
                tags: ['Black Holes', 'Hawking', 'Information']
            },
            {
                number: 145,
                title: 'The Multiverse: Science or Speculation?',
                date: 'May 1, 2024',
                duration: '1:04:42',
                description: 'Examining the scientific evidence for multiple universes and where the line between physics and philosophy lies.',
                tags: ['Multiverse', 'Cosmology', 'Theoretical']
            },
            {
                number: 144,
                title: 'Dark Energy: The Universe\'s Greatest Mystery',
                date: 'April 24, 2024',
                duration: '1:15:20',
                description: 'What we know (and don\'t know) about dark energy, the mysterious force accelerating the expansion of the universe.',
                tags: ['Dark Energy', 'Cosmology', 'Expansion']
            },
            {
                number: 143,
                title: 'The James Webb Telescope: First Discoveries',
                date: 'April 17, 2024',
                duration: '1:10:05',
                description: 'Analyzing the groundbreaking discoveries from the James Webb Space Telescope and what they tell us about the early universe.',
                tags: ['JWST', 'Telescope', 'Discoveries']
            },
            {
                number: 142,
                title: 'Time: Illusion or Fundamental?',
                date: 'April 10, 2024',
                duration: '1:05:50',
                description: 'Exploring the nature of time from Newtonian physics to relativity and quantum mechanics.',
                tags: ['Time', 'Relativity', 'Philosophy']
            },
            {
                number: 141,
                title: 'Neutrinos: Ghost Particles of the Universe',
                date: 'April 3, 2024',
                duration: '59:30',
                description: 'The strange world of neutrinos, particles that barely interact with matter but hold secrets to supernovae and the early universe.',
                tags: ['Neutrinos', 'Particle Physics', 'Supernovae']
            },
            {
                number: 140,
                title: 'The Search for Extraterrestrial Intelligence',
                date: 'March 27, 2024',
                duration: '1:18:15',
                description: 'A look at SETI, the search for extraterrestrial intelligence, and the latest methods for detecting life beyond Earth.',
                tags: ['SETI', 'Aliens', 'Astrobiology']
            }
        ];
        setEpisodes(episodesData);
    };

    const generateComments = () => {
        const commentsData = [
            {
                id: 1,
                author: 'QuantumCurious',
                time: '2 days ago',
                text: 'This episode completely changed how I think about reality. The explanation of Bell\'s Theorem was the clearest I\'ve ever heard!',
                likes: 142,
                liked: false
            },
            {
                id: 2,
                author: 'PhysicsFan92',
                time: '3 days ago',
                text: 'Dr. Chen\'s analogy about quantum entanglement being like a pair of magical dice that always show the same number, no matter how far apart they are, was brilliant.',
                likes: 89,
                liked: true
            },
            {
                id: 3,
                author: 'AstroNerd',
                time: '4 days ago',
                text: 'I\'ve been following this podcast since episode 1, and this might be the best one yet. The discussion about practical quantum computing applications was fascinating.',
                likes: 56,
                liked: false
            },
            {
                id: 4,
                author: 'ScienceTeacher',
                time: '5 days ago',
                text: 'Using this episode in my high school physics class next week. Students are going to love the "spooky action" discussion!',
                likes: 34,
                liked: false
            }
        ];
        setComments(commentsData);
    };

    const handleSubscribe = () => {
        if (subscribed) {
            setSubscribed(false);
            showNotification('Unsubscribed from Dark Matter');
        } else {
            setSubscribed(true);
            showNotification('Subscribed to Dark Matter! New episodes will appear in your library.');
        }
    };

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleEpisodePlay = (episode) => {
        setPlayerState(prev => ({
            ...prev,
            title: episode.title,
            artist: `Dark Matter Podcast • Episode #${episode.number}`
        }));
        setIsPlaying(true);
        showNotification(`Playing: ${episode.title}`);
    };

    const handleCommentSubmit = () => {
        if (newComment.trim()) {
            const newCommentObj = {
                id: Date.now(),
                author: 'You',
                time: 'Just now',
                text: newComment,
                likes: 0,
                liked: false
            };
            setComments([newCommentObj, ...comments]);
            setNewComment('');
            showNotification('Comment posted successfully!');
        }
    };

    const handleLikeComment = (id) => {
        setComments(comments.map(comment => {
            if (comment.id === id) {
                return {
                    ...comment,
                    liked: !comment.liked,
                    likes: comment.liked ? comment.likes - 1 : comment.likes + 1
                };
            }
            return comment;
        }));
    };

    const handleSeek = (e) => {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        setPlayerState(prev => ({ ...prev, progress: Math.max(0, Math.min(100, percent)) }));
    };

    const handleVolume = (e) => {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        setPlayerState(prev => ({ ...prev, volume: Math.max(0, Math.min(100, percent)) }));
    };

    const toggleRepeat = () => {
        setPlayerState(prev => {
            const nextMode = (prev.repeat + 1) % 3;
            const messages = ['Repeat off', 'Repeat all', 'Repeat one'];
            showNotification(messages[nextMode]);
            return { ...prev, repeat: nextMode };
        });
    };

    const toggleShuffle = () => {
        setPlayerState(prev => {
            const newState = !prev.shuffle;
            showNotification(newState ? 'Shuffle mode activated' : 'Shuffle mode deactivated');
            return { ...prev, shuffle: newState };
        });
    };

    const toggleOffline = () => {
        setOfflineMode(!offlineMode);
        showNotification(!offlineMode ? 'Offline mode activated. Downloaded content only.' : 'Online mode activated. Streaming available.');
    };

    return (
        <div className="podcast-page-wrapper">
            {/* Loading Screen */}
            {loading && (
                <div className="loading" id="loading">
                    <div className="loading-spinner"></div>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed',
                    bottom: '100px',
                    right: '30px',
                    backgroundColor: 'rgba(10, 10, 10, 0.9)',
                    backdropFilter: 'blur(20px)',
                    color: 'var(--text)',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    zIndex: 9999,
                    fontSize: '14px',
                    fontWeight: '600',
                    maxWidth: '300px',
                    animation: 'fadeIn 0.3s ease forwards'
                }}>
                    {notification}
                </div>
            )}

            {/* Background Effects */}
            <div className="bg-effects" id="bgEffects" ref={bgEffectsRef}>
                {bgParticles.map(particle => (
                    <div
                        key={particle.id}
                        className="bg-particle"
                        style={particle.style}
                    />
                ))}
            </div>

            {/* Menu Toggle (Mobile) */}
            <div
                className="menu-toggle"
                id="menuToggle"
                onClick={() => setSidebarActive(!sidebarActive)}
            >
                <i className={`fas ${sidebarActive ? 'fa-times' : 'fa-bars'}`}></i>
            </div>

            <div className="container">
                {/* Sidebar */}
                <div className={`sidebar ${sidebarActive ? 'active' : ''}`} id="sidebar">
                    <div className="logo">
                        <div className="logo-icon">
                            <i className="fas fa-wave-square"></i>
                        </div>
                        <span>AETHER</span>
                    </div>

                    <nav className="nav">
                        <Link to="/" className="nav-item">
                            <div className="nav-icon">
                                <i className="fas fa-home"></i>
                            </div>
                            <span>Home</span>
                        </Link>
                        <div className="nav-item">
                            <div className="nav-icon">
                                <i className="fas fa-compass"></i>
                            </div>
                            <span>Discover</span>
                            <span className="mvp-badge">AI</span>
                        </div>
                        <div className="nav-item">
                            <div className="nav-icon">
                                <i className="fas fa-podcast"></i>
                            </div>
                            <span>Podcasts</span>
                        </div>
                        <div className="nav-item active">
                            <div className="nav-icon">
                                <i className="fas fa-headphones"></i>
                            </div>
                            <span>My Podcasts</span>
                        </div>
                        <div className="nav-item">
                            <div className="nav-icon">
                                <i className="fas fa-download"></i>
                            </div>
                            <span>Downloads</span>
                            <span className="mvp-badge">Offline</span>
                        </div>
                        <div className="nav-item">
                            <div className="nav-icon">
                                <i className="fas fa-clock"></i>
                            </div>
                            <span>Recently Played</span>
                        </div>
                        <div className="nav-item">
                            <div className="nav-icon">
                                <i className="fas fa-users"></i>
                            </div>
                            <span>Following</span>
                        </div>
                    </nav>

                    <div className="user-section">
                        <div className="user-profile" id="userProfile">
                            <div className="user-avatar"></div>
                            <div className="user-info">
                                <h4>Podcast Listener</h4>
                                <p>Premium User</p>
                            </div>
                        </div>

                        <div className="offline-status" id="offlineToggle" onClick={toggleOffline}>
                            <div className={`offline-indicator ${offlineMode ? 'offline' : ''}`} id="offlineIndicator"></div>
                            <span id="offlineStatusText">{offlineMode ? 'Offline Mode' : 'Online Mode'}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="main-content">
                    {/* Podcast Hero Section */}
                    <div className="podcast-hero-section">
                        <div className="podcast-hero-bg" style={{backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%), url('https://images.unsplash.com/photo-1589903308904-1010c2294adc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"}}></div>
                        <div className="podcast-hero-overlay"></div>

                        <div className="podcast-hero-content fade-in">
                            <div className="podcast-cover">
                                <img src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" alt="Dark Matter Podcast Cover" />
                            </div>

                            <div className="podcast-info">
                                <div className="podcast-badge">
                                    <i className="fas fa-podcast"></i>
                                    <span>Science & Technology</span>
                                    <span className="featured-badge">Featured</span>
                                </div>

                                <h1 className="podcast-title">DARK MATTER</h1>

                                <div className="podcast-host">
                                    <i className="fas fa-microphone-alt"></i>
                                    <span>Hosted by Dr. Alex Rivera & Dr. Maya Chen</span>
                                </div>

                                <p className="podcast-description">
                                    Explore the mysteries of the universe with Dark Matter, a weekly podcast where astrophysicists Dr. Alex Rivera and Dr. Maya Chen break down complex scientific concepts into engaging, accessible conversations. From black holes to quantum mechanics, join us as we unravel the secrets of the cosmos.
                                </p>

                                <div className="podcast-stats">
                                    <div className="podcast-stat">
                                        <div className="podcast-stat-value">148</div>
                                        <div className="podcast-stat-label">Episodes</div>
                                    </div>
                                    <div className="podcast-stat">
                                        <div className="podcast-stat-value">2.4M</div>
                                        <div className="podcast-stat-label">Subscribers</div>
                                    </div>
                                    <div className="podcast-stat">
                                        <div className="podcast-stat-value">⭐ 4.8</div>
                                        <div className="podcast-stat-label">Rating</div>
                                    </div>
                                    <div className="podcast-stat">
                                        <div className="podcast-stat-value">2018</div>
                                        <div className="podcast-stat-label">Since</div>
                                    </div>
                                </div>

                                <div className="podcast-rating">
                                    <div className="stars">
                                        <i className="fas fa-star filled"></i>
                                        <i className="fas fa-star filled"></i>
                                        <i className="fas fa-star filled"></i>
                                        <i className="fas fa-star filled"></i>
                                        <i className="fas fa-star-half-alt filled"></i>
                                    </div>
                                    <div className="rating-value">4.8 (24.8K ratings)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="action-bar fade-in delay-1">
                        <button className="play-btn" id="playPodcastBtn" onClick={handlePlayPause}>
                            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        <button
                            className={`action-btn ${subscribed ? 'subscribed' : ''}`}
                            id="subscribeBtn"
                            onClick={handleSubscribe}
                        >
                            {subscribed ? 'Subscribed' : 'Subscribe'}
                        </button>
                        <button className="action-btn">
                            <i className="fas fa-download"></i> Download All
                        </button>
                        <button className="action-icon">
                            <i className="fas fa-share-alt"></i>
                        </button>
                        <button className="action-icon">
                            <i className="fas fa-ellipsis-h"></i>
                        </button>
                    </div>

                    {/* Hosts Section */}
                    <div className="content-section fade-in delay-2">
                        <div className="section-header">
                            <h2 className="section-title">Hosts</h2>
                        </div>

                        <div className="hosts-grid">
                            {/* Host 1 */}
                            <div className="host-card">
                                <div className="host-header">
                                    <div className="host-avatar"></div>
                                    <div>
                                        <div className="host-name">Dr. Alex Rivera</div>
                                        <div className="host-role">Astrophysicist, MIT</div>
                                    </div>
                                </div>

                                <p className="host-bio">
                                    Alex is a theoretical astrophysicist specializing in dark matter and cosmology. With over 15 years of research experience, he brings complex concepts to life with engaging explanations and real-world analogies.
                                </p>

                                <div className="host-social">
                                    <a href="#" className="social-icon">
                                        <i className="fab fa-twitter"></i>
                                    </a>
                                    <a href="#" className="social-icon">
                                        <i className="fab fa-linkedin-in"></i>
                                    </a>
                                    <a href="#" className="social-icon">
                                        <i className="fas fa-globe"></i>
                                    </a>
                                </div>
                            </div>

                            {/* Host 2 */}
                            <div className="host-card">
                                <div className="host-header">
                                    <div className="host-avatar"></div>
                                    <div>
                                        <div className="host-name">Dr. Maya Chen</div>
                                        <div className="host-role">Quantum Physicist, Stanford</div>
                                    </div>
                                </div>

                                <p className="host-bio">
                                    Maya is a quantum physicist with a passion for science communication. Her research focuses on quantum entanglement and she has a unique talent for making abstract physics concepts relatable and exciting.
                                </p>

                                <div className="host-social">
                                    <a href="#" className="social-icon">
                                        <i className="fab fa-twitter"></i>
                                    </a>
                                    <a href="#" className="social-icon">
                                        <i className="fab fa-instagram"></i>
                                    </a>
                                    <a href="#" className="social-icon">
                                        <i className="fas fa-book"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Episodes */}
                    <div className="content-section fade-in delay-3">
                        <div className="section-header">
                            <h2 className="section-title">Recent Episodes</h2>
                            <a href="#" className="view-all">View All Episodes</a>
                        </div>

                        <div className="episodes-list" id="episodesList">
                            {episodes.map(episode => (
                                <div className="episode-item" key={episode.number} onClick={(e) => {
                                    if (!e.target.closest('.episode-action-btn')) {
                                        handleEpisodePlay(episode);
                                    }
                                }}>
                                    <div className="episode-number">#{episode.number}</div>
                                    <button className="episode-play-btn"><i className="fas fa-play"></i></button>
                                    <div className="episode-info">
                                        <div className="episode-title">{episode.title}</div>
                                        <div className="episode-meta">
                                            <span>{episode.date}</span>
                                            <div className="episode-dot"></div>
                                            <span>{episode.duration}</span>
                                        </div>
                                        <div className="episode-description">{episode.description}</div>
                                        <div className="episode-tags">
                                            {episode.tags.map(tag => <span key={tag} className="episode-tag">{tag}</span>)}
                                        </div>
                                    </div>
                                    <div className="episode-duration">{episode.duration}</div>
                                    <div className="episode-actions">
                                        <button className="episode-action-btn"><i className="fas fa-download"></i></button>
                                        <button className="episode-action-btn"><i className="far fa-heart"></i></button>
                                        <button className="episode-action-btn"><i className="fas fa-ellipsis-h"></i></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Show Notes */}
                    <div className="content-section fade-in delay-4">
                        <div className="section-header">
                            <h2 className="section-title">Show Notes</h2>
                            <div className="episode-date">Episode #147 • Published: May 15, 2024</div>
                        </div>

                        <div className="show-notes">
                            <div className="show-notes-header">
                                <div className="show-notes-title">The Quantum Enigma: Entanglement & Reality</div>
                            </div>

                            <div className="show-notes-content">
                                <p>In this episode, we explore one of the most mind-bending concepts in physics: quantum entanglement. Albert Einstein famously called it "spooky action at a distance," but what does it really mean?</p>

                                <p><strong>Key Topics Covered:</strong></p>
                                <ul>
                                    <li>The EPR Paradox and Bell's Theorem</li>
                                    <li>How entanglement challenges our understanding of reality</li>
                                    <li>Recent experiments proving entanglement over record distances</li>
                                    <li>Practical applications in quantum computing and cryptography</li>
                                    <li>The philosophical implications for our understanding of the universe</li>
                                </ul>

                                <p><strong>Timestamps:</strong></p>
                                <ul>
                                    <li><span className="timestamp" data-time="2:30" onClick={() => showNotification("Jumping to 2:30")}>02:30</span> - Introduction to quantum weirdness</li>
                                    <li><span className="timestamp" data-time="12:45" onClick={() => showNotification("Jumping to 12:45")}>12:45</span> - The history of entanglement</li>
                                    <li><span className="timestamp" data-time="28:10" onClick={() => showNotification("Jumping to 28:10")}>28:10</span> - Bell's Theorem explained</li>
                                    <li><span className="timestamp" data-time="42:30" onClick={() => showNotification("Jumping to 42:30")}>42:30</span> - Modern experiments and breakthroughs</li>
                                    <li><span className="timestamp" data-time="58:15" onClick={() => showNotification("Jumping to 58:15")}>58:15</span> - Quantum computing applications</li>
                                </ul>

                                <p><strong>Resources Mentioned:</strong></p>
                                <ul>
                                    <li>"The Quantum Universe" by Brian Cox and Jeff Forshaw</li>
                                    <li>Recent Nature paper on 50km entanglement experiment</li>
                                    <li>Stanford's Quantum Computing Lab website</li>
                                </ul>

                                <p>Subscribe to our newsletter for additional resources and follow-up reading materials.</p>
                            </div>
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="content-section fade-in delay-5">
                        <div className="section-header">
                            <h2 className="section-title">Comments & Discussion</h2>
                        </div>

                        <div className="comments-section">
                            <div className="comment-form">
                                <div className="comment-avatar"></div>
                                <div className="comment-input-container">
                                    <textarea
                                        className="comment-input"
                                        placeholder="Join the discussion... What are your thoughts on this episode?"
                                        id="commentInput"
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                handleCommentSubmit();
                                            }
                                        }}
                                    ></textarea>
                                    <button
                                        className="comment-submit"
                                        id="commentSubmit"
                                        onClick={handleCommentSubmit}
                                    >
                                        Post Comment
                                    </button>
                                </div>
                            </div>

                            <div className="comments-list" id="commentsList">
                                {comments.map(comment => (
                                    <div className="comment-item" key={comment.id}>
                                        <div className="comment-avatar"></div>
                                        <div className="comment-content">
                                            <div className="comment-header">
                                                <div className="comment-author">{comment.author}</div>
                                                <div className="comment-time">{comment.time}</div>
                                            </div>
                                            <div className="comment-text">{comment.text}</div>
                                            <div className="comment-actions">
                                                <button
                                                    className={`comment-action ${comment.liked ? 'liked' : ''}`}
                                                    onClick={() => handleLikeComment(comment.id)}
                                                >
                                                    <i className="fas fa-heart"></i>
                                                    <span>{comment.likes}</span>
                                                </button>
                                                <button className="comment-action">
                                                    <i className="fas fa-reply"></i>
                                                    <span>Reply</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Player */}
            <div className="player">
                <div className="player-left">
                    <div className="player-cover"></div>
                    <div className="player-info">
                        <div className="player-title">{playerState.title}</div>
                        <div className="player-artist">{playerState.artist}</div>
                    </div>
                    <button className="control-btn">
                        <i className="fas fa-heart"></i>
                    </button>
                </div>

                <div className="player-center">
                    <div className="player-controls">
                        <button
                            className={`control-btn ${playerState.shuffle ? 'active' : ''}`}
                            id="shuffleBtn"
                            onClick={toggleShuffle}
                        >
                            <i className="fas fa-random"></i>
                        </button>
                        <button className="control-btn">
                            <i className="fas fa-step-backward"></i>
                        </button>
                        <button
                            className="control-btn play-btn-small"
                            id="playerPlayBtn"
                            onClick={handlePlayPause}
                        >
                            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        <button className="control-btn">
                            <i className="fas fa-step-forward"></i>
                        </button>
                        <button
                            className={`control-btn ${playerState.repeat ? 'active' : ''}`}
                            id="repeatBtn"
                            onClick={toggleRepeat}
                        >
                            <i className={`fas ${playerState.repeat === 2 ? 'fa-sync-alt' : 'fa-redo'}`}></i>
                        </button>
                    </div>

                    <div className="progress-container">
                        <span className="time">{playerState.currentTime}</span>
                        <div className="progress-bar" onClick={handleSeek}>
                            <div className="progress-fill" style={{width: `${playerState.progress}%`}}></div>
                        </div>
                        <span className="time">{playerState.duration}</span>
                    </div>
                </div>

                <div className="player-right">
                    <button className="control-btn" id="speedBtn">
                        <i className="fas fa-tachometer-alt"></i>
                    </button>

                    <div className="volume-control">
                        <button className="control-btn" id="volumeBtn">
                            <i className={`fas ${playerState.volume === 0 ? 'fa-volume-mute' : playerState.volume < 50 ? 'fa-volume-down' : 'fa-volume-up'}`}></i>
                        </button>
                        <div className="volume-bar" onClick={handleVolume}>
                            <div className="volume-fill" style={{width: `${playerState.volume}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Podcast;
