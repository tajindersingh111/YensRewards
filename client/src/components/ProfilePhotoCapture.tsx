import { Button } from "@/components/ui/button";
import { Camera, User } from "lucide-react";
import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfilePhotoCaptureProps {
  currentPhoto?: string | null;
  onPhotoCapture: (photoData: string) => void;
  userName?: string;
}

export default function ProfilePhotoCapture({ 
  currentPhoto, 
  onPhotoCapture,
  userName 
}: ProfilePhotoCaptureProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(currentPhoto || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const applyYellowOverlay = (imageData: string) => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve(imageData);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Apply yellow overlay with blend mode
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(252, 211, 77, 0.15)'; // Yens yellow with 15% opacity
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add a subtle yellow border glow
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(252, 211, 77, 0.8)';
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Convert canvas to data URL
        const processedImage = canvas.toDataURL('image/jpeg', 0.9);
        resolve(processedImage);
      };
      img.src = imageData;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const originalImage = event.target?.result as string;
        // Apply yellow branding overlay
        const processedImage = await applyYellowOverlay(originalImage);
        setImagePreview(processedImage);
        onPhotoCapture(processedImage);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const getInitials = () => {
    if (!userName) return "?";
    const names = userName.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Avatar Display with Yellow Border */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-30"></div>
        <Avatar 
          className="w-32 h-32 border-4 border-primary relative ring-4 ring-primary/20"
          data-testid="avatar-profile"
        >
          <AvatarImage src={imagePreview || undefined} alt={userName || "Profile"} />
          <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        {/* DEBUG: Visible camera button to test */}
        <div className="absolute bottom-0 right-0">
          <input
            id="profile-photo-input"
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileSelect}
            className="h-9 w-9 cursor-pointer opacity-0 absolute"
            data-testid="input-file-profile-photo"
          />
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
        </div>
        
        {/* Fallback: Direct visible file input below avatar */}
        <div className="mt-2">
          <label className="text-xs text-muted-foreground block mb-1">Or tap here:</label>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileSelect}
            className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary file:text-primary-foreground cursor-pointer"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {imagePreview ? "Tap camera icon to change photo" : "Add your profile photo"}
        </p>
        {!imagePreview && (
          <p className="text-xs text-muted-foreground mt-1">
            Photos get a special Yens yellow theme!
          </p>
        )}
      </div>
    </div>
  );
}
