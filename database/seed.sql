-- Seed Data for Development

-- Insert sample users (password is 'password123' hashed with bcrypt)
-- Hash generated using: bcrypt.hash('password123', 10)
INSERT INTO users (username, email, password_hash, display_name) VALUES
('demo_user', 'demo@example.com', '$2a$10$ypVUP9Ft4M9JDAADbRn0wustebo6V55BAHsBsaGgL8r0uqpJwoeJu', 'Demo User'),
('john_doe', 'john@example.com', '$2a$10$ypVUP9Ft4M9JDAADbRn0wustebo6V55BAHsBsaGgL8r0uqpJwoeJu', 'John Doe'),
('jane_smith', 'jane@example.com', '$2a$10$ypVUP9Ft4M9JDAADbRn0wustebo6V55BAHsBsaGgL8r0uqpJwoeJu', 'Jane Smith');

-- Insert sample songs
-- File paths are relative to project root (matches uploadSong controller format)
INSERT INTO songs (title, artist, album, duration, file_path, genre, year, uploaded_by) VALUES
('Summer Vibes', 'The Artists', 'Chill Collection', 180, '/uploads/sample-summer-vibes.mp3', 'Electronic', 2023, 1),
('Midnight Jazz', 'Jazz Ensemble', 'Night Sessions', 240, '/uploads/sample-midnight-jazz.mp3', 'Jazz', 2022, 1),
('Rock Anthem', 'The Rockers', 'Greatest Hits', 210, '/uploads/sample-rock-anthem.mp3', 'Rock', 2021, 2),
('Classical Dreams', 'Orchestra Plus', 'Symphonies', 300, '/uploads/sample-classical-dreams.mp3', 'Classical', 2020, 2),
('Hip Hop Beat', 'MC Flow', 'Rhymes', 195, '/uploads/sample-hiphop-beat.mp3', 'Hip Hop', 2023, 3);

-- Insert sample playlists
INSERT INTO playlists (user_id, name, description, is_public) VALUES
(1, 'My Favorites', 'Collection of my favorite tracks', true),
(1, 'Workout Mix', 'High energy songs for exercise', true),
(2, 'Chill Sessions', 'Relaxing music for study', true);

-- Insert playlist songs
INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES
(1, 1, 1),
(1, 2, 2),
(1, 3, 3),
(2, 3, 1),
(2, 5, 2),
(3, 1, 1),
(3, 2, 2),
(3, 4, 3);
