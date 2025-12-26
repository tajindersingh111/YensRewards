import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SendMessageForm from "./SendMessageForm";
import MessageHistory from "./MessageHistory";
import MessageTemplates from "./MessageTemplates";
import { Send, History, FileText } from "lucide-react";

export default function MessagesPage() {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState("send");

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-1 bg-transparent p-0">
          <TabsTrigger 
            value="send" 
            data-testid="subtab-send" 
            className="flex items-center justify-center gap-1 text-xs sm:text-sm bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-2 sm:px-3 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t('messages.send')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            data-testid="subtab-history" 
            className="flex items-center justify-center gap-1 text-xs sm:text-sm bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-2 sm:px-3 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t('messages.history')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            data-testid="subtab-templates" 
            className="flex items-center justify-center gap-1 text-xs sm:text-sm bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-2 sm:px-3 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t('messages.templates')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4">
          <SendMessageForm />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <MessageHistory />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <MessageTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
