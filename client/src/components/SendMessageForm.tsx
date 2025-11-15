import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Send, Mail, MessageSquare, Users, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tier: string;
};

export default function SendMessageForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [channel, setChannel] = useState<"sms" | "email" | "app">("app");
  const [recipientType, setRecipientType] = useState<"all" | "tier" | "individual">("all");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Fetch customers for individual selection
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers'],
    enabled: recipientType === "individual",
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/messages/send', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      toast({
        title: t('messages.messageSent'),
        description: t('messages.messageSentDesc'),
      });
      // Reset form
      setMessage("");
      setSubject("");
      setSelectedCustomers([]);
    },
    onError: (error: Error) => {
      toast({
        title: t('messages.sendFailed'),
        description: error.message || t('messages.sendFailedDesc'),
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim()) {
      toast({
        title: t('common.error'),
        description: t('messages.messageRequired'),
        variant: "destructive",
      });
      return;
    }

    if (channel === "email" && !subject.trim()) {
      toast({
        title: t('common.error'),
        description: t('messages.subjectRequired'),
        variant: "destructive",
      });
      return;
    }

    if (recipientType === "individual" && selectedCustomers.length === 0) {
      toast({
        title: t('common.error'),
        description: t('messages.selectCustomers'),
        variant: "destructive",
      });
      return;
    }

    const data = {
      channel,
      recipientType,
      tier: selectedTier || undefined,
      customerIds: recipientType === "individual" ? selectedCustomers : undefined,
      subject: channel === "email" ? subject : undefined,
      message,
    };

    sendMessage.mutate(data);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          {t('messages.sendMessage')}
        </CardTitle>
        <CardDescription>{t('messages.sendMessageDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channel Selection */}
        <div className="space-y-2">
          <Label>{t('messages.channel')}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={channel === "app" ? "default" : "outline"}
              onClick={() => setChannel("app")}
              className="flex-1"
              data-testid="button-channel-app"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('messages.app')}
            </Button>
            <Button
              type="button"
              variant={channel === "sms" ? "default" : "outline"}
              onClick={() => setChannel("sms")}
              className="flex-1"
              data-testid="button-channel-sms"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('messages.sms')}
            </Button>
            <Button
              type="button"
              variant={channel === "email" ? "default" : "outline"}
              onClick={() => setChannel("email")}
              className="flex-1"
              data-testid="button-channel-email"
            >
              <Mail className="w-4 h-4 mr-2" />
              {t('messages.email')}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Recipient Selection */}
        <div className="space-y-2">
          <Label>{t('messages.recipients')}</Label>
          <Select value={recipientType} onValueChange={(val: any) => setRecipientType(val)}>
            <SelectTrigger data-testid="select-recipient-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('messages.allCustomers')}
                </div>
              </SelectItem>
              <SelectItem value="tier">{t('messages.byTier')}</SelectItem>
              <SelectItem value="individual">{t('messages.selectIndividual')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tier Selection */}
        {recipientType === "tier" && (
          <div className="space-y-2">
            <Label>{t('messages.selectTier')}</Label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger data-testid="select-tier">
                <SelectValue placeholder={t('messages.chooseTier')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bronze">{t('customer.tiers.bronze')}</SelectItem>
                <SelectItem value="silver">{t('customer.tiers.silver')}</SelectItem>
                <SelectItem value="gold">{t('customer.tiers.gold')}</SelectItem>
                <SelectItem value="platinum">{t('customer.tiers.platinum')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Individual Customer Selection */}
        {recipientType === "individual" && (
          <div className="space-y-2">
            <Label>{t('messages.selectCustomers')}</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.overview.searchMember')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-customers"
                />
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('messages.noCustomersFound')}
                  </div>
                ) : (
                  filteredCustomers.slice(0, 50).map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center gap-2 p-3 hover-elevate cursor-pointer border-b last:border-b-0"
                      onClick={() => toggleCustomer(customer.id)}
                      data-testid={`customer-item-${customer.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => {}}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {channel === "email" && customer.email ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-foreground">📧 {customer.email}</span>
                              <span>{customer.phone}</span>
                            </div>
                          ) : channel === "sms" && customer.phone ? (
                            <span>📱 {customer.phone}</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {customer.email && <span>📧 {customer.email}</span>}
                              {customer.phone && <span>📱 {customer.phone}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {customer.tier}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              {selectedCustomers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {t('messages.customersSelected', { count: selectedCustomers.length })}
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Email Subject (if email channel) */}
        {channel === "email" && (
          <div className="space-y-2">
            <Label htmlFor="subject">{t('messages.subject')}</Label>
            <Input
              id="subject"
              placeholder={t('messages.subjectPlaceholder')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-subject"
            />
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-2">
          <Label htmlFor="message">{t('messages.message')}</Label>
          <Textarea
            id="message"
            placeholder={t('messages.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            data-testid="textarea-message"
          />
          <div className="text-xs text-muted-foreground">
            {t('messages.charactersCount', { count: message.length })}
          </div>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={sendMessage.isPending}
          className="w-full"
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendMessage.isPending ? t('messages.sending') : t('messages.sendNow')}
        </Button>
      </CardContent>
    </Card>
  );
}
