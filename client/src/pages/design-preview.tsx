import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import option1Image from "@assets/generated_images/Option_1_Instagram_Grid_807fc242.png";
import option2Image from "@assets/generated_images/Option_2_Blog_Cards_b1406940.png";
import option3Image from "@assets/generated_images/Option_3_Masonry_Grid_97e234ed.png";

export default function DesignPreview() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Gallery/Blog Design Options</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Choose Your Favorite Design
          </h2>
          <p className="text-muted-foreground">
            Review the 3 options below and decide which layout you prefer
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Option 1 */}
          <Card className="overflow-hidden">
            <div className="bg-primary text-primary-foreground p-4 text-center">
              <h3 className="text-xl font-bold">Option 1</h3>
              <p className="text-sm">Instagram Grid</p>
            </div>
            <div className="p-4">
              <img
                src={option1Image}
                alt="Option 1 - Instagram Grid Layout"
                className="w-full rounded-lg shadow-lg mb-4"
              />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">Features:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>3-column square grid</li>
                  <li>Simple photo gallery</li>
                  <li>Social media style</li>
                  <li>9 photos visible at once</li>
                </ul>
                <p className="font-semibold text-foreground mt-4">Best For:</p>
                <p className="text-muted-foreground">
                  Product showcase, quick browsing, just photos (no text needed)
                </p>
              </div>
            </div>
          </Card>

          {/* Option 2 */}
          <Card className="overflow-hidden">
            <div className="bg-primary text-primary-foreground p-4 text-center">
              <h3 className="text-xl font-bold">Option 2</h3>
              <p className="text-sm">Blog Cards</p>
            </div>
            <div className="p-4">
              <img
                src={option2Image}
                alt="Option 2 - Blog Cards Layout"
                className="w-full rounded-lg shadow-lg mb-4"
              />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">Features:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Full-width photo cards</li>
                  <li>Title + Date + Description</li>
                  <li>Professional blog style</li>
                  <li>Detailed posts</li>
                </ul>
                <p className="font-semibold text-foreground mt-4">Best For:</p>
                <p className="text-muted-foreground">
                  Announcements, promotions, stories with text, news updates
                </p>
              </div>
            </div>
          </Card>

          {/* Option 3 */}
          <Card className="overflow-hidden">
            <div className="bg-primary text-primary-foreground p-4 text-center">
              <h3 className="text-xl font-bold">Option 3</h3>
              <p className="text-sm">Pinterest Masonry</p>
            </div>
            <div className="p-4">
              <img
                src={option3Image}
                alt="Option 3 - Masonry Grid Layout"
                className="w-full rounded-lg shadow-lg mb-4"
              />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">Features:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>2-column staggered grid</li>
                  <li>Different height photos</li>
                  <li>Dynamic, creative layout</li>
                  <li>Modern Pinterest style</li>
                </ul>
                <p className="font-semibold text-foreground mt-4">Best For:</p>
                <p className="text-muted-foreground">
                  Visual variety, creative storytelling, mix of photo sizes
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Card className="p-6 bg-muted">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Which One Do You Prefer?
            </h3>
            <p className="text-muted-foreground">
              Once you decide, let me know: "I want Option 1" or "I want Option 2" or "I want Option 3"
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
