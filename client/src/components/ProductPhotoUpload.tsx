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
      // Step 1: Get presigned upload URL from server
      const urlResponse = await fetch('/api/admin/product-images/upload-url', {
        method: 'POST',
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await urlResponse.json();

      // Step 2: Upload directly to Google Cloud Storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      // Step 3: Set ACL policy and get final URL
      const aclResponse = await fetch('/api/admin/product-images/set-acl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: uploadURL }),
      });

      if (!aclResponse.ok) {
        throw new Error('Failed to set image permissions');
      }

      const { url: imageUrl } = await aclResponse.json();

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
