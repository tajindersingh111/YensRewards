import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReferralCardProps {
  referralCode: string;
  referralCount: number;
}

export default function ReferralCard({ referralCode, referralCount }: ReferralCardProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const handleShare = () => {
    //todo: remove mock functionality
    console.log("Share triggered");
    toast({
      title: "Share",
      description: "Opening share options...",
    });
  };

  return (
    <Card className="p-6" data-testid="card-referral">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">Refer a Friend</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Share your code and earn 50 points when friends sign up!
        </p>

        <div className="bg-muted rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-foreground tracking-wider" data-testid="text-referral-code">
            {referralCode}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="flex-1" data-testid="button-copy-code">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button onClick={handleShare} className="flex-1" data-testid="button-share-code">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          <span className="font-semibold text-chart-3" data-testid="text-referral-count">{referralCount}</span> friends referred
        </p>
      </div>
    </Card>
  );
}
