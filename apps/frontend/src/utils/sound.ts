
// Simple sound effect manager
// In a real app, you'd load actual mp3 files. For now, we'll just have placeholders 
// or maybe use valid empty functions to prevent crashes if no files exist.
// Ideally, add Audio context beeps or download assets.

export const playSound = (effect: 'play' | 'draw' | 'uno' | 'win') => {
    // Placeholder: console log or implemented with actual Audio if assets were provided
    // const audio = new Audio(`/sounds/${effect}.mp3`);
    // audio.play().catch(() => {});
    console.log(`[Sound] ${effect}`);
};
