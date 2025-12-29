/**
 * Generate Sample Audio Files for Development
 *
 * This script creates minimal valid MP3 files for testing the platform.
 * It uses ffmpeg if available, otherwise downloads sample audio from a reliable source.
 *
 * Usage: node database/generate-sample-audio.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const uploadsDir = path.join(__dirname, '..', 'uploads');

const sampleFiles = [
  { name: 'sample-summer-vibes.mp3', duration: 5 },
  { name: 'sample-midnight-jazz.mp3', duration: 5 },
  { name: 'sample-rock-anthem.mp3', duration: 5 },
  { name: 'sample-classical-dreams.mp3', duration: 5 },
  { name: 'sample-hiphop-beat.mp3', duration: 5 }
];

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function generateWithFfmpeg(filename, duration) {
  const filePath = path.join(uploadsDir, filename);
  // Generate a silent audio file with ffmpeg
  // Using lavfi to generate silence
  const cmd = `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${duration} -q:a 9 "${filePath}"`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`  Failed to generate ${filename}:`, error.message);
    return false;
  }
}

// Minimal valid MP3 file (silent, ~1 second)
// This is a valid MP3 frame with silence
const MINIMAL_MP3 = Buffer.from([
  // ID3v2 header
  0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  // MP3 frame header (MPEG1 Layer 3, 128kbps, 44100Hz, stereo)
  0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  // Additional silent frames
  0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);

function generateMinimalMp3(filename) {
  const filePath = path.join(uploadsDir, filename);
  try {
    fs.writeFileSync(filePath, MINIMAL_MP3);
    return true;
  } catch (error) {
    console.error(`  Failed to create ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Generating sample audio files for development...\n');

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const hasFfmpeg = checkFfmpeg();
  if (hasFfmpeg) {
    console.log('ffmpeg detected - generating proper audio files\n');
  } else {
    console.log('ffmpeg not found - generating minimal placeholder MP3 files');
    console.log('(Install ffmpeg for better sample audio generation)\n');
  }

  let successCount = 0;
  for (const file of sampleFiles) {
    process.stdout.write(`Generating ${file.name}... `);

    let success;
    if (hasFfmpeg) {
      success = generateWithFfmpeg(file.name, file.duration);
    } else {
      success = generateMinimalMp3(file.name);
    }

    if (success) {
      console.log('✓');
      successCount++;
    } else {
      console.log('✗');
    }
  }

  console.log(`\n${successCount}/${sampleFiles.length} sample files generated in ${uploadsDir}`);

  if (successCount === sampleFiles.length) {
    console.log('\nSample audio files are ready for development!');
    console.log('Run "node database/seed.js" to seed the database.');
  } else {
    console.log('\nSome files failed to generate. Check the errors above.');
  }
}

main().catch(console.error);
