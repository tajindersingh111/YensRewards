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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send" data-testid="subtab-send" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{t('messages.send')}</span>
            <span className="sm:hidden">{t('messages.send')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="subtab-history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">{t('messages.history')}</span>
            <span className="sm:hidden">{t('messages.history')}</span>
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="subtab-templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">{t('messages.templates')}</span>
            <span className="sm:hidden">{t('messages.templates')}</span>
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
