import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SendMessageForm from "./SendMessageForm";
import MessageHistory from "./MessageHistory";
import { Send, History } from "lucide-react";

export default function MessagesPage() {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState("send");

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="send" 
            data-testid="subtab-send" 
            className="flex items-center gap-1.5 text-sm bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{t('messages.send')}</span>
            <span className="sm:hidden">{t('messages.send')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            data-testid="subtab-history" 
            className="flex items-center gap-1.5 text-sm bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{t('messages.history')}</span>
            <span className="sm:hidden">{t('messages.history')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4">
          <SendMessageForm />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <MessageHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
