import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { RefreshCw, Mail, MessageSquare, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { format } from "date-fns";

type MessageStatus = "pending" | "sent" | "failed" | "delivered";
type MessageChannel = "sms" | "email";

interface MessageLog {
  id: string;
  customerId: string;
  customerName?: string;
  templateId: string | null;
  channel: MessageChannel;
  recipient: string;
  subject: string | null;
  message: string;
  status: MessageStatus;
  externalId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

interface MessageStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  smsCount: number;
  emailCount: number;
}

export default function MessageHistory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");

  // Fetch message logs
  const { data: messages = [], isLoading } = useQuery<MessageLog[]>({
    queryKey: ['/api/admin/messages'],
  });

  // Fetch message statistics
  const { data: stats } = useQuery<MessageStats>({
    queryKey: ['/api/admin/messages/stats'],
  });

  // Retry failed message mutation
  const retryMessage = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest('POST', `/api/admin/messages/${messageId}/retry`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      toast({
        title: t('messages.messageRetried'),
        description: t('messages.messageRetriedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('messages.retryFailed'),
        description: error.message || t('messages.retryFailedDesc'),
        variant: "destructive",
      });
    },
  });

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    if (statusFilter !== "all" && msg.status !== statusFilter) return false;
    if (channelFilter !== "all" && msg.channel !== channelFilter) return false;
    if (searchQuery && !msg.recipient.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (messageSearchQuery) {
      const searchLower = messageSearchQuery.toLowerCase();
      const messageMatch = msg.message.toLowerCase().includes(searchLower);
      const subjectMatch = msg.subject?.toLowerCase().includes(searchLower) || false;
      if (!messageMatch && !subjectMatch) return false;
    }
    return true;
  });

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "sent":
        return <Send className="h-4 w-4 text-blue-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: MessageStatus) => {
    const variants: Record<MessageStatus, "default" | "secondary" | "destructive" | "outline"> = {
      delivered: "default",
      sent: "secondary",
      failed: "destructive",
      pending: "outline",
    };
    return (
      <Badge variant={variants[status]} className="flex items-center gap-1" data-testid={`badge-status-${status}`}>
        {getStatusIcon(status)}
        <span className="capitalize">{t(`messages.${status}`)}</span>
      </Badge>
    );
  };

  const getChannelIcon = (channel: MessageChannel) => {
    return channel === "sms" ? (
      <MessageSquare className="h-4 w-4" />
    ) : (
      <Mail className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('messages.totalMessages')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">
              {stats?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('messages.delivered')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-delivered">
              {stats?.delivered || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('messages.failed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-failed">
              {stats?.failed || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('messages.pending')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="stat-pending">
              {stats?.pending || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('messages.smsMessages')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold" data-testid="stat-sms">
                {stats?.smsCount || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('messages.emailMessages')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold" data-testid="stat-email">
                {stats?.emailCount || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('messages.messageHistory')}</CardTitle>
          <CardDescription>{t('messages.viewManageMessages')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder={t('messages.searchByRecipient')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:max-w-xs"
              data-testid="input-search-recipient"
            />
            <Input
              placeholder={t('messages.searchByMessage')}
              value={messageSearchQuery}
              onChange={(e) => setMessageSearchQuery(e.target.value)}
              className="sm:max-w-xs"
              data-testid="input-search-message"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder={t('messages.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('messages.allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('messages.pending')}</SelectItem>
                <SelectItem value="sent">{t('messages.sent')}</SelectItem>
                <SelectItem value="delivered">{t('messages.delivered')}</SelectItem>
                <SelectItem value="failed">{t('messages.failed')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="sm:w-[180px]" data-testid="select-channel-filter">
                <SelectValue placeholder={t('messages.filterByChannel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('messages.allChannels')}</SelectItem>
                <SelectItem value="sms">{t('messages.sms')}</SelectItem>
                <SelectItem value="email">{t('messages.email')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Messages Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('messages.sentAt')}</TableHead>
                  <TableHead>{t('messages.channel')}</TableHead>
                  <TableHead>{t('messages.recipient')}</TableHead>
                  <TableHead>{t('promotions.message')}</TableHead>
                  <TableHead>{t('messages.status')}</TableHead>
                  <TableHead>{t('messages.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('messages.loadingMessages')}
                    </TableCell>
                  </TableRow>
                ) : filteredMessages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('messages.noMessages')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMessages.map((msg) => (
                    <TableRow key={msg.id} data-testid={`row-message-${msg.id}`}>
                      <TableCell className="text-sm">
                        {format(new Date(msg.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {getChannelIcon(msg.channel)}
                          <span className="uppercase">{t(`messages.${msg.channel}`)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{msg.recipient}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {msg.subject && <div className="font-medium text-foreground">{msg.subject}</div>}
                        {msg.message}
                      </TableCell>
                      <TableCell>{getStatusBadge(msg.status)}</TableCell>
                      <TableCell>
                        {msg.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryMessage.mutate(msg.id)}
                            disabled={retryMessage.isPending}
                            data-testid={`button-retry-${msg.id}`}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            {t('messages.retry')}
                          </Button>
                        )}
                        {msg.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">{msg.errorMessage}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
