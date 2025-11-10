import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ProductPhotoUploadProps {
  currentImageUrl?: string;
  onImageChange: (url: string) => void;
}

export default function ProductPhotoUpload({ currentImageUrl, onImageChange }: ProductPhotoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || "");

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to server
      const response = await fetch('/api/admin/upload-product-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.url;

      setPreviewUrl(imageUrl);
      onImageChange(imageUrl);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl("");
    onImageChange("");
  };

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Product preview"
            className="w-full h-48 object-cover rounded-md border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            data-testid="button-remove-image"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-md p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">Upload product image</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="product-photo-upload"
            data-testid="input-product-photo"
          />
          <label htmlFor="product-photo-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              asChild
              className="hover-elevate active-elevate-2"
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Choose Image"}
              </span>
            </Button>
          </label>
        </div>
      )}
    </div>
  );
}
