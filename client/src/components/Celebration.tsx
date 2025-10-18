import { useEffect } from "react";
import confetti from "canvas-confetti";

interface CelebrationProps {
  type: "points" | "tier-upgrade";
  onComplete?: () => void;
}

// Play celebration sound using Web Audio API
function playCelebrationSound(type: "points" | "tier-upgrade") {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (type === "tier-upgrade") {
      // EPIC fanfare for tier upgrades
      const times = [0, 0.15, 0.3, 0.5, 0.7];
      const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      
      times.forEach((time, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequencies[index];
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + time);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + 0.4);
        
        oscillator.start(audioContext.currentTime + time);
        oscillator.stop(audioContext.currentTime + time + 0.4);
      });
    } else {
      // Happy "ding-ding!" for points
      const playNote = (frequency: number, startTime: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + 0.3);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + 0.3);
      };
      
      // Two cheerful notes
      playNote(880, 0);      // A5
      playNote(1174.66, 0.15); // D6
    }
  } catch (error) {
    console.log('Could not play sound:', error);
  }
}

export default function Celebration({ type, onComplete }: CelebrationProps) {
  useEffect(() => {
    console.log("🎊 CELEBRATION COMPONENT MOUNTED! Type:", type);
    
    const duration = type === "tier-upgrade" ? 3000 : 2000;
    const animationEnd = Date.now() + duration;

    // Play celebration sound
    console.log("🔊 Playing sound for:", type);
    playCelebrationSound(type);

    // Yens brand colors
    const yensYellow = "#FFD700";
    const yensBlue = "#1E40AF";
    const yensGold = "#FFA500";

    const colors = [yensYellow, yensBlue, yensGold, "#FFFFFF"];
    const shapes: confetti.Shape[] = ["star", "circle"];

    if (type === "tier-upgrade") {
      // BIG celebration for tier upgrades
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          onComplete?.();
          return;
        }

        const particleCount = 50;

        // Confetti from both sides
        confetti({
          particleCount,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors,
          shapes,
          scalar: 1.2,
          gravity: 0.8,
          drift: 0.5,
        });

        confetti({
          particleCount,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors,
          shapes,
          scalar: 1.2,
          gravity: 0.8,
          drift: -0.5,
        });

        // Stars from top center
        confetti({
          particleCount: 30,
          spread: 360,
          origin: { x: 0.5, y: 0.3 },
          colors,
          shapes: ["star"] as confetti.Shape[],
          scalar: 1.5,
          gravity: 0.5,
        });
      }, 250);

      return () => clearInterval(interval);
    } else {
      // Regular celebration for earning points
      const defaults = {
        colors,
        shapes,
        scalar: 1,
        gravity: 1,
      };

      // Burst from center
      confetti({
        ...defaults,
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Cascading confetti
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          ...defaults,
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 300);

      // Stars
      setTimeout(() => {
        confetti({
          particleCount: 30,
          spread: 360,
          origin: { y: 0.5 },
          colors,
          shapes: ["star"] as confetti.Shape[],
          scalar: 1.3,
        });
      }, 600);

      const timeout = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [type, onComplete]);

  return null; // This component only triggers animations
}
