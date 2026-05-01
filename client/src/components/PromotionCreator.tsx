import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface PromotionCreatorProps {
  onSend: (message: string, targetTier?: string) => void;
}

export default function PromotionCreator({ onSend }: PromotionCreatorProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [targetTier, setTargetTier] = useState("all");
  const { toast } = useToast();

  const getTargetDisplay = (tier: string) => {
    if (tier === "all") return t('promotions.allCustomers');
    return t(`promotions.${tier}Tier`);
  };

  const handleSend = () => {
    if (message.trim()) {
      onSend(message, targetTier === "all" ? undefined : targetTier);
      toast({
        title: t('promotions.messageSent'),
        description: t('promotions.promotionSentTo', { target: getTargetDisplay(targetTier) }),
      });
      setMessage("");
      console.log("Message sent:", { message, targetTier });
    }
  };

  return (
    <Card className="p-6" data-testid="card-promotion-creator">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{t('promotions.sendPromotion')}</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target">{t('promotions.targetAudience')}</Label>
            <select
              id="target"
              value={targetTier}
              onChange={(e) => setTargetTier(e.target.value)}
              className="w-full p-2 rounded-md border border-input bg-background"
              data-testid="select-target-tier"
            >
              <option value="all">{t('promotions.allCustomers')}</option>
              <option value="bronze">{t('promotions.bronzeTier')}</option>
              <option value="silver">{t('promotions.silverTier')}</option>
              <option value="gold">{t('promotions.goldTier')}</option>
              <option value="platinum">{t('promotions.platinumTier')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('promotions.message')}</Label>
            <Textarea
              id="message"
              placeholder={t('promotions.messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              data-testid="textarea-message"
            />
            <p className="text-xs text-muted-foreground">
              {t('promotions.smsCharCount', { count: message.length })}
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-full"
            data-testid="button-send-promotion"
          >
            <Users className="w-4 h-4 mr-2" />
            {t('promotions.sendTo', { target: getTargetDisplay(targetTier) })}
          </Button>
        </div>
      </div>
    </Card>
  );
}
