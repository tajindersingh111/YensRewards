/* LEF'S PREMIER YENS CAMPAIGN ANALYTICS UPDATE */
/* Changes: Yens Blue branding, Refined KPI Summary, and Senior Staff Audit Layout */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { RefreshCw, Mail, MessageSquare, CheckCircle, XCircle, Clock, Send, Eye, Calendar, Cake, Activity, Smartphone, Search } from "lucide-react";
import { SiLine } from "react-icons/si";
import { format } from "date-fns";

export default function MessageHistory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/messages'],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/admin/messages/stats'],
  });

  const filteredMessages = messages.filter((msg) => {
    if (statusFilter !== "all" && msg.status !== statusFilter) return false;
    if (channelFilter !== "all" && msg.channel !== channelFilter) return false;
    if (searchQuery && !msg.recipient.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
      sent: "bg-blue-50 text-blue-700 border-blue-200",
      failed: "bg-red-50 text-red-700 border-red-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return (
      <Badge variant="outline" className={`${colors[status] || 'bg-slate-50'} font-black px-2 py-0.5 rounded-lg text-[9px] uppercase border`}>
        {status}
      </Badge>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "sms":   return <MessageSquare className="h-3.5 w-3.5 text-blue-600" />;
      case "email": return <Mail className="h-3.5 w-3.5 text-purple-600" />;
      case "line":  return <SiLine className="h-3.5 w-3.5 text-green-500" />;
      case "app":   return <Smartphone className="h-3.5 w-3.5 text-orange-500" />;
      default:      return <Send className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-900 text-white rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Activity className="w-12 h-12" /></div>
          <CardContent className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Today's Traffic</p>
            <h3 className="text-3xl font-black mt-1">{stats?.todayTotal || 0}</h3>
            <p className="text-[10px] text-blue-200 font-bold mt-2 uppercase">Messages Dispatched</p>
          </CardContent>
        </Card>

        {[
          { label: "Successful", val: stats?.delivered || 0, color: "text-emerald-600", icon: CheckCircle },
          { label: "Failed",     val: stats?.failed || 0,    color: "text-red-600",     icon: XCircle },
          { label: "Pending",    val: stats?.pending || 0,   color: "text-amber-600",   icon: Clock },
        ].map((item, i) => (
          <Card key={i} className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
              <div className="flex items-center justify-between mt-1">
                <h3 className={`text-2xl font-black ${item.color}`}>{item.val.toLocaleString()}</h3>
                <item.icon className={`h-5 w-5 ${item.color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced Filter Bar */}
      <Card className="border-none shadow-sm bg-white rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search recipient..."
              className="pl-10 h-10 rounded-xl border-slate-100 bg-slate-50 font-bold text-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 rounded-xl border-slate-100 font-bold text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-10 rounded-xl border-slate-100 font-bold text-xs">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="line">LINE</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="app">Mobile App</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* History Log Table */}
      <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time / Event</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Channel</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="py-20 text-center font-bold text-slate-300 uppercase tracking-widest">Updating Logs...</td></tr>
              ) : filteredMessages.map((msg, i) => (
                <tr key={i} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {msg.message.toLowerCase().includes('birthday') && <Cake className="h-3.5 w-3.5 text-pink-500" />}
                      <p className="text-xs font-black text-slate-700">{format(new Date(msg.createdAt), "HH:mm · MMM d")}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(msg.channel)}
                      <span className="text-[10px] font-black uppercase text-slate-500">{msg.channel}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-slate-800">{msg.recipient}</p>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(msg.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedMessage(msg)} className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Message Viewer Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-slate-900 uppercase">Message Dispatch Details</DialogTitle>
            <DialogDescription className="font-bold text-slate-400 uppercase text-[10px]">Audit Log Tracking</DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-6 pt-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Message Content</p>
                <p className="text-sm font-medium text-slate-800 italic leading-relaxed">"{selectedMessage.message}"</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Target Recipient</p>
                  <p className="font-black text-blue-900">{selectedMessage.recipient}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Final Status</p>
                  {getStatusBadge(selectedMessage.status)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
