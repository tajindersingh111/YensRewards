import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import SendMessageForm from "./SendMessageForm";
import MessageHistory from "./MessageHistory";
import MessageTemplates from "./MessageTemplates";
import { Send, History, FileText, MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState("send");

  return (
    <div className="space-y-0">
      <div className="pb-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              {t('messages.title', 'Messages')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('messages.subtitle', 'Send, manage and track customer communications')}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="h-auto p-0 bg-transparent border-b rounded-none w-full justify-start gap-0 mb-6">
          <TabsTrigger
            value="send"
            data-testid="subtab-send"
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('messages.send')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="history"
            data-testid="subtab-history"
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('messages.history')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            data-testid="subtab-templates"
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('messages.templates')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-0">
          <SendMessageForm />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <MessageHistory />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <MessageTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
