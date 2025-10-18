import { useState } from "react";

export default function CameraTest() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState("No photo yet");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("File selected:", file);
    
    if (file) {
      setMessage(`File selected: ${file.name}`);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPhoto(result);
        setMessage("Photo loaded successfully!");
        console.log("Photo loaded");
      };
      reader.onerror = () => {
        setMessage("Error loading photo");
        console.error("Error loading photo");
      };
      reader.readAsDataURL(file);
    } else {
      setMessage("No file selected");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>Camera Test Page</h1>
      
      <div style={{ marginBottom: "20px", padding: "20px", border: "2px solid #ccc", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Test 1: Native File Input</h2>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            border: "2px solid #FCD34D",
            borderRadius: "8px",
            backgroundColor: "#FCD34D",
            cursor: "pointer"
          }}
        />
        <p style={{ marginTop: "10px", fontSize: "14px" }}>{message}</p>
      </div>

      {photo && (
        <div style={{ marginTop: "20px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Photo Preview:</h3>
          <img 
            src={photo} 
            alt="Captured" 
            style={{ 
              width: "100%", 
              maxHeight: "400px", 
              objectFit: "contain",
              border: "2px solid #ccc",
              borderRadius: "8px"
            }} 
          />
        </div>
      )}

      <div style={{ marginTop: "30px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>Instructions:</h3>
        <ol style={{ fontSize: "14px", paddingLeft: "20px" }}>
          <li>Tap the yellow file input above</li>
          <li>Your device should show camera/gallery picker</li>
          <li>Take or select a photo</li>
          <li>Photo should appear below</li>
        </ol>
      </div>
    </div>
  );
}
