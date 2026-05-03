/* LEF'S PREMIER YENS MARKETING COMMAND CENTER UPDATE */
/* Changes: Yens Blue branding, Refined Navigation, and Premium Header Layout */

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SendMessageForm from "./SendMessageForm";
import MessageHistory from "./MessageHistory";
import MessageTemplates from "./MessageTemplates";
import { Send, History, FileText, MessageSquare, Megaphone } from "lucide-react";

export default function MessagesPage() {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState("send");

  return (
    <div className="space-y-6">
      {/* Premium Header Branding */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-[#FCD34D] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-900 flex items-center justify-center shadow-lg shrink-0">
            <Megaphone className="w-6 h-6 text-[#FCD34D]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">
              {t('messages.title', 'Marketing Hub')}
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {t('messages.subtitle', 'Campaign Commander & Customer Engagement')}
            </p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
           <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-black text-blue-900 uppercase">System Ready</span>
           </div>
        </div>
      </div>

      {/* Campaign Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="h-auto p-1 bg-white border border-slate-200 rounded-xl w-full md:w-auto justify-start gap-1 mb-6 shadow-sm">
          <TabsTrigger
            value="send"
            data-testid="subtab-send"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase rounded-lg transition-all data-[state=active]:bg-blue-900 data-[state=active]:text-white text-slate-400"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('messages.send', 'New Blast')}</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="history"
            data-testid="subtab-history"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase rounded-lg transition-all data-[state=active]:bg-blue-900 data-[state=active]:text-white text-slate-400"
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('messages.history', 'Analytics')}</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="templates"
            data-testid="subtab-templates"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase rounded-lg transition-all data-[state=active]:bg-blue-900 data-[state=active]:text-white text-slate-400"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('messages.templates', 'Pre-Sets')}</span>
          </TabsTrigger>
        </TabsList>

        <div className="transition-all duration-300">
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
