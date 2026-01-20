import { useRef, useCallback, useEffect, useState } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Eye, Code, Save, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmailVisualEditorProps {
  onExportHtml: (html: string) => void;
  onSaveDesign?: (design: any) => void;
  initialDesign?: any;
  height?: string;
}

const yensThemeColors = [
  '#FCD34D', // Yens Yellow
  '#FBBF24', // Yens Yellow Dark
  '#FEF3C7', // Yens Yellow Light
  '#1E40AF', // Yens Blue
  '#3B82F6', // Blue Light
  '#FFFFFF', // White
  '#000000', // Black
  '#333333', // Dark Gray
  '#666666', // Medium Gray
  '#999999', // Light Gray
];

export default function EmailVisualEditor({ 
  onExportHtml, 
  onSaveDesign, 
  initialDesign,
  height = '600px'
}: EmailVisualEditorProps) {
  const { t, i18n } = useTranslation();
  const emailEditorRef = useRef<EditorRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showHtmlCode, setShowHtmlCode] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const isThaiLanguage = i18n.language === 'th';

  const onLoad = useCallback(() => {
    setIsLoading(false);
    if (initialDesign && emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.loadDesign(initialDesign);
    }
  }, [initialDesign]);

  const onReady = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleExportHtml = useCallback(() => {
    if (emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.exportHtml((data) => {
        const { html } = data;
        onExportHtml(html);
      });
    }
  }, [onExportHtml]);

  const handlePreview = useCallback(() => {
    if (emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.exportHtml((data) => {
        const { html } = data;
        setPreviewHtml(html);
        setShowPreview(true);
      });
    }
  }, []);

  const handleShowHtml = useCallback(() => {
    if (emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.exportHtml((data) => {
        const { html } = data;
        setHtmlCode(html);
        setShowHtmlCode(true);
      });
    }
  }, []);

  const handleSaveDesign = useCallback(() => {
    if (emailEditorRef.current?.editor && onSaveDesign) {
      emailEditorRef.current.editor.saveDesign((design) => {
        onSaveDesign(design);
      });
    }
  }, [onSaveDesign]);

  const editorOptions: EmailEditorProps['options'] = {
    appearance: {
      theme: 'light',
      panels: {
        tools: {
          dock: 'left',
        },
      },
    },
    features: {
      textEditor: {
        spellChecker: true,
      },
    },
    tools: {
      button: {
        enabled: true,
      },
      text: {
        enabled: true,
      },
      image: {
        enabled: true,
      },
      divider: {
        enabled: true,
      },
      heading: {
        enabled: true,
      },
      html: {
        enabled: true,
      },
      menu: {
        enabled: true,
      },
      social: {
        enabled: true,
      },
      video: {
        enabled: false,
      },
    },
    mergeTags: {
      customer: {
        name: isThaiLanguage ? 'ข้อมูลลูกค้า' : 'Customer Info',
        mergeTags: {
          name: {
            name: isThaiLanguage ? 'ชื่อลูกค้า' : 'Customer Name',
            value: '{{name}}',
          },
          tier: {
            name: isThaiLanguage ? 'ระดับสมาชิก' : 'Membership Tier',
            value: '{{tier}}',
          },
          points: {
            name: isThaiLanguage ? 'คะแนนสะสม' : 'Points Balance',
            value: '{{points}}',
          },
          phone: {
            name: isThaiLanguage ? 'เบอร์โทร' : 'Phone Number',
            value: '{{phone}}',
          },
          email: {
            name: isThaiLanguage ? 'อีเมล' : 'Email',
            value: '{{email}}',
          },
        },
      },
      shop: {
        name: isThaiLanguage ? 'ข้อมูลร้าน' : 'Shop Info',
        mergeTags: {
          shopName: {
            name: isThaiLanguage ? 'ชื่อร้าน' : 'Shop Name',
            value: "Yen's Thai Ice Cream",
          },
          website: {
            name: isThaiLanguage ? 'เว็บไซต์' : 'Website',
            value: 'https://yensthai.com',
          },
        },
      },
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handlePreview}
            disabled={isLoading}
            data-testid="button-preview-email"
          >
            <Eye className="w-4 h-4 mr-2" />
            {isThaiLanguage ? 'ดูตัวอย่าง' : 'Preview'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleShowHtml}
            disabled={isLoading}
            data-testid="button-view-html"
          >
            <Code className="w-4 h-4 mr-2" />
            {isThaiLanguage ? 'ดู HTML' : 'View HTML'}
          </Button>
        </div>
        <div className="flex gap-2">
          {onSaveDesign && (
            <Button 
              variant="outline" 
              onClick={handleSaveDesign}
              disabled={isLoading}
              data-testid="button-save-design"
            >
              <Save className="w-4 h-4 mr-2" />
              {isThaiLanguage ? 'บันทึกแบบ' : 'Save Design'}
            </Button>
          )}
          <Button 
            onClick={handleExportHtml}
            disabled={isLoading}
            data-testid="button-export-html"
          >
            <Code className="w-4 h-4 mr-2" />
            {isThaiLanguage ? 'ใช้ HTML นี้' : 'Use This HTML'}
          </Button>
        </div>
      </div>

      <div className="relative border rounded-lg overflow-hidden" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">{isThaiLanguage ? 'กำลังโหลด...' : 'Loading editor...'}</span>
          </div>
        )}
        <EmailEditor
          ref={emailEditorRef}
          onLoad={onLoad}
          onReady={onReady}
          options={editorOptions}
          style={{ height: '100%' }}
        />
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isThaiLanguage ? 'ดูตัวอย่างอีเมล' : 'Email Preview'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div 
              className="p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showHtmlCode} onOpenChange={setShowHtmlCode}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isThaiLanguage ? 'HTML Code' : 'HTML Code'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <pre className="p-4 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap">
              {htmlCode}
            </pre>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(htmlCode);
              }}
              data-testid="button-copy-html"
            >
              {isThaiLanguage ? 'คัดลอก HTML' : 'Copy HTML'}
            </Button>
            <Button
              onClick={() => {
                onExportHtml(htmlCode);
                setShowHtmlCode(false);
              }}
              data-testid="button-use-html"
            >
              {isThaiLanguage ? 'ใช้ HTML นี้' : 'Use This HTML'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
