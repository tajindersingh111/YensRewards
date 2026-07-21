import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Smartphone, Sparkles, Image as ImageIcon, Save, CheckCircle2, Calendar, Link2, Eye, Tag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PromotionBlock {
  id?: string;
  blockIndex: number;
  title: string;
  subtitle: string;
  artworkUrl?: string;
  buttonText: string;
  destinationLink: string;
  badgeText: string;
  startDate?: string;
  endDate?: string;
  status: 'published' | 'draft' | 'inactive';
}

export function CustomerAppPromotions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: promotions = [], isLoading } = useQuery<PromotionBlock[]>({
    queryKey: ['/api/customer-app-promotions?mode=admin'],
  });

  const [blocksState, setBlocksState] = useState<Record<number, Partial<PromotionBlock>>>({});

  const getBlockData = (index: number): PromotionBlock => {
    const existing = promotions.find((p) => p.blockIndex === index);
    const draft = blocksState[index] || {};
    return {
      blockIndex: index,
      title: draft.title ?? existing?.title ?? `Promotional Block #${index}`,
      subtitle: draft.subtitle ?? existing?.subtitle ?? 'Describe the promotional offer or special highlight here.',
      artworkUrl: draft.artworkUrl ?? existing?.artworkUrl ?? '',
      buttonText: draft.buttonText ?? existing?.buttonText ?? 'Explore Now',
      destinationLink: draft.destinationLink ?? existing?.destinationLink ?? '/menu',
      badgeText: draft.badgeText ?? existing?.badgeText ?? (index === 1 ? 'MEMBERSHIP' : index === 2 ? 'SPECIAL' : 'FEATURED'),
      startDate: draft.startDate ?? existing?.startDate ?? '',
      endDate: draft.endDate ?? existing?.endDate ?? '',
      status: (draft.status ?? existing?.status ?? 'published') as 'published' | 'draft' | 'inactive',
    };
  };

  const handleChange = (index: number, field: keyof PromotionBlock, value: any) => {
    setBlocksState((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      },
    }));
  };

  const publishMutation = useMutation({
    mutationFn: async (block: PromotionBlock) => {
      const res = await apiRequest('POST', '/api/admin/customer-app-promotions', block);
      return res.json();
    },
    onSuccess: (data: PromotionBlock) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-app-promotions?mode=admin'] });
      toast({
        title: `Block #${data.blockIndex} Published!`,
        description: `Successfully pushed "${data.title}" directly to the Customer App.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Publish Failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-amber-400 text-slate-900 font-extrabold px-2.5 py-0.5 text-xs">
                EXECUTIVE HUB &gt; MARKETING
              </Badge>
              <Badge variant="outline" className="text-white border-white/30 text-xs">
                CUSTOMER APP SYNC
              </Badge>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-amber-400" />
              Customer App Promotional Banners
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              Design up to three live promotional carousel blocks with custom artwork, copy, CTA buttons, links, and validity dates. Published changes push in real-time to the Yens Customer App.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Promotional Blocks Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((blockNum) => {
          const block = getBlockData(blockNum);
          const isPending = publishMutation.isPending && publishMutation.variables?.blockIndex === blockNum;

          return (
            <Card key={blockNum} className="border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-amber-400 font-black text-xs">
                      #{blockNum}
                    </span>
                    <CardTitle className="text-base font-bold">
                      Block {blockNum}
                    </CardTitle>
                  </div>
                  <Badge
                    variant={block.status === 'published' ? 'default' : block.status === 'draft' ? 'secondary' : 'outline'}
                    className={
                      block.status === 'published'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                        : block.status === 'draft'
                        ? 'bg-amber-500 text-slate-900 font-bold'
                        : 'text-slate-400'
                    }
                  >
                    {block.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4 flex-1">
                {/* Live Mobile Card Preview */}
                <div className="rounded-xl p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-inner relative overflow-hidden border border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded tracking-wider">
                      {block.badgeText || 'PROMOTION'}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-amber-400" /> Preview
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white leading-tight line-clamp-1">
                    {block.title || 'Heading Title'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {block.subtitle || 'Supporting copy description goes here.'}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="bg-amber-400 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-lg">
                      {block.buttonText || 'Explore Now'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {block.destinationLink}
                    </span>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Heading Title
                    </Label>
                    <Input
                      value={block.title}
                      onChange={(e) => handleChange(blockNum, 'title', e.target.value)}
                      placeholder="e.g. Free Size Upgrade"
                      className="text-xs font-medium mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Supporting Copy
                    </Label>
                    <Textarea
                      value={block.subtitle}
                      onChange={(e) => handleChange(blockNum, 'subtitle', e.target.value)}
                      placeholder="Describe the offer..."
                      className="text-xs mt-1 min-h-[60px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Badge Chip
                      </Label>
                      <Input
                        value={block.badgeText}
                        onChange={(e) => handleChange(blockNum, 'badgeText', e.target.value)}
                        placeholder="e.g. MEMBERSHIP"
                        className="text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Button Text
                      </Label>
                      <Input
                        value={block.buttonText}
                        onChange={(e) => handleChange(blockNum, 'buttonText', e.target.value)}
                        placeholder="e.g. Explore Now"
                        className="text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Destination Link
                    </Label>
                    <Input
                      value={block.destinationLink}
                      onChange={(e) => handleChange(blockNum, 'destinationLink', e.target.value)}
                      placeholder="e.g. /menu, /specials, /rewards"
                      className="text-xs mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> Artwork Image URL
                    </Label>
                    <Input
                      value={block.artworkUrl || ''}
                      onChange={(e) => handleChange(blockNum, 'artworkUrl', e.target.value)}
                      placeholder="https://... image link"
                      className="text-xs mt-1 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Start Date
                      </Label>
                      <Input
                        type="date"
                        value={block.startDate || ''}
                        onChange={(e) => handleChange(blockNum, 'startDate', e.target.value)}
                        className="text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> End Date
                      </Label>
                      <Input
                        type="date"
                        value={block.endDate || ''}
                        onChange={(e) => handleChange(blockNum, 'endDate', e.target.value)}
                        className="text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Publication Status
                    </Label>
                    <Select
                      value={block.status}
                      onValueChange={(val) => handleChange(blockNum, 'status', val)}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published (Push to App)</SelectItem>
                        <SelectItem value="draft">Draft (Admin Only)</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 pt-3 pb-3">
                <Button
                  onClick={() => publishMutation.mutate(block)}
                  disabled={isPending}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs gap-2"
                >
                  {isPending ? (
                    'Publishing...'
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Publish Block #{blockNum} to App
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
