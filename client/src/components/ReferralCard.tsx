import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ReferralCardProps {
  referralCode: string;
  referralCount: number;
}

export default function ReferralCard({ referralCode, referralCount }: ReferralCardProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: t('referral.copied'),
      description: t('referral.codeCopied'),
    });
  };

  const handleShare = () => {
    console.log("Share triggered");
    toast({
      title: t('referral.share'),
      description: t('referral.openingShare'),
    });
  };

  return (
    <Card className="p-6" data-testid="card-referral">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">{t('referral.title')}</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {t('referral.description')}
        </p>

        <div className="bg-muted rounded-lg p-3 text-center overflow-hidden">
          <p className="text-lg xs:text-xl font-bold text-foreground tracking-wide truncate" data-testid="text-referral-code">
            {referralCode}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="flex-1" data-testid="button-copy-code">
            <Copy className="w-4 h-4 mr-2" />
            {t('referral.copy')}
          </Button>
          <Button onClick={handleShare} className="flex-1" data-testid="button-share-code">
            <Share2 className="w-4 h-4 mr-2" />
            {t('referral.share')}
          </Button>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          <span className="font-semibold text-chart-3" data-testid="text-referral-count">{referralCount}</span> {t('referral.friendsReferred')}
        </p>
      </div>
    </Card>
  );
}
