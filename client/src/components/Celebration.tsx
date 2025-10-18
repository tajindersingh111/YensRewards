import { useEffect } from "react";
import confetti from "canvas-confetti";

interface CelebrationProps {
  type: "points" | "tier-upgrade";
  onComplete?: () => void;
}

export default function Celebration({ type, onComplete }: CelebrationProps) {
  useEffect(() => {
    const duration = type === "tier-upgrade" ? 3000 : 2000;
    const animationEnd = Date.now() + duration;

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
