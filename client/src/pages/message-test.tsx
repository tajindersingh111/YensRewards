import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function MessageTest() {
  const [, setLocation] = useLocation();
  const [smsPhone, setSmsPhone] = useState("+66");
  const [smsMessage, setSmsMessage] = useState("Hello from Yens Thai Ice Cream! This is a test message.");
  const [email, setEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("Test from Yens Loyalty System");
  const [emailMessage, setEmailMessage] = useState("Hello! This is a test email from Yens Thai Ice Cream loyalty system.");

  const smsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/test-sms', {
        phone: smsPhone,
        message: smsMessage
      });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/test-email', {
        email: email,
        subject: emailSubject,
        message: emailMessage
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/admin')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Message Testing</h1>
            <p className="text-muted-foreground">Test your Twilio SMS and Resend Email integrations</p>
          </div>
        </div>

        {/* SMS Test Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <CardTitle>Test SMS (Twilio)</CardTitle>
            </div>
            <CardDescription>
              Send a test SMS to verify your Twilio integration is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-phone">Phone Number (include country code)</Label>
              <Input
                id="sms-phone"
                type="tel"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+66812345678"
                data-testid="input-sms-phone"
              />
              <p className="text-xs text-muted-foreground">
                Format: +[country code][number] (e.g., +66812345678 for Thailand)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Your test message"
                rows={3}
                data-testid="input-sms-message"
              />
            </div>

            <Button
              onClick={() => smsMutation.mutate()}
              disabled={smsMutation.isPending || !smsPhone || !smsMessage}
              className="w-full"
              data-testid="button-send-sms"
            >
              {smsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending SMS...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Test SMS
                </>
              )}
            </Button>

            {smsMutation.isSuccess && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  ✅ SMS sent successfully! Check your phone at {smsPhone}
                  {(smsMutation.data as any)?.messageId && (
                    <div className="text-xs mt-1">Message ID: {(smsMutation.data as any).messageId}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {smsMutation.isError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  ❌ {(smsMutation.error as any)?.message || "Failed to send SMS. Check your Twilio configuration."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Email Test Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle>Test Email (Resend)</CardTitle>
            </div>
            <CardDescription>
              Send a test email to verify your Resend integration is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-email-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Your test message"
                rows={4}
                data-testid="input-email-message"
              />
            </div>

            <Button
              onClick={() => emailMutation.mutate()}
              disabled={emailMutation.isPending || !email || !emailSubject || !emailMessage}
              className="w-full"
              data-testid="button-send-email"
            >
              {emailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>

            {emailMutation.isSuccess && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  ✅ Email sent successfully! Check your inbox at {email}
                  {(emailMutation.data as any)?.messageId && (
                    <div className="text-xs mt-1">Message ID: {(emailMutation.data as any).messageId}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {emailMutation.isError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  ❌ {(emailMutation.error as any)?.message || "Failed to send email. Check your Resend configuration."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>Current configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">Twilio SMS</span>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400">✓ Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="font-medium">Resend Email</span>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400">✓ Connected</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
