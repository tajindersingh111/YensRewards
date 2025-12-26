import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Plus, Edit2, Trash2, Eye, Star, Sparkles, Upload, Image, Layout, Loader2, X } from "lucide-react";
import { insertMessageTemplateSchema, type MessageTemplate, type InsertMessageTemplate } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type EmailAsset = {
  name: string;
  url: string;
  size: number;
  created: string;
};

const EMAIL_SNIPPETS = [
  {
    id: 'hero_banner',
    name: 'Hero Banner',
    nameTh: 'แบนเนอร์หลัก',
    icon: Layout,
    html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="background: linear-gradient(135deg, #FCD34D 0%, #FBBF24 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
      <img src="{{heroImageUrl}}" alt="Yens Thai Ice Cream" style="max-width: 100%; height: auto; border-radius: 8px;">
      <h1 style="color: #1E40AF; font-size: 28px; font-weight: 700; margin: 20px 0 10px 0; font-family: 'Sarabun', Arial, sans-serif;">{{headline}}</h1>
      <p style="color: #1E40AF; font-size: 16px; margin: 0; opacity: 0.9;">{{subheadline}}</p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'cta_button',
    name: 'Call-to-Action Button',
    nameTh: 'ปุ่มเรียกร้อง',
    icon: Layout,
    html: `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 25px auto;">
  <tr>
    <td style="border-radius: 8px; background-color: #1E40AF;">
      <a href="{{buttonUrl}}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px; font-family: 'Sarabun', Arial, sans-serif;">
        {{buttonText}}
      </a>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'product_card',
    name: 'Product Card',
    nameTh: 'การ์ดสินค้า',
    icon: Layout,
    html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FEF3C7; border-radius: 12px; margin: 20px 0;">
  <tr>
    <td style="padding: 25px; text-align: center;">
      <img src="{{productImageUrl}}" alt="{{productName}}" style="max-width: 200px; height: auto; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="color: #1E40AF; font-size: 20px; margin: 0 0 10px 0; font-family: 'Sarabun', Arial, sans-serif;">{{productName}}</h3>
      <p style="color: #666666; font-size: 14px; margin: 0;">{{productDescription}}</p>
      <p style="color: #1E40AF; font-size: 24px; font-weight: 700; margin: 15px 0 0 0;">฿{{productPrice}}</p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'points_box',
    name: 'Points Balance Box',
    nameTh: 'กล่องคะแนนสะสม',
    icon: Layout,
    html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FEF3C7; border-radius: 12px; margin: 20px 0;">
  <tr>
    <td style="padding: 25px; text-align: center;">
      <p style="color: #666666; font-size: 14px; margin: 0;">คะแนนสะสมปัจจุบัน</p>
      <p style="color: #1E40AF; font-size: 42px; font-weight: 700; margin: 10px 0;">{{points}}</p>
      <p style="color: #666666; font-size: 16px; margin: 0;">คะแนน</p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'birthday_gift',
    name: 'Birthday Gift Box',
    nameTh: 'กล่องของขวัญวันเกิด',
    icon: Layout,
    html: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px; margin: 20px 0;">
  <tr>
    <td style="padding: 30px; text-align: center;">
      <div style="width: 64px; height: 64px; margin: 0 auto 15px; background-color: #FCD34D; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>
      </div>
      <h3 style="color: #1E40AF; font-size: 20px; margin: 0 0 10px 0; font-family: 'Sarabun', Arial, sans-serif;">ของขวัญวันเกิดของคุณ</h3>
      <p style="color: #333333; font-size: 18px; font-weight: 600; margin: 0;">{{giftDescription}}</p>
      <p style="color: #666666; font-size: 14px; margin: 15px 0 0 0;">ใช้ได้ภายใน 7 วันนับจากวันเกิด</p>
    </td>
  </tr>
</table>`,
  },
];

export default function MessageTemplates() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState({
    name: "John Doe",
    tier: "gold",
    points: "150",
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isAssetGalleryOpen, setIsAssetGalleryOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [emailEditorTab, setEmailEditorTab] = useState("content");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isThaiLanguage = i18n.language === 'th';

  const form = useForm<InsertMessageTemplate>({
    resolver: zodResolver(insertMessageTemplateSchema),
    defaultValues: {
      name: "",
      type: "birthday",
      channel: "sms",
      subject: "",
      message: "",
      isDefault: false,
    },
  });

  const { data: emailAssets = [] } = useQuery<EmailAsset[]>({
    queryKey: ['/api/admin/email-assets'],
  });

  const { data: templates = [], isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ['/api/admin/message-templates'],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: InsertMessageTemplate) => {
      return await apiRequest('POST', '/api/admin/message-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/message-templates'] });
      toast({
        title: t('admin.messages.success'),
        description: t('admin.messages.templateCreated'),
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t('admin.messages.error'),
        description: error.message || t('admin.messages.createFailed'),
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMessageTemplate> }) => {
      return await apiRequest('PATCH', `/api/admin/message-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/message-templates'] });
      toast({
        title: t('admin.messages.success'),
        description: t('admin.messages.templateUpdated'),
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t('admin.messages.error'),
        description: error.message || t('admin.messages.updateFailed'),
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/message-templates/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/message-templates'] });
      toast({
        title: t('admin.messages.success'),
        description: t('admin.messages.templateDeleted'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.messages.error'),
        description: error.message || t('admin.messages.deleteFailed'),
        variant: "destructive",
      });
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/message-templates/seed-defaults', {});
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/message-templates'] });
      toast({
        title: "Default Templates Created!",
        description: `Created ${result.created} birthday message templates (Thai & English)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.messages.error'),
        description: error.message || "Failed to create default templates",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast({
        title: isThaiLanguage ? "ไฟล์ใหญ่เกินไป" : "File too large",
        description: isThaiLanguage ? "กรุณาใช้ไฟล์ขนาดไม่เกิน 1MB" : "Please use a file smaller than 1MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
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
      
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}${assetPath}`;
      const imgTag = `<img src="${fullUrl}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 8px;">`;
      setHtmlContent(prev => prev + '\n' + imgTag);

      toast({
        title: isThaiLanguage ? "อัพโหลดสำเร็จ" : "Upload successful",
        description: isThaiLanguage ? "รูปภาพถูกเพิ่มลงในเทมเพลต" : "Image added to template",
      });
    } catch (error: any) {
      toast({
        title: isThaiLanguage ? "อัพโหลดล้มเหลว" : "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const insertSnippet = (snippet: typeof EMAIL_SNIPPETS[0]) => {
    setHtmlContent(prev => prev + '\n' + snippet.html);
    toast({
      title: isThaiLanguage ? "เพิ่มสำเร็จ" : "Added successfully",
      description: isThaiLanguage ? `เพิ่ม ${snippet.nameTh} แล้ว` : `Added ${snippet.name}`,
    });
  };

  const insertAssetImage = (asset: EmailAsset) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${asset.url}`;
    const imgTag = `<img src="${fullUrl}" alt="${asset.name}" style="max-width: 100%; height: auto; border-radius: 8px;">`;
    setHtmlContent(prev => prev + '\n' + imgTag);
    setIsAssetGalleryOpen(false);
    toast({
      title: isThaiLanguage ? "เพิ่มรูปภาพแล้ว" : "Image inserted",
    });
  };

  const resetForm = () => {
    form.reset({
      name: "",
      type: "birthday",
      channel: "sms",
      subject: "",
      message: "",
      isDefault: false,
    });
    setIsCreating(false);
    setEditingTemplate(null);
    setHtmlContent("");
    setEmailEditorTab("content");
  };

  const handleEdit = (template: MessageTemplate) => {
    form.reset({
      name: template.name,
      type: template.type,
      channel: template.channel,
      subject: template.subject || "",
      message: template.message,
      isDefault: template.isDefault,
    });
    setEditingTemplate(template);
    setIsCreating(true);
    setHtmlContent(template.htmlContent || "");
  };

  const onSubmit = (data: InsertMessageTemplate) => {
    const submitData = {
      ...data,
      htmlContent: (data.channel === 'email' || data.channel === 'both') ? htmlContent : undefined,
    };
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: submitData });
    } else {
      createTemplateMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t('admin.messages.deleteConfirm'))) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const getPreviewMessage = () => {
    const message = form.watch("message");
    return message
      .replace(/{name}/g, previewData.name)
      .replace(/{tier}/g, previewData.tier)
      .replace(/{points}/g, previewData.points);
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('admin.messages.templates')}</h2>
          <p className="text-muted-foreground">{t('admin.messages.manageTemplates')}</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && !isCreating && (
            <Button 
              onClick={() => seedDefaultsMutation.mutate()}
              variant="outline"
              disabled={seedDefaultsMutation.isPending}
              data-testid="button-seed-defaults"
              className="bg-yellow-50 border-yellow-400 hover:bg-yellow-100"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {seedDefaultsMutation.isPending ? "Creating..." : "Create Default Templates"}
            </Button>
          )}
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)} data-testid="button-create-template">
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.messages.addTemplate')}
            </Button>
          )}
        </div>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTemplate ? t('admin.messages.editTemplate') : t('admin.messages.addNewTemplate')}</CardTitle>
            <CardDescription>
              {t('admin.messages.placeholdersDesc')}
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.messages.templateName')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('admin.messages.templateName')}
                            data-testid="input-template-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.messages.templateType')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="birthday">{t('admin.messages.birthday')}</SelectItem>
                            <SelectItem value="promotion">{t('admin.messages.promotion')}</SelectItem>
                            <SelectItem value="reminder">{t('admin.messages.reminder')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.messages.channel')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template-channel">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sms">{t('admin.messages.sms')}</SelectItem>
                            <SelectItem value="email">{t('admin.messages.email')}</SelectItem>
                            <SelectItem value="line">LINE</SelectItem>
                            <SelectItem value="both">{t('admin.messages.sms')} + {t('admin.messages.email')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(form.watch("channel") === "email" || form.watch("channel") === "both") && (
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('admin.messages.templateSubject')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('admin.messages.templateSubject')}
                            data-testid="input-template-subject"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(form.watch("channel") === "email" || form.watch("channel") === "both") && (
                  <div className="space-y-4 border rounded-lg p-4 bg-yellow-50/50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        {isThaiLanguage ? "เนื้อหา HTML อีเมล (รูปภาพและกราฟิก)" : "Email HTML Content (Images & Graphics)"}
                      </h4>
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          data-testid="input-image-upload"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          data-testid="button-upload-image"
                        >
                          {isUploadingImage ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-1" />
                          )}
                          {isThaiLanguage ? "อัพโหลดรูป" : "Upload Image"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setIsAssetGalleryOpen(true)}
                          data-testid="button-image-gallery"
                        >
                          <Image className="w-4 h-4 mr-1" />
                          {isThaiLanguage ? "เลือกรูป" : "Image Gallery"}
                        </Button>
                      </div>
                    </div>

                    <Tabs value={emailEditorTab} onValueChange={setEmailEditorTab}>
                      <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="content" data-testid="tab-email-content">
                          {isThaiLanguage ? "เนื้อหา" : "Content"}
                        </TabsTrigger>
                        <TabsTrigger value="snippets" data-testid="tab-email-snippets">
                          <Layout className="w-4 h-4 mr-1" />
                          {isThaiLanguage ? "เทมเพลต" : "Snippets"}
                        </TabsTrigger>
                        <TabsTrigger value="preview" data-testid="tab-email-preview">
                          <Eye className="w-4 h-4 mr-1" />
                          {isThaiLanguage ? "ตัวอย่าง" : "Preview"}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="content" className="mt-3">
                        <Textarea
                          value={htmlContent}
                          onChange={(e) => setHtmlContent(e.target.value)}
                          placeholder={isThaiLanguage ? "ใส่ HTML ที่นี่... หรือใช้ปุ่มด้านบนเพื่อเพิ่มรูปภาพและเทมเพลต" : "Enter HTML here... or use the buttons above to add images and snippets"}
                          className="min-h-[200px] font-mono text-sm"
                          data-testid="textarea-html-content"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          {isThaiLanguage 
                            ? "ใช้ตัวแปร: {{customerName}}, {{points}}, {{tier}}" 
                            : "Use variables: {{customerName}}, {{points}}, {{tier}}"}
                        </p>
                      </TabsContent>

                      <TabsContent value="snippets" className="mt-3">
                        <div className="grid grid-cols-2 gap-2">
                          {EMAIL_SNIPPETS.map((snippet) => (
                            <Button
                              key={snippet.id}
                              type="button"
                              variant="outline"
                              className="h-auto py-3 flex flex-col items-start gap-1"
                              onClick={() => insertSnippet(snippet)}
                              data-testid={`button-snippet-${snippet.id}`}
                            >
                              <span className="font-medium text-sm">
                                {isThaiLanguage ? snippet.nameTh : snippet.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {isThaiLanguage ? "คลิกเพื่อเพิ่ม" : "Click to add"}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="preview" className="mt-3">
                        <div className="border rounded-lg p-4 bg-white min-h-[200px]">
                          {htmlContent ? (
                            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                          ) : (
                            <p className="text-muted-foreground text-center py-8">
                              {isThaiLanguage ? "ยังไม่มีเนื้อหา HTML" : "No HTML content yet"}
                            </p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {(form.watch("channel") === "email" || form.watch("channel") === "both") 
                          ? (isThaiLanguage ? "ข้อความ Plain Text (สำรอง)" : "Plain Text Message (Fallback)")
                          : t('admin.messages.templateMessage')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('admin.messages.placeholdersDesc')}
                          rows={4}
                          data-testid="input-template-message"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-is-default"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {t('admin.messages.setDefault')}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4" />
                    <h4 className="font-semibold">{t('admin.csv.preview')}</h4>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{getPreviewMessage()}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Input
                      placeholder={t('admin.messages.customerName')}
                      value={previewData.name}
                      onChange={(e) => setPreviewData({ ...previewData, name: e.target.value })}
                      className="text-xs"
                      data-testid="input-preview-name"
                    />
                    <Select
                      value={previewData.tier}
                      onValueChange={(value) => setPreviewData({ ...previewData, tier: value })}
                    >
                      <SelectTrigger className="text-xs" data-testid="select-preview-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">{t('common.tiers.bronze')}</SelectItem>
                        <SelectItem value="silver">{t('common.tiers.silver')}</SelectItem>
                        <SelectItem value="gold">{t('common.tiers.gold')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={t('admin.messages.customerPoints')}
                      value={previewData.points}
                      onChange={(e) => setPreviewData({ ...previewData, points: e.target.value })}
                      className="text-xs"
                      data-testid="input-preview-points"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  data-testid="button-save-template"
                >
                  {editingTemplate ? t('admin.messages.update') : t('admin.messages.create')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  data-testid="button-cancel-template"
                >
                  {t('admin.messages.cancel')}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id} data-testid={`template-card-${template.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    {template.isDefault && (
                      <Badge variant="default" className="bg-[#FCD34D] text-gray-900">
                        <Star className="w-3 h-3 mr-1" />
                        {t('admin.messages.defaultTemplate')}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span className="capitalize">{t(`messages.${template.type}`)}</span>
                    <span>•</span>
                    <Badge variant="outline" className="capitalize">{t(`messages.${template.channel}`)}</Badge>
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(template)}
                    data-testid={`button-edit-${template.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(template.id)}
                    disabled={template.isDefault}
                    data-testid={`button-delete-${template.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {template.subject && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{t('admin.messages.templateSubject')}:</p>
                  <p className="text-sm">{template.subject}</p>
                </div>
              )}
              <div>
                {template.subject && <p className="text-xs font-semibold text-muted-foreground">{t('admin.messages.templateMessage')}:</p>}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {template.message}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && !isCreating && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">{t('admin.messages.noTemplates')}</p>
            <Button onClick={() => setIsCreating(true)} data-testid="button-create-first-template">
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.messages.addTemplate')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isAssetGalleryOpen} onOpenChange={setIsAssetGalleryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              {isThaiLanguage ? "คลังรูปภาพ" : "Image Gallery"}
            </DialogTitle>
            <DialogDescription>
              {isThaiLanguage ? "เลือกรูปภาพที่อัพโหลดแล้วเพื่อใส่ในอีเมล" : "Select an uploaded image to insert into your email"}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[300px]">
            {emailAssets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isThaiLanguage ? "ยังไม่มีรูปภาพ" : "No images yet"}</p>
                <p className="text-sm">{isThaiLanguage ? "อัพโหลดรูปภาพเพื่อเริ่มต้น" : "Upload images to get started"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 p-2">
                {emailAssets.map((asset) => (
                  <button
                    key={asset.url}
                    type="button"
                    className="aspect-square border rounded-lg overflow-hidden hover-elevate cursor-pointer"
                    onClick={() => insertAssetImage(asset)}
                    data-testid={`button-select-asset-${asset.name}`}
                  >
                    <img 
                      src={asset.url} 
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssetGalleryOpen(false)}>
              {isThaiLanguage ? "ปิด" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
