import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Send, Mail, MessageSquare, Users, Search, MessageCircle, Loader2, AlertCircle, CheckCircle2, Cake, FileText, Eye, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lineUid: string | null;
  tier: string;
  birthday?: string | null;
};

type MessageTemplate = {
  id: string;
  name: string;
  subject: string | null;
  message: string;
  type: string;
  channel: string;
  isDefault?: boolean;
  htmlContent?: string | null;
};

const MERGE_FIELDS = [
  { key: '{{customerName}}', label: 'Customer Name', thLabel: 'ชื่อลูกค้า' },
  { key: '{{customerPhone}}', label: 'Phone Number', thLabel: 'เบอร์โทรศัพท์' },
  { key: '{{customerEmail}}', label: 'Email', thLabel: 'อีเมล' },
  { key: '{{customerTier}}', label: 'Tier', thLabel: 'ระดับสมาชิก' },
  { key: '{{customerPoints}}', label: 'Points', thLabel: 'คะแนนสะสม' },
  { key: '{{customerBirthday}}', label: 'Birthday', thLabel: 'วันเกิด' },
];

export default function SendMessageForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [channel, setChannel] = useState<"sms" | "email" | "app" | "line">("app");
  const [recipientType, setRecipientType] = useState<"all" | "tier" | "individual" | "birthday_today" | "birthday_week">("all");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  // LINE-specific state
  const [lineRecipientType, setLineRecipientType] = useState<"all" | "tier" | "individual" | "birthday_today" | "birthday_week">("all");
  const [lineSelectedTier, setLineSelectedTier] = useState<string>("");
  const [lineMessage, setLineMessage] = useState("");
  const [lineSelectedCustomers, setLineSelectedCustomers] = useState<string[]>([]);

  // Fetch customers for individual selection
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers'],
    enabled: recipientType === "individual",
  });

  // Fetch birthday customers (today)
  const { data: birthdayTodayCustomers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/birthdays?filter=today'],
    enabled: recipientType === "birthday_today" || lineRecipientType === "birthday_today",
  });

  // Fetch birthday customers (this week)
  const { data: birthdayWeekCustomers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/birthdays?filter=week'],
    enabled: recipientType === "birthday_week" || lineRecipientType === "birthday_week",
  });

  // Fetch all customers for LINE (need lineUid)
  const { data: allCustomers = [], isLoading: loadingAllCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/all'],
    enabled: channel === "line",
  });

  // Fetch email templates from database
  const { data: emailTemplates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ['/api/admin/message-templates/channel/email'],
    enabled: channel === "email",
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

  // Send LINE message mutation
  const sendLineMessage = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/messages/send-line', data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      toast({
        title: "LINE Messages Sent! 📱",
        description: `Successfully sent ${result.sent || 0} messages. Failed: ${result.failed || 0}`,
      });
      setLineMessage("");
      setLineSelectedCustomers([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send LINE Messages",
        description: error.message || "An error occurred",
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

  const renderMessageForm = () => (
    <div className="space-y-6">
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
            <SelectItem value="birthday_today">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-500" />
                {t('messages.birthdayToday')}
              </div>
            </SelectItem>
            <SelectItem value="birthday_week">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-orange-500" />
                {t('messages.birthdayThisWeek')}
              </div>
            </SelectItem>
            <SelectItem value="individual">{t('messages.selectIndividual')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Birthday Customer Info */}
      {recipientType === "birthday_today" && (
        <Alert className="border-pink-200 bg-pink-50">
          <Cake className="h-4 w-4 text-pink-600" />
          <AlertDescription className="text-pink-900">
            <strong>{birthdayTodayCustomers.length}</strong> {birthdayTodayCustomers.length === 1 ? 'customer has' : 'customers have'} a birthday today
            {birthdayTodayCustomers.length > 0 && (
              <span className="block text-sm mt-1">
                {birthdayTodayCustomers.slice(0, 3).map(c => c.name).join(', ')}
                {birthdayTodayCustomers.length > 3 && ` +${birthdayTodayCustomers.length - 3} more`}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {recipientType === "birthday_week" && (
        <Alert className="border-orange-200 bg-orange-50">
          <Cake className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>{birthdayWeekCustomers.length}</strong> {birthdayWeekCustomers.length === 1 ? 'customer has' : 'customers have'} a birthday this week
            {birthdayWeekCustomers.length > 0 && (
              <span className="block text-sm mt-1">
                {birthdayWeekCustomers.slice(0, 3).map(c => c.name).join(', ')}
                {birthdayWeekCustomers.length > 3 && ` +${birthdayWeekCustomers.length - 3} more`}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

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

      {/* Email Template Selector (for email channel) */}
      {channel === "email" && (
        <div className="space-y-2">
          <Label>{t('messages.useTemplate')}</Label>
          <Select 
            value={selectedTemplate} 
            onValueChange={(val) => {
              setSelectedTemplate(val);
              if (val && val !== "none") {
                const template = emailTemplates.find(t => t.id === val);
                if (template) {
                  setSubject(template.subject || '');
                  // Use message if available, otherwise use htmlContent (for rich HTML templates)
                  const messageContent = template.message || template.htmlContent || '';
                  setMessage(messageContent);
                  // Auto-switch to preview mode if HTML content
                  if (messageContent.includes('<') || messageContent.includes('html')) {
                    setShowPreview(true);
                  }
                }
              } else {
                setShowPreview(false);
              }
            }}
          >
            <SelectTrigger data-testid="select-email-template">
              <SelectValue placeholder={t('messages.selectTemplate')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('messages.noTemplate')}
                </div>
              </SelectItem>
              {emailTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    {template.type === 'birthday' && <Cake className="w-4 h-4 text-pink-500" />}
                    {template.type === 'welcome' && <Users className="w-4 h-4 text-green-500" />}
                    {template.type === 'promotion' && <Mail className="w-4 h-4 text-blue-500" />}
                    {template.type === 'line_invite' && <MessageCircle className="w-4 h-4 text-green-600" />}
                    {template.type === 'points_update' && <CheckCircle2 className="w-4 h-4 text-yellow-500" />}
                    {template.type === 'custom' && <FileText className="w-4 h-4 text-gray-500" />}
                    {template.name}
                    {template.isDefault && <Badge variant="outline" className="ml-2 text-xs">Default</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="message">{t('messages.message')}</Label>
          <div className="flex items-center gap-2">
            {/* Preview Toggle for HTML content */}
            {channel === "email" && message && (message.includes('<') || message.includes('html')) && (
              <Button
                type="button"
                variant={showPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-7 text-xs"
                data-testid="button-toggle-preview"
              >
                {showPreview ? (
                  <>
                    <Code className="w-3 h-3 mr-1" />
                    Edit HTML
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </>
                )}
              </Button>
            )}
            {/* Merge Fields Helper */}
            {!showPreview && (
              <Select 
                value="" 
                onValueChange={(val) => {
                  if (val) {
                    setMessage(prev => prev + val);
                  }
                }}
              >
                <SelectTrigger className="w-auto h-7 text-xs" data-testid="select-merge-field">
                  <span className="text-muted-foreground">{t('messages.insertMergeField')}</span>
                </SelectTrigger>
                <SelectContent>
                  {MERGE_FIELDS.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{field.thLabel}</span>
                        <code className="text-xs bg-muted px-1 rounded">{field.key}</code>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        
        {/* Show either Preview or Edit mode */}
        {showPreview && channel === "email" ? (
          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 border-b flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Email Preview</span>
            </div>
            <div 
              className="p-4 bg-white max-h-[400px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: message }}
            />
          </div>
        ) : (
          <Textarea
            id="message"
            placeholder={t('messages.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            data-testid="textarea-message"
          />
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('messages.charactersCount', { count: message.length })}</span>
          <span className="text-muted-foreground">{t('messages.mergeFieldsHint')}</span>
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
    </div>
  );

  const customersWithLine = allCustomers.filter(c => c.lineUid);
  const availableTiers = Array.from(new Set(customersWithLine.map(c => c.tier))).sort();

  const handleLineSend = () => {
    if (!lineMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (lineRecipientType === "individual" && lineSelectedCustomers.length === 0) {
      toast({
        title: "No Customers Selected",
        description: "Please select at least one customer",
        variant: "destructive",
      });
      return;
    }

    const data: any = {
      recipientType: lineRecipientType,
      message: lineMessage.trim(),
    };

    if (lineRecipientType === "tier" && lineSelectedTier) {
      data.tier = lineSelectedTier;
    } else if (lineRecipientType === "individual") {
      data.customerIds = lineSelectedCustomers;
    }

    sendLineMessage.mutate(data);
  };

  const filteredLineCustomers = allCustomers.filter(c => {
    if (!c.lineUid) return false;
    if (lineRecipientType === "tier" && lineSelectedTier) {
      return c.tier === lineSelectedTier;
    }
    return true;
  });

  const renderLineForm = () => (
    <div className="space-y-4">
      {customersWithLine.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>No customers with LINE accounts.</strong> Customers need to follow your LINE Official Account first.
          </AlertDescription>
        </Alert>
      )}

      {customersWithLine.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>{customersWithLine.length} customers</strong> have connected their LINE accounts
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>{t('messages.recipients')}</Label>
        <Select value={lineRecipientType} onValueChange={(v: any) => setLineRecipientType(v)}>
          <SelectTrigger data-testid="select-line-recipient-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('messages.allCustomers')} ({customersWithLine.length} with LINE)
              </div>
            </SelectItem>
            <SelectItem value="tier">{t('messages.byTier')}</SelectItem>
            <SelectItem value="birthday_today">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-500" />
                {t('messages.birthdayToday')}
              </div>
            </SelectItem>
            <SelectItem value="birthday_week">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-orange-500" />
                {t('messages.birthdayThisWeek')}
              </div>
            </SelectItem>
            <SelectItem value="individual">{t('messages.selectIndividual')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lineRecipientType === "tier" && (
        <div className="space-y-2">
          <Label>Select Tier</Label>
          <Select value={lineSelectedTier} onValueChange={setLineSelectedTier}>
            <SelectTrigger data-testid="select-line-tier">
              <SelectValue placeholder="Choose tier..." />
            </SelectTrigger>
            <SelectContent>
              {availableTiers.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  <Badge variant="outline" className="capitalize">{tier}</Badge> ({customersWithLine.filter(c => c.tier === tier).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {lineRecipientType === "individual" && (
        <div className="space-y-2">
          <Label>Select Customers</Label>
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
            {loadingAllCustomers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredLineCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No customers with LINE accounts found
              </p>
            ) : (
              filteredLineCustomers.map((customer) => (
                <label
                  key={customer.id}
                  className="flex items-center gap-2 p-2 hover-elevate rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={lineSelectedCustomers.includes(customer.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLineSelectedCustomers([...lineSelectedCustomers, customer.id]);
                      } else {
                        setLineSelectedCustomers(lineSelectedCustomers.filter(id => id !== customer.id));
                      }
                    }}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  </div>
                  <Badge variant="outline">{customer.tier}</Badge>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Message (Max 5,000 characters)</Label>
        <Textarea
          placeholder="Type your LINE message here... Much longer than SMS! 🎉"
          value={lineMessage}
          onChange={(e) => setLineMessage(e.target.value)}
          rows={6}
          maxLength={5000}
          data-testid="textarea-line-message"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {lineMessage.length}/5,000 characters
          </span>
          <span className="text-green-600 font-medium">FREE - No cost per message!</span>
        </div>
      </div>

      <Button
        onClick={handleLineSend}
        disabled={sendLineMessage.isPending || !lineMessage.trim()}
        className="w-full"
        size="lg"
        data-testid="button-send-line"
      >
        {sendLineMessage.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending LINE Messages...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send LINE Messages (FREE)
          </>
        )}
      </Button>

      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p className="font-medium">💡 LINE Messaging Benefits:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>✅ <strong>Completely FREE</strong> - No cost per message (vs ฿0.30+ for SMS)</li>
          <li>✅ <strong>5,000 characters</strong> - Much longer than SMS (160 chars)</li>
          <li>✅ <strong>Rich messages</strong> - Send images, stickers, buttons, and more</li>
          <li>✅ <strong>90%+ of Thais use LINE</strong> - Best way to reach Thai customers</li>
        </ul>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          {t('messages.sendMessage')}
        </CardTitle>
        <CardDescription>{t('messages.sendMessageDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={channel} onValueChange={(val: any) => setChannel(val)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="app" 
              data-testid="tab-channel-app" 
              className="flex items-center gap-1.5 bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t('messages.app')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="line" 
              data-testid="tab-channel-line" 
              className="flex items-center gap-1.5 bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              <span>LINE</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sms" 
              data-testid="tab-channel-sms" 
              className="flex items-center gap-1.5 bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t('messages.sms')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="email" 
              data-testid="tab-channel-email" 
              className="flex items-center gap-1.5 bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              <Mail className="w-4 h-4" />
              <span>{t('messages.email')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="app" className="mt-6">
            {renderMessageForm()}
          </TabsContent>

          <TabsContent value="line" className="mt-6">
            {renderLineForm()}
          </TabsContent>

          <TabsContent value="sms" className="mt-6">
            {renderMessageForm()}
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            {renderMessageForm()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
