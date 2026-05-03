/* LEF'S PREMIER YENS MARKETING COMMAND CENTER - FINAL HUB VERSION */
/* Updated with: Full Blue-900 Header, Yellow-400 Icon, and Premium Tab System */

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SendMessageForm from "./SendMessageForm";
import MessageHistory from "./MessageHistory";
import MessageTemplates from "./MessageTemplates";
import { Send, History, FileText, Megaphone } from "lucide-react";

export default function MessagesPage() {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState("send");

  return (
    <div className="space-y-6">
      {/* PREMIER BLUE-900 HEADER BLOCK */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          {/* Yellow Icon Box */}
          <div className="bg-yellow-400 rounded-xl p-3 shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform">
            <Megaphone className="w-6 h-6 text-blue-900" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
              {t('messages.title', 'Marketing Hub')}
            </h1>
            <p className="text-blue-300 text-[11px] font-bold uppercase tracking-[0.15em] mt-2 opacity-90">
              {t('messages.subtitle', 'Campaign Commander & Engagement Engine')}
            </p>
          </div>
        </div>

        {/* System Status HUD */}
        <div className="hidden md:flex gap-2">
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              System Ready
            </span>
          </div>
        </div>
      </div>

      {/* CAMPAIGN NAVIGATION TABS */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="h-auto p-1 bg-white border border-slate-100 rounded-2xl w-full md:w-auto justify-start gap-1 mb-6 shadow-sm">
          <TabsTrigger
            value="send"
            data-testid="subtab-send"
            className="flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all data-[state=active]:bg-blue-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('messages.send', 'New Blast')}</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="history"
            data-testid="subtab-history"
            className="flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all data-[state=active]:bg-blue-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400"
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('messages.history', 'Analytics')}</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="templates"
            data-testid="subtab-templates"
            className="flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all data-[state=active]:bg-blue-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('messages.templates', 'Pre-Sets')}</span>
          </TabsTrigger>
        </TabsList>

        {/* CONTENT SECTIONS */}
        <div className="transition-all duration-500 ease-in-out">
          <TabsContent value="send" className="mt-0 focus-visible:outline-none">
            <SendMessageForm />
          </TabsContent>

          <TabsContent value="history" className="mt-0 focus-visible:outline-none">
            <MessageHistory />
          </TabsContent>

          <TabsContent value="templates" className="mt-0 focus-visible:outline-none">
            <MessageTemplates />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
