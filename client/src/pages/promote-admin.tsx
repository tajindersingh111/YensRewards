import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PromoteAdmin() {
  const [secret, setSecret] = useState("yens-admin-2025");
  
  const promoteMutation = useMutation({
    mutationFn: async (secret: string) => {
      return await apiRequest('POST', '/api/auth/promote-admin', { secret });
    },
  });

  const handlePromote = () => {
    promoteMutation.mutate(secret);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Promotion</CardTitle>
          <CardDescription>
            Promote yourself to admin role in the production database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secret">Secret Code</Label>
            <Input
              id="secret"
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter secret code"
              data-testid="input-secret"
            />
          </div>

          <Button 
            onClick={handlePromote}
            disabled={promoteMutation.isPending}
            className="w-full"
            data-testid="button-promote"
          >
            {promoteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Promoting...
              </>
            ) : (
              "Promote to Admin"
            )}
          </Button>

          {promoteMutation.isSuccess && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Successfully promoted to admin! You can now access the admin dashboard.
                <br />
                <a href="/admin" className="underline font-semibold mt-2 inline-block">
                  Go to Admin Dashboard →
                </a>
              </AlertDescription>
            </Alert>
          )}

          {promoteMutation.isError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {(promoteMutation.error as any)?.message || "Failed to promote to admin. Please check the secret code."}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p>ℹ️ This is a one-time setup page.</p>
            <p>After promotion, you'll have full admin access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
