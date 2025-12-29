-- Seed Data for Development

-- Insert sample users (password is 'password123' hashed with bcrypt)
INSERT INTO users (username, email, password_hash, display_name) VALUES
('demo_user', 'demo@example.com', '$2a$10$YourHashedPasswordHere', 'Demo User'),
('john_doe', 'john@example.com', '$2a$10$YourHashedPasswordHere', 'John Doe'),
('jane_smith', 'jane@example.com', '$2a$10$YourHashedPasswordHere', 'Jane Smith');

-- Insert sample songs
INSERT INTO songs (title, artist, album, duration, file_path, genre, year, uploaded_by) VALUES
('Summer Vibes', 'The Artists', 'Chill Collection', 180, '/audio/summer-vibes.mp3', 'Electronic', 2023, 1),
('Midnight Jazz', 'Jazz Ensemble', 'Night Sessions', 240, '/audio/midnight-jazz.mp3', 'Jazz', 2022, 1),
('Rock Anthem', 'The Rockers', 'Greatest Hits', 210, '/audio/rock-anthem.mp3', 'Rock', 2021, 2),
('Classical Dreams', 'Orchestra Plus', 'Symphonies', 300, '/audio/classical-dreams.mp3', 'Classical', 2020, 2),
('Hip Hop Beat', 'MC Flow', 'Rhymes', 195, '/audio/hiphop-beat.mp3', 'Hip Hop', 2023, 3);

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
