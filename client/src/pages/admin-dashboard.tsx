import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import KPICard from "@/components/KPICard";
import SalesChart from "@/components/SalesChart";
import CustomerTable from "@/components/CustomerTable";
import CustomerEditDialog from "@/components/CustomerEditDialog";
import CustomerMessageDialog from "@/components/CustomerMessageDialog";
import CustomerDetailsDialog from "@/components/CustomerDetailsDialog";
import PromotionCreator from "@/components/PromotionCreator";
import CustomerCSVImport from "@/components/CustomerCSVImport";
import ProductManager from "@/components/ProductManager";
import MessagesPage from "@/components/MessagesPage";
import EnhancedMessaging from "@/components/EnhancedMessaging";
import UsersPage from "@/pages/admin/UsersPage";
import YensOverview from "@/components/YensOverview";
import SitesManager from "@/components/SitesManager";
import InstallPrompt from "@/components/InstallPrompt";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, Users, TrendingUp, Award, ArrowLeft, LogOut, Home, Search, UserPlus, Upload, Trophy, Cake, Send, Settings, Eye, Edit, MessageSquare, Trash2 } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError, isForbiddenError } from "@/lib/authUtils";
import type { Customer } from "@shared/schema";

export default function AdminDashboard() {
  // Auto-update detection
  useAutoUpdate();
  const { t } = useTranslation();
  const [, setLocationPath] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [memberStatus, setMemberStatus] = useState<"active" | "inactive">("active");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [messagingCustomer, setMessagingCustomer] = useState<Customer | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log('🔍 Admin Dashboard - Auth State:', {
      authLoading,
      isAuthenticated,
      user,
      userRole: user?.role,
      userEmail: user?.email,
    });
  }, [authLoading, isAuthenticated, user]);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('❌ Not authenticated - redirecting to login');
      toast({
        title: t('admin.toasts.authRequired'),
        description: t('admin.toasts.authRequiredDesc'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      console.log('❌ Access denied - User role:', user?.role, 'Expected: admin');
      toast({
        title: t('admin.toasts.accessDenied'),
        description: t('admin.toasts.accessDeniedDesc'),
        variant: "destructive",
      });
      setTimeout(() => {
        setLocationPath("/");
      }, 500);
      return;
    }

    if (!authLoading && isAuthenticated && user?.role === "admin") {
      console.log('✅ Admin access granted');
    }
  }, [isAuthenticated, authLoading, user, toast, setLocationPath, t]);

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    totalSales: number;
    totalCustomers: number;
    avgTransaction: number;
    pointsRedeemed: number;
    salesByLocation: Array<{ label: string; value: number }>;
  }>({
    queryKey: ['/api/admin/analytics'],
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });

  // Fetch all customers
  const { data: customersData = [], isLoading: customersLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/customers'],
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });

  // Transform customers to ensure proper tier types
  const customers = customersData.map(c => ({
    ...c,
    tier: (c.tier || 'bronze') as 'bronze' | 'silver' | 'gold',
  }));

  // Create promotion mutation
  const createPromotion = useMutation({
    mutationFn: async (data: { title: string; targetTier?: string; message: string }) => {
      return await apiRequest('POST', '/api/admin/promotions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      toast({
        title: t('admin.toasts.promotionSuccess'),
        description: t('admin.toasts.promotionSent'),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error) || isForbiddenError(error)) {
        toast({
          title: t('admin.toasts.sessionExpired'),
          description: t('admin.toasts.sessionExpiredDesc'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('admin.toasts.promotionError'),
        variant: "destructive",
      });
    },
  });

  const importCustomers = useMutation({
    mutationFn: async (customers: Array<{ phone: string; name: string; email?: string; birthdate?: string }>) => {
      return await apiRequest('POST', '/api/admin/import-customers', { customers });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({
        title: t('admin.toasts.importSuccess'),
        description: `${data.imported || 0} ${t('admin.toasts.importSuccessDesc')}`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error) || isForbiddenError(error)) {
        toast({
          title: t('admin.toasts.sessionExpired'),
          description: t('admin.toasts.sessionExpiredDesc'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('admin.toasts.importFailed'),
        description: error.message || t('admin.toasts.importFailedDesc'),
        variant: "destructive",
      });
    },
  });

  // Send birthday messages mutation
  const sendBirthdayMessagesMutation = useMutation({
    mutationFn: async (customerIds: string[]) => {
      const response = await apiRequest('POST', '/api/admin/send-birthday-messages', { customerIds });
      return await response.json();
    },
    onSuccess: (data: any) => {
      // Invalidate messages queries to refresh statistics
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      
      const sentCount = data?.sent || data?.total || 0;
      toast({
        title: t('admin.toasts.birthdayMessagesSent'),
        description: t('admin.toasts.birthdayMessagesSentDesc', { count: sentCount }),
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error) || isForbiddenError(error)) {
        toast({
          title: t('admin.toasts.sessionExpired'),
          description: t('admin.toasts.sessionExpiredDesc'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('admin.toasts.sendMessagesFailed'),
        description: error.message || t('admin.toasts.sendMessagesError'),
        variant: "destructive",
      });
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return await apiRequest('DELETE', `/api/admin/customers/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({
        title: "Customer deleted",
        description: "The customer has been successfully deleted.",
      });
      setDeletingCustomer(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row and parse data
      const customers = lines.slice(1).map(line => {
        const [name, phone, email, birthdate] = line.split(',').map(s => s.trim());
        return {
          phone,
          name,
          email: email || undefined,
          birthdate: birthdate || undefined,
        };
      }).filter(c => c.name && c.phone); // Filter out invalid rows
      
      if (customers.length === 0) {
        toast({
          title: t('admin.toasts.noValidData'),
          description: t('admin.toasts.noValidDataDesc'),
          variant: "destructive",
        });
        return;
      }
      
      importCustomers.mutate(customers);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const csvContent = customers
      .map((c) => `${c.name},${c.phone},${c.email || ""},${c.birthday || ""}`)
      .join("\n");
    const blob = new Blob([`name,phone,email,birthday\n${csvContent}`], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yens-customers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendPromotion = (message: string, tier?: string) => {
    createPromotion.mutate({
      title: t('admin.toasts.specialPromotion'),
      targetTier: tier === 'all' ? undefined : tier,
      message,
    });
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin (will redirect)
  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocationPath("/")}
              variant="ghost"
              size="icon"
              className="hover-elevate"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{t('admin.title')}</h1>
                <Badge variant="outline" className="text-xs" data-testid="badge-version">v2.7.4</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('admin.overview.loggedInAs')} {user?.email || user?.firstName || t('common.admin')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">{t('admin.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">{t('admin.tabs.dashboard')}</TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">{t('admin.tabs.customers')}</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">{t('admin.tabs.products')}</TabsTrigger>
            <TabsTrigger value="promotions" data-testid="tab-promotions">{t('admin.tabs.promotions')}</TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">{t('admin.tabs.messages')}</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">{t('admin.tabs.users')}</TabsTrigger>
            <TabsTrigger value="sites" data-testid="tab-sites">{t('admin.tabs.sites')}</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">{t('admin.tabs.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <YensOverview />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Top Spenders */}
            <div className="bg-card rounded-lg border-2 border-[#FCD34D] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-lg">{t('admin.overview.topSpenders')}</h3>
              </div>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-4 min-w-max">
                  {[...customers]
                    .sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))
                    .slice(0, 10)
                    .map((customer, index) => (
                      <div 
                        key={customer.id} 
                        className="flex flex-col items-center gap-2 w-24 group relative"
                        data-testid={`top-spender-${index + 1}`}
                      >
                        <div className="relative">
                          <div className="relative w-16 h-16">
                            <Avatar className="w-16 h-16 border-2 border-primary">
                              <AvatarImage src={customer.photo} className="mix-blend-luminosity" />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {customer.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {customer.photo && (
                              <div className="absolute inset-0 bg-[#FCD34D] opacity-40 rounded-full pointer-events-none mix-blend-multiply"></div>
                            )}
                          </div>
                          <div className="absolute -top-1 -left-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <p className="text-xs font-medium text-center line-clamp-1">
                          {customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ฿{Number(customer.totalSpent).toLocaleString()}
                        </p>
                        <div className="invisible group-hover:visible absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-background border rounded-md shadow-lg p-1 z-10">
                          <Button
                            onClick={() => setDetailsCustomer(customer as Customer)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            data-testid={`button-details-spender-${index + 1}`}
                            title="View details"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingCustomer(customer as Customer);
                              setIsEditDialogOpen(true);
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            data-testid={`button-edit-spender-${index + 1}`}
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => {
                              setMessagingCustomer(customer as Customer);
                              setIsMessageDialogOpen(true);
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            data-testid={`button-message-spender-${index + 1}`}
                            title="Message"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => setDeletingCustomer(customer as Customer)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            data-testid={`button-delete-spender-${index + 1}`}
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Upcoming Birthdays */}
            {(() => {
              // Calculate date ranges
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              const tomorrow = new Date(today);
              tomorrow.setDate(today.getDate() + 1);
              tomorrow.setHours(0, 0, 0, 0);
              
              const dayAfterTomorrow = new Date(tomorrow);
              dayAfterTomorrow.setDate(tomorrow.getDate() + 1);
              dayAfterTomorrow.setHours(0, 0, 0, 0);
              
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
              startOfWeek.setHours(0, 0, 0, 0);
              
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
              endOfWeek.setHours(23, 59, 59, 999);
              
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              startOfMonth.setHours(0, 0, 0, 0);
              
              const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              endOfMonth.setHours(23, 59, 59, 999);

              // Group customers by time periods
              const todayBirthdays: typeof customers = [];
              const tomorrowBirthdays: typeof customers = [];
              const thisWeekBirthdays: typeof customers = [];
              const thisMonthBirthdays: typeof customers = [];
              
              customers.forEach(customer => {
                if (!customer.birthday) return;
                
                try {
                  // Parse multiple birthday formats: DD/MM/YYYY, YYYY-MM-DD, MM-DD
                  let month: number;
                  let day: number;
                  let year: number | null = null;
                  
                  // Handle DD/MM/YYYY format (Thai format with /)
                  if (customer.birthday.includes('/')) {
                    const parts = customer.birthday.split('/');
                    if (parts.length === 3) {
                      day = parseInt(parts[0]);
                      month = parseInt(parts[1]);
                      year = parseInt(parts[2]);
                    } else {
                      return; // Invalid format
                    }
                  }
                  // Handle MM-DD or YYYY-MM-DD format (with -)
                  else if (customer.birthday.includes('-')) {
                    const parts = customer.birthday.split('-');
                    if (parts.length === 2) {
                      // MM-DD format
                      month = parseInt(parts[0]);
                      day = parseInt(parts[1]);
                    } else if (parts.length === 3) {
                      // YYYY-MM-DD format
                      year = parseInt(parts[0]);
                      month = parseInt(parts[1]);
                      day = parseInt(parts[2]);
                    } else {
                      return; // Invalid format
                    }
                  } else {
                    return; // No recognized delimiter
                  }
                  
                  // Validate month and day ranges
                  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
                    return;
                  }
                  
                  // Handle Thai Buddhist Era (B.E.) years - convert to Gregorian
                  if (year !== null && !isNaN(year) && year > today.getFullYear() + 100) {
                    // Likely Buddhist Era year - subtract 543 to convert to Gregorian
                    year = year - 543;
                  }
                  
                  // Filter out future dates (invalid birthdays from CSV import errors)
                  if (year !== null && !isNaN(year)) {
                    const birthDate = new Date(year, month - 1, day);
                    if (birthDate > today) {
                      return; // Skip future dates
                    }
                  }
                  
                  // Handle Feb 29 on non-leap years
                  let adjustedDay = day;
                  if (month === 2 && day === 29) {
                    const isLeapYear = (today.getFullYear() % 4 === 0 && today.getFullYear() % 100 !== 0) || 
                                      (today.getFullYear() % 400 === 0);
                    if (!isLeapYear) {
                      adjustedDay = 28;
                    }
                  }
                  
                  // Create birthday for this year
                  let birthdayThisYear = new Date(today.getFullYear(), month - 1, adjustedDay);
                  birthdayThisYear.setHours(0, 0, 0, 0);
                  
                  // Handle year wrapping
                  if (birthdayThisYear < startOfMonth) {
                    birthdayThisYear = new Date(today.getFullYear() + 1, month - 1, adjustedDay);
                    birthdayThisYear.setHours(0, 0, 0, 0);
                  }
                  
                  // Categorize by time period
                  if (birthdayThisYear.toDateString() === today.toDateString()) {
                    todayBirthdays.push(customer);
                  } else if (birthdayThisYear.toDateString() === tomorrow.toDateString()) {
                    tomorrowBirthdays.push(customer);
                  } else if (birthdayThisYear >= dayAfterTomorrow && birthdayThisYear <= endOfWeek) {
                    thisWeekBirthdays.push(customer);
                  } else if (birthdayThisYear > endOfWeek && birthdayThisYear <= endOfMonth) {
                    thisMonthBirthdays.push(customer);
                  }
                } catch (error) {
                  // Skip customers with invalid birthday formats
                  return;
                }
              });

              // Split into Current Week and This Month sections
              const currentWeekGroups = [
                { key: 'today', label: t('admin.overview.today'), customers: todayBirthdays },
                { key: 'tomorrow', label: t('admin.overview.tomorrow'), customers: tomorrowBirthdays },
                { key: 'this-week', label: t('admin.overview.thisWeek'), customers: thisWeekBirthdays },
              ].filter(group => group.customers.length > 0);

              const thisMonthGroup = thisMonthBirthdays.length > 0 ? {
                key: 'this-month',
                label: t('admin.overview.thisMonth'),
                customers: thisMonthBirthdays
              } : null;

              if (currentWeekGroups.length === 0 && !thisMonthGroup) return null;

              // Flatten Current Week customers
              const currentWeekCustomers = currentWeekGroups.flatMap(({ label, customers }) =>
                customers.map(customer => ({ ...customer, timePeriod: label }))
              );

              // Prepare This Month customers
              const thisMonthCustomers = thisMonthGroup 
                ? thisMonthGroup.customers.map(customer => ({ ...customer, timePeriod: thisMonthGroup.label }))
                : [];

              // Get all customer IDs for "Send All" button
              const allBirthdayCustomerIds = [...currentWeekCustomers, ...thisMonthCustomers].map(c => c.id);

              // Handlers for sending messages
              const handleSendAll = () => {
                if (allBirthdayCustomerIds.length > 0) {
                  sendBirthdayMessagesMutation.mutate(allBirthdayCustomerIds);
                }
              };

              const handleSendGroup = (customerIds: string[]) => {
                if (customerIds.length > 0) {
                  sendBirthdayMessagesMutation.mutate(customerIds);
                }
              };

              // Helper function to render customer avatars
              const renderCustomerAvatars = (customers: Array<typeof currentWeekCustomers[0]>) => {
                const rows: Array<Array<typeof customers[0]>> = [];
                for (let i = 0; i < customers.length; i += 10) {
                  rows.push(customers.slice(i, i + 10));
                }

                return rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="overflow-x-auto pb-2">
                    <div className="flex gap-4 min-w-max">
                      {row.map((customer) => (
                        <div 
                          key={customer.id}
                          className="flex flex-col items-center gap-2 w-24 group relative"
                          data-testid={`birthday-customer-${customer.id}`}
                        >
                          <div className="relative w-16 h-16">
                            <Avatar className="w-16 h-16 border-2 border-yellow-500">
                              <AvatarImage src={customer.photo} className="mix-blend-luminosity" />
                              <AvatarFallback className="bg-yellow-100 text-yellow-700 font-semibold">
                                {customer.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {customer.photo && (
                              <div className="absolute inset-0 bg-[#FCD34D] opacity-40 rounded-full pointer-events-none mix-blend-multiply"></div>
                            )}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                              <Cake className="w-5 h-5 text-yellow-500 drop-shadow-md" />
                            </div>
                          </div>
                          <p className="text-xs font-medium text-center line-clamp-1">
                            {customer.name}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {customer.timePeriod}
                          </Badge>
                          <div className="invisible group-hover:visible absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-background border rounded-md shadow-lg p-1 z-10">
                            <Button
                              onClick={() => setDetailsCustomer(customer as Customer)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              data-testid={`button-details-birthday-${customer.id}`}
                              title="View details"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingCustomer(customer as Customer);
                                setIsEditDialogOpen(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              data-testid={`button-edit-birthday-${customer.id}`}
                              title="Edit"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => {
                                setMessagingCustomer(customer as Customer);
                                setIsMessageDialogOpen(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              data-testid={`button-message-birthday-${customer.id}`}
                              title="Message"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => setDeletingCustomer(customer as Customer)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              data-testid={`button-delete-birthday-${customer.id}`}
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              };

              return (
                <div className="space-y-4">
                  {/* Current Week Section - Thicker Border */}
                  {currentWeekCustomers.length > 0 && (
                    <div className="bg-card rounded-lg border-4 border-[#FCD34D] p-6" data-testid="section-current-week-birthdays">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Cake className="w-5 h-5 text-yellow-500" />
                          <h3 className="font-semibold text-lg">{t('admin.overview.currentWeek')}</h3>
                          <Badge variant="secondary">{currentWeekCustomers.length}</Badge>
                        </div>
                        <Button 
                          onClick={() => handleSendGroup(currentWeekCustomers.map(c => c.id))}
                          disabled={sendBirthdayMessagesMutation.isPending}
                          size="sm"
                          data-testid="button-send-current-week-messages"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {sendBirthdayMessagesMutation.isPending ? t('admin.overview.sendingMessages') : t('admin.overview.sendAll')}
                        </Button>
                      </div>
                      
                      <div className="space-y-6">
                        {renderCustomerAvatars(currentWeekCustomers)}
                      </div>
                    </div>
                  )}

                  {/* This Month Section - Standard Border */}
                  {thisMonthCustomers.length > 0 && (
                    <div className="bg-card rounded-lg border-2 border-[#FCD34D] p-6" data-testid="section-this-month-birthdays">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Cake className="w-5 h-5 text-yellow-500" />
                          <h3 className="font-semibold text-lg">{t('admin.overview.thisMonth')}</h3>
                          <Badge variant="secondary">{thisMonthCustomers.length}</Badge>
                        </div>
                        <Button 
                          onClick={() => handleSendGroup(thisMonthCustomers.map(c => c.id))}
                          disabled={sendBirthdayMessagesMutation.isPending}
                          size="sm"
                          data-testid="button-send-this-month-messages"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {sendBirthdayMessagesMutation.isPending ? t('admin.overview.sendingMessages') : t('admin.overview.sendAll')}
                        </Button>
                      </div>
                      
                      <div className="space-y-6">
                        {renderCustomerAvatars(thisMonthCustomers)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>


          <TabsContent value="customers" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{t('admin.customers.title')}</h2>
              <CustomerCSVImport showTrigger={true} />
            </div>
            <CustomerTable
              customers={customers}
              onMessage={(id) => {
                const customer = customers.find((c) => c.id === id);
                if (customer) {
                  setMessagingCustomer(customer as Customer);
                  setIsMessageDialogOpen(true);
                }
              }}
              onEdit={(customer) => {
                setEditingCustomer(customer as any);
                setIsEditDialogOpen(true);
              }}
              data-testid="table-all-customers"
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductManager />
          </TabsContent>

          <TabsContent value="promotions" className="space-y-6">
            <div className="max-w-2xl">
              <PromotionCreator
                onSend={handleSendPromotion}
                data-testid="promotion-creator"
              />
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <MessagesPage />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersPage />
          </TabsContent>

          <TabsContent value="sites" className="space-y-6">
            <SitesManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('admin.settings.comingSoon')}</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Global Dialogs - Available from all tabs */}
        <CustomerEditDialog
          customer={editingCustomer}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
        
        <CustomerEditDialog
          customer={null}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
        />
        
        <CustomerCSVImport
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          showTrigger={false}
        />
        
        <CustomerMessageDialog
          customer={messagingCustomer as any}
          open={isMessageDialogOpen}
          onOpenChange={setIsMessageDialogOpen}
        />

        <CustomerDetailsDialog 
          customer={detailsCustomer}
          open={!!detailsCustomer}
          onOpenChange={(open: boolean) => !open && setDetailsCustomer(null)}
        />

        <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deletingCustomer?.name}</strong> ({deletingCustomer?.phone})?
                <br /><br />
                This will permanently delete:
                <ul className="list-disc list-inside mt-2">
                  <li>Customer profile and all personal information</li>
                  <li>Transaction history (฿{Number(deletingCustomer?.totalSpent || 0).toLocaleString()})</li>
                  <li>Points balance ({deletingCustomer?.points} points)</li>
                  <li>Message history and notifications</li>
                </ul>
                <br />
                <strong>This action cannot be undone.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Customer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      <InstallPrompt />
    </div>
  );
}
