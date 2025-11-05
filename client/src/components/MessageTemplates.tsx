import { useState } from "react";
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
import { Plus, Edit2, Trash2, Eye, Star } from "lucide-react";
import { insertMessageTemplateSchema, type MessageTemplate, type InsertMessageTemplate } from "@shared/schema";

export default function MessageTemplates() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState({
    name: "John Doe",
    tier: "gold",
    points: "150",
  });

  const form = useForm<InsertMessageTemplate>({
    resolver: zodResolver(insertMessageTemplateSchema),
    defaultValues: {
      name: "",
      type: "birthday",
      message: "",
      isDefault: false,
    },
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
        title: "Template Created",
        description: "Message template created successfully",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
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
        title: "Template Updated",
        description: "Message template updated successfully",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
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
        title: "Template Deleted",
        description: "Message template deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset({
      name: "",
      type: "birthday",
      message: "",
      isDefault: false,
    });
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleEdit = (template: MessageTemplate) => {
    form.reset({
      name: template.name,
      type: template.type,
      message: template.message,
      isDefault: template.isDefault,
    });
    setEditingTemplate(template);
    setIsCreating(true);
  };

  const onSubmit = (data: InsertMessageTemplate) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
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
    return <div className="text-center py-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Message Templates</h2>
          <p className="text-muted-foreground">Create and manage message templates for birthday greetings and promotions</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} data-testid="button-create-template">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</CardTitle>
            <CardDescription>
              Use placeholders: {"{name}"}, {"{tier}"}, {"{points}"}
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Birthday Greeting"
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
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="birthday">Birthday</SelectItem>
                            <SelectItem value="promotion">Promotion</SelectItem>
                            <SelectItem value="reminder">Reminder</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your message. Use {name}, {tier}, {points} as placeholders."
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
                          Set as default template for this type
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4" />
                    <h4 className="font-semibold">Preview</h4>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{getPreviewMessage()}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Preview Name"
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
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Points"
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
                  {editingTemplate ? "Update" : "Create"} Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  data-testid="button-cancel-template"
                >
                  Cancel
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
                        Default
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="capitalize">{template.type}</CardDescription>
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
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {template.message}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && !isCreating && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No message templates yet</p>
            <Button onClick={() => setIsCreating(true)} data-testid="button-create-first-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
