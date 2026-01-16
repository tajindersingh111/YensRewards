import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, ArrowLeft, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import logoUrl from "@assets/yens logo_1760702216221.png";

interface CustomerReviewPageProps {
  customerId?: string;
  onBack: () => void;
}

const FEEDBACK_TAGS = [
  { key: "delicious", en: "Delicious", th: "อาหารอร่อย" },
  { key: "fast_service", en: "Fast Service", th: "บริการรวดเร็ว" },
  { key: "good_value", en: "Good Value", th: "ราคาคุ้มค่า" },
  { key: "hygienic", en: "Hygienic", th: "ถูกสุขลักษณะ" },
  { key: "nice_atmosphere", en: "Nice Atmosphere", th: "บรรยากาศดี" },
];

export default function CustomerReviewPage({ customerId, onBack }: CustomerReviewPageProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isThai = i18n.language === "th";

  const submitReviewMutation = useMutation({
    mutationFn: async (data: { rating: number; feedbackTags: string[]; comment: string; customerId?: string }) => {
      const res = await apiRequest("POST", "/api/reviews", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: t("review.thankYou"),
        description: t("review.feedbackReceived"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("review.submitError"),
        variant: "destructive",
      });
    },
  });

  const toggleTag = (tagKey: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagKey) ? prev.filter((t) => t !== tagKey) : [...prev, tagKey]
    );
  };

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: t("review.ratingRequired"),
        description: t("review.pleaseSelectRating"),
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate({
      rating,
      feedbackTags: selectedTags,
      comment: comment.trim(),
      customerId,
    });
  };

  const openGoogleMaps = () => {
    window.open("https://maps.app.goo.gl/JgLQYrmdJ4b2bFFw9?g_st=ic", "_blank");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 via-amber-50 to-white flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 mb-6 rounded-full bg-yens-yellow flex items-center justify-center shadow-lg">
          <img src={logoUrl} alt="Yens" className="w-14 h-14 object-contain" />
        </div>
        
        <h1 className="text-2xl font-bold text-yens-blue mb-2 text-center">
          {t("review.thankYou")}
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          {t("review.feedbackReceived")}
        </p>

        {rating >= 4 && (
          <Card className="p-6 mb-6 bg-white/90 backdrop-blur border-yens-yellow border-2 max-w-sm w-full">
            <p className="text-center text-gray-700 mb-4">
              {t("review.loveItShare")}
            </p>
            <Button 
              onClick={openGoogleMaps}
              className="w-full bg-yens-blue text-white gap-2 border-yens-blue-border"
              data-testid="button-share-google"
            >
              <ExternalLink className="w-4 h-4" />
              {t("review.shareOnGoogle")}
            </Button>
          </Card>
        )}

        <Button 
          variant="outline" 
          onClick={onBack}
          className="gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("review.backToHome")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-amber-50 to-white flex flex-col">
      <div className="flex items-center p-3 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          data-testid="button-review-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="font-medium text-yens-blue ml-2">{t("review.title")}</span>
      </div>

      <div className="flex-1 p-4 flex flex-col items-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-yens-yellow flex items-center justify-center shadow-lg">
          <img src={logoUrl} alt="Yens" className="w-11 h-11 object-contain" />
        </div>

        <h1 className="text-lg font-bold text-yens-blue mb-6 text-center px-4">
          {t("review.rateExperience")}
        </h1>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110 active:scale-95"
              data-testid={`star-${star}`}
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? "fill-yens-yellow text-yens-yellow"
                    : "fill-transparent text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>

        <h2 className="text-sm font-medium text-gray-700 mb-3">
          {t("review.whatYouLiked")}
        </h2>

        <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-sm">
          {FEEDBACK_TAGS.map((tag) => (
            <Button
              key={tag.key}
              variant={selectedTags.includes(tag.key) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTag(tag.key)}
              className={`rounded-full transition-all toggle-elevate ${
                selectedTags.includes(tag.key)
                  ? "bg-yens-yellow text-yens-blue border-yens-yellow toggle-elevated"
                  : "border-gray-300 text-gray-600"
              }`}
              data-testid={`tag-${tag.key}`}
            >
              {isThai ? tag.th : tag.en}
            </Button>
          ))}
        </div>

        <Card className="w-full max-w-sm p-4 bg-white/80 backdrop-blur">
          <label className="text-sm text-gray-600 mb-2 block">
            {t("review.additionalComments")}
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder={t("review.commentPlaceholder")}
            className="resize-none min-h-[100px] border-gray-200 focus:border-yens-yellow"
            data-testid="input-comment"
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {comment.length}/500
          </div>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={submitReviewMutation.isPending}
          className="w-full max-w-sm mt-6 bg-yens-yellow text-yens-blue font-semibold py-6 border-yens-yellow-border"
          data-testid="button-submit-review"
        >
          {submitReviewMutation.isPending ? t("common.loading") : t("common.submit")}
        </Button>
      </div>
    </div>
  );
}
