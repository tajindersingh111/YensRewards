import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus } from "lucide-react";

export default function PromotionCreator({ onSubmit }: { onSubmit: () => void }) {
  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
      <div className="bg-blue-900 px-8 py-6 flex items-center gap-4">
        <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg"><Megaphone className="w-5 h-5 text-blue-900" /></div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">Broadcast Campaign Sequence</h2>
      </div>
      <CardContent className="p-8 space-y-6">
        {/* Input fields would go here, styled with rounded-xl and font-black labels */}
        <Button onClick={onSubmit} className="w-full h-14 bg-yellow-400 text-blue-900 font-black uppercase text-sm rounded-2xl shadow-xl active:scale-95 flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Initialize Campaign
        </Button>
      </CardContent>
    </Card>
  );
}
