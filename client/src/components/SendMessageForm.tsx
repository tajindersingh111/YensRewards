import { useState, useRef, useEffect, useCallback } from "react";
import yensLogoUrl from "@assets/Yens_logo_high_res_1766925576641.png";
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
import { Send, Mail, MessageSquare, Users, Search, MessageCircle, Loader2, AlertCircle, CheckCircle2, Cake, FileText, Eye, Code, Clock, Calendar, X, Upload, BarChart3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

const EMOJI_GROUPS = [
  { label: "Yen's Brand 🐻‍❄️", emojis: ['🐻‍❄️', '🍦', '🧊', '❄️', '🌈', '🐾', '💛', '⭐', '✨', '🎉'] },
  { label: 'Ice Cream & Food', emojis: ['🍧', '🧁', '🍰', '🍫', '🍬', '🥤', '🍵', '☕', '🧇', '🍓'] },
  { label: 'Stars & Celebrate', emojis: ['🌟', '🎊', '🎁', '🏆', '👑', '💎', '🔥', '🎯', '💰', '🥇'] },
  { label: 'Hearts & Smiles', emojis: ['❤️', '💚', '💙', '🧡', '💖', '😊', '😍', '🤩', '🥰', '🙏'] },
  { label: 'Actions & Info', emojis: ['📱', '💬', '📲', '👉', '✅', '🔔', '📣', '🎶', '🛵', '⚡'] },
];

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
  const [recipientType, setRecipientType] = useState<"all" | "tier" | "individual" | "birthday_today" | "birthday_week" | "no_line">("all");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Scheduling state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Send job tracking state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [sendReport, setSendReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/messages/send-job/${jobId}`, { credentials: 'include' });
      if (!res.ok) return;
      const job = await res.json();
      if (job.status === 'completed') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setActiveJobId(null);
        setSendReport(job);
        setShowReport(true);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      }
    } catch (err) {
      // Silently ignore polling errors
    }
  }, []);

  useEffect(() => {
    if (activeJobId) {
      pollingRef.current = setInterval(() => pollJobStatus(activeJobId), 3000);
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
  }, [activeJobId, pollJobStatus]);

  // LINE-specific state
  const [lineRecipientType, setLineRecipientType] = useState<"all" | "tier" | "individual" | "birthday_today" | "birthday_week">("all");
  const [lineSelectedTier, setLineSelectedTier] = useState<string>("");
  const [lineMessage, setLineMessage] = useState("");
  const [lineSelectedCustomers, setLineSelectedCustomers] = useState<string[]>([]);
  const [lineImageUrl, setLineImageUrl] = useState("");
  const [isUploadingLineImage, setIsUploadingLineImage] = useState(false);
  const lineImageInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch all customers for LINE tab and no_line filter
  const { data: allCustomers = [], isLoading: loadingAllCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/all'],
    enabled: channel === "line" || recipientType === "no_line",
  });

  const noLineCount = allCustomers.filter(c => !c.lineUid).length;

  // Fetch email templates from database (always get fresh data)
  // Cache-busting version: v3.17.14 - forces new fetch on deployment
  const { data: emailTemplates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ['/api/admin/message-templates/channel/email', 'v3.17.14', Date.now().toString().slice(0, -4)],
    enabled: channel === "email",
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      // Add cache-buster parameters to URL to bypass any CDN/browser caching
      // Use credentials: 'include' to maintain auth session
      const response = await fetch(`/api/admin/message-templates/channel/email?v=3.17.14&t=${Date.now()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  // Schedule message mutation
  const scheduleMessage = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/messages/schedule', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scheduled-messages'] });
      toast({
        title: t('messages.messageScheduled'),
        description: t('messages.messageScheduledDesc'),
      });
      setMessage("");
      setSubject("");
      setSelectedCustomers([]);
      setSelectedTemplate("");
      setShowPreview(false);
      setScheduleEnabled(false);
      setScheduleDate("");
      setScheduleTime("");
    },
    onError: (error: Error) => {
      toast({
        title: t('messages.scheduleFailed'),
        description: error.message || t('messages.scheduleFailedDesc'),
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/messages/send', data);
      return await res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      const totalCount = result?.total || 0;
      const isProcessing = result?.processing === true;
      if (isProcessing && result?.jobId) {
        setActiveJobId(result.jobId);
        toast({
          title: t('messages.messageSent'),
          description: `Sending ${totalCount} messages... You'll see a report when complete.`,
        });
      } else {
        const sentCount = result?.sent || 0;
        const failedCount = result?.failed || 0;
        const description = failedCount > 0 
          ? t('messages.messageSentCountWithFailed', { sent: sentCount, total: totalCount, failed: failedCount })
          : t('messages.messageSentCount', { sent: sentCount, total: totalCount });
        toast({
          title: t('messages.messageSent'),
          description,
        });
      }
      setMessage("");
      setSubject("");
      setSelectedCustomers([]);
      setSelectedTemplate("");
      setShowPreview(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('messages.sendFailed'),
        description: error.message || t('messages.sendFailedDesc'),
        variant: "destructive",
      });
    },
  });

  const handleLineImageUploadSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLineImage(true);
    try {
      const response = await apiRequest('POST', '/api/admin/email-assets/upload-url', {
        filename: file.name
      });
      const result = await response.json() as { uploadURL: string; assetPath: string };
      const { uploadURL, assetPath } = result;

      await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      await apiRequest('POST', '/api/admin/email-assets/set-acl', { assetPath });

      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-assets'] });

      const fullUrl = `${window.location.origin}${assetPath}`;
      setLineImageUrl(fullUrl);
      toast({ title: "Image uploaded" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingLineImage(false);
      if (lineImageInputRef.current) {
        lineImageInputRef.current.value = '';
      }
    }
  };

  // Send LINE message mutation
  const sendLineMessage = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/messages/send-line', data);
      return await res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      if (result?.processing) {
        toast({
          title: "LINE Messages Sending",
          description: result?.message || `Sending ${result?.total || 0} LINE messages in the background.`,
        });
      } else {
        toast({
          title: "LINE Messages Sent",
          description: `Successfully sent ${result?.sent || 0} messages. Failed: ${result?.failed || 0}`,
        });
      }
      setLineMessage("");
      setLineSelectedCustomers([]);
      setLineImageUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send LINE Messages",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const insertEmoji = (emoji: string) => {
    const ta = messageTextareaRef.current;
    if (ta) {
      const start = ta.selectionStart ?? message.length;
      const end = ta.selectionEnd ?? message.length;
      const next = message.slice(0, start) + emoji + message.slice(end);
      setMessage(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    } else {
      setMessage(prev => prev + emoji);
    }
  };

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

    // Handle scheduling
    if (scheduleEnabled) {
      if (!scheduleDate || !scheduleTime) {
        toast({
          title: t('common.error'),
          description: t('messages.scheduleDateTimeRequired'),
          variant: "destructive",
        });
        return;
      }

      // Parse the date and time as Bangkok timezone (UTC+7)
      // Create ISO string with explicit Bangkok offset
      const bangkokOffset = '+07:00';
      const scheduledAtBangkok = `${scheduleDate}T${scheduleTime}:00${bangkokOffset}`;
      const scheduledDate = new Date(scheduledAtBangkok);
      
      // Check if in the future (comparing to now)
      if (scheduledDate <= new Date()) {
        toast({
          title: t('common.error'),
          description: t('messages.scheduleMustBeFuture'),
          variant: "destructive",
        });
        return;
      }

      const scheduleData = {
        channel,
        recipientType,
        recipientTier: selectedTier || undefined,
        recipientIds: recipientType === "individual" ? selectedCustomers : undefined,
        subject: channel === "email" ? subject : undefined,
        message,
        scheduledAt: scheduledDate.toISOString(),
        timezone: 'Asia/Bangkok',
      };

      scheduleMessage.mutate(scheduleData);
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
            <SelectItem value="no_line">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                Not connected to LINE yet
              </div>
            </SelectItem>
            <SelectItem value="individual">{t('messages.selectIndividual')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* LINE Opt-in Campaign Info */}
      {recipientType === "no_line" && (
        <div className="space-y-3">
          <Alert className="border-green-200 bg-green-50">
            <MessageCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>{loadingAllCustomers ? '...' : noLineCount}</strong> customer{noLineCount !== 1 ? 's' : ''} haven't connected LINE yet — perfect audience for an opt-in invite.
            </AlertDescription>
          </Alert>
          <button
            type="button"
            onClick={() => {
              if (channel === 'sms') {
                // English only — Thai unicode SMS is filtered by carriers until sender ID is registered
                setMessage(
                  `Yen's Rewards: Hi {{name}}! Get 50 FREE bonus points - Follow our LINE for exclusive deals & updates: https://line.me/R/ti/p/@752afsdq`
                );
              } else if (channel === 'email') {
                setMessage(
                  `สวัสดี {{name}}\n\nรับ 50 คะแนนโบนัส ฟรี! เพียงกด Follow LINE ของเย็นส์ Thai Ice Cream รับโปรโมชั่นพิเศษสำหรับสมาชิก LINE ก่อนใคร!\n\nติดตามเราได้เลยที่: https://line.me/R/ti/p/@752afsdq\n\nคะแนนสะสมปัจจุบันของคุณ: {{points}} คะแนน\n- ทีมงาน Yen's Thai Ice Cream`
                );
                if (!subject) setSubject("รับ 50 คะแนนโบนัส — ติดตามเราบน LINE ได้เลย!");
              } else {
                // App notification
                setMessage(
                  `สวัสดี {{name}} รับ 50 คะแนนโบนัสฟรี เมื่อ Follow LINE ของเย็นส์! กดลิงก์: https://line.me/R/ti/p/@752afsdq`
                );
              }
            }}
            className="w-full rounded-md border border-green-300 bg-white px-4 py-2.5 text-sm text-green-800 text-left hover-elevate"
            data-testid="button-line-optin-template"
          >
            <span className="font-medium">Use LINE Opt-in Template</span>
            <span className="block text-xs text-green-600 mt-0.5">
              {channel === 'sms'
                ? 'English message — arrives reliably on all Thai networks right now'
                : channel === 'email'
                ? 'Full Thai message with formatting for email'
                : 'Thai message with LINE link for app notification'}
            </span>
          </button>
        </div>
      )}

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
                console.log("🔍 Loading template:", template?.name);
                console.log("📧 Has htmlContent:", template?.htmlContent ? `YES (${template.htmlContent.length} chars)` : "NO");
                console.log("📝 htmlContent preview:", template?.htmlContent?.substring(0, 200));
                if (template) {
                  setSubject(template.subject || '');
                  // For email: prefer htmlContent (rich HTML) over plain text message
                  const messageContent = template.htmlContent || template.message || '';
                  console.log("💬 Setting message content length:", messageContent.length);
                  setMessage(messageContent);
                  // Auto-switch to preview mode if HTML content
                  if (template.htmlContent || messageContent.includes('<') || messageContent.includes('html')) {
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
            {!showPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEmojiPicker(v => !v)}
                className={`h-7 text-sm px-2 ${showEmojiPicker ? 'bg-yellow-50 border-yellow-300' : ''}`}
                data-testid="button-emoji-picker"
                title="Insert emoji"
              >
                🙂
              </Button>
            )}
          </div>
        </div>

        {/* Emoji Picker Panel */}
        {showEmojiPicker && !showPreview && (
          <div className="border rounded-md bg-muted/30 p-3 space-y-3" data-testid="panel-emoji-picker">
            {EMOJI_GROUPS.map((group, idx) => (
              <div key={group.label}>
                {idx === 0 ? (
                  <div className="flex items-center gap-1.5 mb-1">
                    <img src={yensLogoUrl} alt="Yen's" className="w-4 h-4 rounded-full object-cover" />
                    <p className="text-xs font-medium text-amber-700">Yen's Brand</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-1">{group.label}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className={`text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover-elevate active-elevate-2 cursor-pointer ${idx === 0 ? 'bg-amber-50' : ''}`}
                      data-testid={`button-emoji-${emoji}`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Show either Preview or Edit mode */}
        {showPreview && channel === "email" ? (
          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 border-b flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Email Preview</span>
            </div>
            <div 
              className="p-4 bg-white"
              style={{ minHeight: '200px' }}
              dangerouslySetInnerHTML={{ __html: message }}
            />
          </div>
        ) : (
          <Textarea
            id="message"
            ref={messageTextareaRef}
            placeholder={t('messages.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            data-testid="textarea-message"
          />
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {channel === 'sms' ? (
            <span>
              {message.length} chars
              {' · '}
              {(() => {
                const segSize = /[^\u0000-\u007F]/.test(message) ? 70 : 160;
                const multiSeg = segSize === 70 ? 67 : 153;
                const segs = message.length === 0 ? 0 : message.length <= segSize ? 1 : Math.ceil(message.length / multiSeg);
                return `${segs} SMS segment${segs !== 1 ? 's' : ''}`;
              })()}
            </span>
          ) : (
            <span>{t('messages.charactersCount', { count: message.length })}</span>
          )}
          <span className="text-muted-foreground">{t('messages.mergeFieldsHint')}</span>
        </div>
      </div>

      <Separator />

      {/* Schedule Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="schedule-toggle">{t('messages.scheduleMessage')}</Label>
          </div>
          <Switch
            id="schedule-toggle"
            checked={scheduleEnabled}
            onCheckedChange={setScheduleEnabled}
            data-testid="switch-schedule"
          />
        </div>

        {scheduleEnabled && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="schedule-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('messages.scheduleDate')}
              </Label>
              <Input
                id="schedule-date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-schedule-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('messages.scheduleTime')}
              </Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                data-testid="input-schedule-time"
              />
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">
              {t('messages.scheduleTimezone')}
            </div>
          </div>
        )}
      </div>

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={sendMessage.isPending || scheduleMessage.isPending}
        className="w-full"
        data-testid="button-send-message"
      >
        {scheduleEnabled ? (
          <>
            <Clock className="w-4 h-4 mr-2" />
            {scheduleMessage.isPending ? t('messages.scheduling') : t('messages.scheduleNow')}
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            {sendMessage.isPending ? t('messages.sending') : t('messages.sendNow')}
          </>
        )}
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

    if (lineImageUrl.trim()) {
      data.imageUrl = lineImageUrl.trim();
    }

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
        <Label>{t('admin.messages.lineImageOptional') || "LINE Image (Optional)"}</Label>
        <div className="flex gap-2 flex-wrap">
          <input
            ref={lineImageInputRef}
            type="file"
            accept="image/*"
            onChange={handleLineImageUploadSend}
            className="hidden"
            data-testid="input-line-image-upload-send"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => lineImageInputRef.current?.click()}
            disabled={isUploadingLineImage}
            data-testid="button-upload-line-image-send"
          >
            {isUploadingLineImage ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            {isUploadingLineImage ? "Uploading..." : "Upload Image"}
          </Button>
          {lineImageUrl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLineImageUrl("")}
              data-testid="button-clear-line-image-send"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
        <Input
          placeholder="Or paste image URL here..."
          value={lineImageUrl}
          onChange={(e) => setLineImageUrl(e.target.value)}
          data-testid="input-line-image-url-send"
        />
        {lineImageUrl && (
          <div className="border rounded-lg overflow-hidden p-2 bg-muted/30">
            <img 
              src={lineImageUrl} 
              alt="LINE image preview" 
              className="max-h-32 w-auto mx-auto rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t('admin.messages.lineImageDesc') || "Image will be sent before the text message in LINE chat"}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Message (Max 5,000 characters)</Label>
        <Textarea
          placeholder="Type your LINE message here... Much longer than SMS!"
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

      {activeJobId && (
        <div className="border-t border-yellow-200 bg-yellow-50 px-6 py-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
          <span className="text-sm text-yellow-800 font-medium" data-testid="text-sending-progress">
            Sending messages in progress...
          </span>
        </div>
      )}

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-send-report-title">
              <BarChart3 className="w-5 h-5 text-yellow-600" />
              {sendReport?.channel === 'email' ? 'Email' : sendReport?.channel === 'sms' ? 'SMS' : sendReport?.channel === 'line' ? 'LINE' : 'Message'} Send Report
            </DialogTitle>
            <DialogDescription>
              Summary of the mass {sendReport?.channel || 'message'} send
            </DialogDescription>
          </DialogHeader>
          {sendReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-md p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900" data-testid="text-report-total">{sendReport.total}</div>
                  <div className="text-xs text-gray-500">Total Recipients</div>
                </div>
                <div className="bg-green-50 rounded-md p-3 text-center">
                  <div className="text-2xl font-bold text-green-600" data-testid="text-report-sent">{sendReport.sent}</div>
                  <div className="text-xs text-green-700">Sent</div>
                </div>
                <div className="bg-red-50 rounded-md p-3 text-center">
                  <div className="text-2xl font-bold text-red-600" data-testid="text-report-failed">{sendReport.failed}</div>
                  <div className="text-xs text-red-700">Failed</div>
                </div>
                <div className="bg-yellow-50 rounded-md p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600" data-testid="text-report-skipped">{sendReport.skipped + (sendReport.noEmailCount || 0)}</div>
                  <div className="text-xs text-yellow-700">Skipped</div>
                </div>
              </div>

              {(sendReport.sent > 0 || sendReport.failed > 0) && (() => {
                const attempted = sendReport.sent + sendReport.failed;
                const rate = attempted > 0 ? ((sendReport.sent / attempted) * 100).toFixed(1) : '0.0';
                return (
                  <div className={`${sendReport.sent > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-md p-3 flex items-center gap-2`}>
                    {sendReport.sent > 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${sendReport.sent > 0 ? 'text-green-800' : 'text-red-800'}`} data-testid="text-report-success-rate">
                      Success rate: {rate}% ({sendReport.sent} of {attempted} attempted)
                    </span>
                  </div>
                );
              })()}

              {sendReport.errorBreakdown && Object.keys(sendReport.errorBreakdown).length > 0 && (() => {
                const entries = Object.entries(sendReport.errorBreakdown);
                const skipEntries = entries.filter(([k]) => k.includes('Thai number') || k.includes('use LINE'));
                const errorEntries = entries.filter(([k]) => !k.includes('Thai number') && !k.includes('use LINE'));
                return (
                  <div className="space-y-2">
                    {skipEntries.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-yellow-700">Skipped (use LINE for Thai customers):</span>
                        </div>
                        {skipEntries.map(([msg, count]: [string, any]) => (
                          <div key={msg} className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-xs text-yellow-800" data-testid="text-report-skip">
                            <span className="font-medium">{count}x</span> — {msg}
                          </div>
                        ))}
                      </div>
                    )}
                    {errorEntries.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-gray-700">Errors:</span>
                        </div>
                        {errorEntries.map(([error, count]: [string, any]) => (
                          <div key={error} className="bg-red-50 border border-red-100 rounded px-3 py-2 text-xs text-red-700" data-testid="text-report-error">
                            <span className="font-medium">{count}x</span> - {error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {sendReport.completedAt && (
                <div className="text-xs text-gray-400 text-center" data-testid="text-report-time">
                  Completed: {new Date(sendReport.completedAt).toLocaleString()}
                </div>
              )}

              {sendReport.channel === 'sms' &&
                sendReport.errorBreakdown &&
                Object.keys(sendReport.errorBreakdown).some(k => k.includes('Thai number')) && (
                  <Button
                    className="w-full bg-green-500 text-white hover-elevate"
                    onClick={() => {
                      setLineMessage(message);
                      setLineRecipientType("all");
                      setChannel("line");
                      setShowReport(false);
                    }}
                    data-testid="button-switch-to-line"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Reach Thai customers via LINE
                  </Button>
                )}

              <Button
                className="w-full bg-yellow-400 hover-elevate text-gray-900"
                onClick={() => setShowReport(false)}
                data-testid="button-close-report"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
