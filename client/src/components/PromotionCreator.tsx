import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus } from "lucide-react";

interface Props {
  onSend: (message: string, tier?: string) => void;
}

export default function PromotionCreator({ onSend }: Props) {
  const [campaignName, setCampaignName] = useState("");
  const [pointYield, setPointYield] = useState("");
  const [message, setMessage] = useState("");
  const [tier, setTier] = useState("all");

  const handleSubmit = () => {
    if (!message.trim()) return;
    const fullMessage = campaignName
      ? `[${campaignName}] ${message}`
      : message;
    onSend(fullMessage, tier === "all" ? undefined : tier);
    setCampaignName("");
    setPointYield("");
    setMessage("");
    setTier("all");
  };

  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
      {/* BRANDED HEADER */}
      <div className="bg-blue-900 p-6 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400 opacity-5 rounded-full blur-3xl -mr-12 -mt-12" />
        <div className="bg-yellow-400 rounded-2xl p-4 shadow-lg shrink-0 transform -rotate-3 relative z-10">
          <Megaphone className="w-5 h-5 text-blue-900" />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Broadcast Campaign</h2>
          <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 opacity-80">Dispatch a targeted promotion sequence</p>
        </div>
      </div>

      <CardContent className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
              Campaign Protocol Name
            </Label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Summer Solstice Special"
              className="rounded-xl border-slate-100 bg-slate-50/50 font-bold"
              data-testid="input-campaign-name"
            />
          </div>

          {/* Reward Point Yield */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
              Reward Point Yield
            </Label>
            <Input
              type="number"
              value={pointYield}
              onChange={(e) => setPointYield(e.target.value)}
              placeholder="50"
              className="rounded-xl border-slate-100 bg-slate-50/50 font-black text-blue-900"
              data-testid="input-point-yield"
            />
          </div>
        </div>

        {/* Target Tier */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
            Target Audience
          </Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 font-bold" data-testid="select-target-tier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="bronze">Bronze Tier</SelectItem>
              <SelectItem value="silver">Silver Tier</SelectItem>
              <SelectItem value="gold">Gold Tier</SelectItem>
              <SelectItem value="platinum">Platinum Tier</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Broadcast Message */}
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
            Broadcast Message
          </Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the artisanal experience..."
            className="min-h-[120px] rounded-[1.5rem] border-slate-100 bg-slate-50/50 font-medium"
            data-testid="textarea-promotion-message"
          />
        </div>

        {/* CTA */}
        <Button
          onClick={handleSubmit}
          disabled={!message.trim()}
          className="w-full h-14 bg-yellow-400 text-blue-900 font-black uppercase text-sm rounded-2xl shadow-xl active:scale-95"
          data-testid="button-send-promotion"
        >
          <Plus className="w-5 h-5 mr-2" /> Initialize Campaign
        </Button>
      </CardContent>
    </Card>
  );
}
