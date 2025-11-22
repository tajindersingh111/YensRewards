import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Cake, Eye, Edit, MessageSquare, Trash2, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Customer } from "@shared/schema";
import { useTranslation } from "react-i18next";

const tierColors = {
  bronze: "bg-[hsl(30,60%,50%)] text-white",
  silver: "bg-[hsl(0,0%,63%)] text-white",
  gold: "bg-[hsl(45,93%,47%)] text-white",
};

interface CustomerInsightsProps {
  onMessage?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onViewDetails?: (customer: Customer) => void;
  onSendBirthdayMessages?: (customers: Customer[]) => void;
}

export default function CustomerInsights({ onMessage, onEdit, onDelete, onViewDetails, onSendBirthdayMessages }: CustomerInsightsProps) {
  const { t } = useTranslation();

  // Fetch all customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/all'],
  });

  // Sort customers by totalSpent
  const topSpenders = [...customers]
    .sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
    .slice(0, 10);

  return (
    <div className="space-y-6 mb-6">
      {/* Top 10 Spenders - Horizontal Scrollable */}
      <Card className="border-4 border-yellow-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top 10 Spenders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSpenders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No spenders yet</p>
          ) : (
            <div className="overflow-x-auto px-2">
              <div className="flex gap-2 pb-2">
                {topSpenders.map((customer, index) => (
                  <div
                    key={customer.id}
                    className="flex flex-col items-center gap-2 min-w-[115px] group"
                    data-testid={`top-spender-${index + 1}`}
                  >
                    <div className="relative">
                      <Avatar className="w-20 h-20 border-4 border-yellow-400">
                        <AvatarImage src={customer.photo || undefined} />
                        <AvatarFallback>{customer.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center bg-yellow-400 text-yellow-900 text-xs font-bold border-2 border-white">
                        {index + 1}
                      </div>
                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white hover:bg-white/20"
                          onClick={() => onViewDetails?.(customer)}
                          data-testid={`button-view-${customer.id}`}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white hover:bg-white/20"
                          onClick={() => onEdit?.(customer)}
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white hover:bg-white/20"
                          onClick={() => onMessage?.(customer)}
                          data-testid={`button-message-${customer.id}`}
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white hover:bg-white/20"
                          onClick={() => onDelete?.(customer)}
                          data-testid={`button-delete-${customer.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-center w-full">
                      <p className="font-medium text-sm truncate">{customer.name}</p>
                      <Badge className={`text-xs mt-1 ${tierColors[customer.tier as keyof typeof tierColors]}`}>
                        {customer.tier}
                      </Badge>
                      <p className="text-xs font-semibold text-yellow-600 mt-1">฿{parseFloat(customer.totalSpent).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-muted-foreground">{customer.points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

        if (currentWeekGroups.length === 0 && !thisMonthGroup) {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-yellow-500" />
                  Upcoming Birthdays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming birthdays</p>
              </CardContent>
            </Card>
          );
        }

        // Flatten Current Week customers
        const currentWeekCustomers = currentWeekGroups.flatMap(({ label, customers }) =>
          customers.map(customer => ({ ...customer, timePeriod: label }))
        );

        // Prepare This Month customers
        const thisMonthCustomers = thisMonthGroup 
          ? thisMonthGroup.customers.map(customer => ({ ...customer, timePeriod: thisMonthGroup.label }))
          : [];

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
                    className="flex flex-col items-center gap-2 w-28 group relative"
                    data-testid={`birthday-customer-${customer.id}`}
                  >
                    <div className="relative w-20 h-20">
                      <Avatar className="w-20 h-20 border-2 border-yellow-500">
                        <AvatarImage src={customer.photo || undefined} className="mix-blend-luminosity" />
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
                      {onViewDetails && (
                        <Button
                          onClick={() => onViewDetails(customer)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          data-testid={`button-details-birthday-${customer.id}`}
                          title="View details"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          onClick={() => onEdit(customer)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          data-testid={`button-edit-birthday-${customer.id}`}
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                      {onMessage && (
                        <Button
                          onClick={() => onMessage(customer)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          data-testid={`button-message-birthday-${customer.id}`}
                          title="Message"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          onClick={() => onDelete(customer)}
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-testid={`button-delete-birthday-${customer.id}`}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ));
        };

        // Get all birthday customer IDs for "Send All" button
        const allBirthdayCustomers = [...currentWeekCustomers, ...thisMonthCustomers];

        return (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-yellow-500" />
                  Upcoming Birthdays
                </CardTitle>
                {onSendBirthdayMessages && allBirthdayCustomers.length > 0 && (
                  <Button
                    onClick={() => onSendBirthdayMessages(allBirthdayCustomers)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900"
                    size="sm"
                    data-testid="button-send-all-birthday-messages"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send All Birthday Messages ({allBirthdayCustomers.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Week Section - Thicker Border */}
              {currentWeekCustomers.length > 0 && (
                <div className="bg-card rounded-lg border-4 border-[#FCD34D] p-6" data-testid="section-current-week-birthdays">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Cake className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-semibold text-lg">{t('admin.overview.currentWeek')}</h3>
                      <Badge variant="secondary">{currentWeekCustomers.length}</Badge>
                    </div>
                    {onSendBirthdayMessages && currentWeekCustomers.length > 0 && (
                      <Button
                        onClick={() => onSendBirthdayMessages(currentWeekCustomers)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900"
                        size="sm"
                        data-testid="button-send-birthday-messages-week"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Birthday Messages ({currentWeekCustomers.length})
                      </Button>
                    )}
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
                    {onSendBirthdayMessages && thisMonthCustomers.length > 0 && (
                      <Button
                        onClick={() => onSendBirthdayMessages(thisMonthCustomers)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900"
                        size="sm"
                        data-testid="button-send-birthday-messages-month"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Birthday Messages ({thisMonthCustomers.length})
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    {renderCustomerAvatars(thisMonthCustomers)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
