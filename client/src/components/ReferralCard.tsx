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
    <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden" data-testid="card-referral">
      {/* Blue-900 header block */}
      <div className="bg-blue-900 px-4 py-3 flex items-center gap-3">
        <div className="bg-yellow-400 rounded-xl p-3 shadow-lg flex-shrink-0">
          <Users className="w-4 h-4 text-blue-900" />
        </div>
        <h3 className="text-base font-black text-white uppercase tracking-tight">
          {t('referral.title')}
        </h3>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('referral.description')}
        </p>

        <div className="bg-slate-50 rounded-2xl p-3 text-center overflow-hidden">
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
          <span className="font-semibold text-yellow-500" data-testid="text-referral-count">{referralCount}</span> {t('referral.friendsReferred')}
        </p>
      </div>
    </Card>
  );
}
