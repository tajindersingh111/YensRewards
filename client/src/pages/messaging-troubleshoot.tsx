import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function MessagingTroubleshoot() {
  const { toast } = useToast();
  const [smsPhone, setSmsPhone] = useState("+66");
  const [smsMessage, setSmsMessage] = useState("Test SMS from Yens Thai Ice Cream!");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSubject, setEmailSubject] = useState("Test Email");
  const [emailMessage, setEmailMessage] = useState("This is a test email from Yens Thai Ice Cream!");
  const [smsSending, setSmsSending] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);
  const [emailResult, setEmailResult] = useState<any>(null);

  const sendTestSMS = async () => {
    setSmsSending(true);
    setSmsResult(null);
    try {
      const response = await fetch("/api/admin/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: smsPhone,
          message: smsMessage,
        }),
      });

      const data = await response.json();
      setSmsResult(data);

      if (data.success) {
        toast({
          title: "SMS Sent Successfully!",
          description: `Message ID: ${data.messageId}`,
        });
      } else {
        toast({
          title: "SMS Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setSmsResult({ success: false, error: error.message });
      toast({
        title: "Error sending SMS",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSmsSending(false);
    }
  };

  const sendTestEmail = async () => {
    setEmailSending(true);
    setEmailResult(null);
    try {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: emailAddress,
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      const data = await response.json();
      setEmailResult(data);

      if (data.success) {
        toast({
          title: "Email Sent Successfully!",
          description: `Message ID: ${data.messageId}`,
        });
      } else {
        toast({
          title: "Email Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setEmailResult({ success: false, error: error.message });
      toast({
        title: "Error sending email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messaging Troubleshoot</h1>
            <p className="text-muted-foreground">Test SMS and Email delivery</p>
          </div>
        </div>

        {/* SMS Troubleshooting */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">SMS Testing (Twilio)</h2>
              <Badge variant="outline">Thailand: +66</Badge>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Common SMS Issues:
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>
                  <strong>Geographic Permissions:</strong> Thailand must be enabled in Twilio Console
                  <br />
                  <a
                    href="https://console.twilio.com/us1/develop/sms/settings/geo-permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs"
                  >
                    → Enable Thailand here (opens Twilio Console)
                  </a>
                </li>
                <li><strong>Trial Account:</strong> Verify Thai phone numbers OR upgrade account</li>
                <li><strong>Phone Format:</strong> Use E.164 format (e.g., +66812345678)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-phone">Phone Number (Thailand +66)</Label>
              <Input
                id="sms-phone"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+66812345678"
                data-testid="input-sms-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={3}
                data-testid="input-sms-message"
              />
            </div>

            <Button
              onClick={sendTestSMS}
              disabled={smsSending || !smsPhone}
              className="w-full"
              data-testid="button-send-test-sms"
            >
              {smsSending ? "Sending..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test SMS
                </>
              )}
            </Button>

            {smsResult && (
              <div className={`p-4 rounded-lg ${smsResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {smsResult.success ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700 dark:text-green-400">SMS Sent Successfully!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-700 dark:text-red-400">SMS Failed</span>
                    </>
                  )}
                </div>
                <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
                  {JSON.stringify(smsResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>

        {/* Email Troubleshooting */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Email Testing (Resend)</h2>
              <Badge variant="outline">SMTP</Badge>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Common Email Issues:
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li><strong>Check Spam Folder!</strong> Most common issue - email might be filtered</li>
                <li><strong>Domain Verification:</strong> Using a verified domain improves delivery</li>
                <li><strong>Delay:</strong> Emails can take 1-5 minutes to arrive</li>
                <li><strong>Gmail Test:</strong> Try sending to Gmail first (more lenient filters)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-address">Email Address</Label>
              <Input
                id="email-address"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="your.email@example.com"
                data-testid="input-email-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
                data-testid="input-email-message"
              />
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={emailSending || !emailAddress}
              className="w-full"
              data-testid="button-send-test-email"
            >
              {emailSending ? "Sending..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>

            {emailResult && (
              <div className={`p-4 rounded-lg ${emailResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {emailResult.success ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700 dark:text-green-400">Email Sent Successfully!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-700 dark:text-red-400">Email Failed</span>
                    </>
                  )}
                </div>
                {emailResult.success && (
                  <p className="text-sm text-green-700 dark:text-green-400 mb-2">
                    ✅ Check your inbox (and spam folder!) in 1-5 minutes
                  </p>
                )}
                <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
                  {JSON.stringify(emailResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
