import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Cake, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Customer } from "@shared/schema";
import { useTranslation } from "react-i18next";

const tierColors = {
  bronze: "bg-[hsl(30,60%,50%)] text-white",
  silver: "bg-[hsl(0,0%,63%)] text-white",
  gold: "bg-[hsl(45,93%,47%)] text-white",
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isBirthdayThisWeek(birthday: string | null): boolean {
  if (!birthday) return false;
  
  const today = new Date();
  
  // Get start of week (Monday)
  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Adjust for Monday start
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysFromMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Get end of week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  // Parse birthday (assuming format YYYY-MM-DD or MM-DD)
  const birthdayParts = birthday.includes('-') ? birthday.split('-') : null;
  if (!birthdayParts) return false;
  
  const month = parseInt(birthdayParts.length === 3 ? birthdayParts[1] : birthdayParts[0]);
  const day = parseInt(birthdayParts.length === 3 ? birthdayParts[2] : birthdayParts[1]);
  
  // Create birthday date for current year
  const currentYear = today.getFullYear();
  const birthdayThisYear = new Date(currentYear, month - 1, day);
  
  return birthdayThisYear >= startOfWeek && birthdayThisYear <= endOfWeek;
}

function isBirthdayThisMonth(birthday: string | null): boolean {
  if (!birthday) return false;
  
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  
  // Parse birthday
  const birthdayParts = birthday.includes('-') ? birthday.split('-') : null;
  if (!birthdayParts) return false;
  
  const month = parseInt(birthdayParts.length === 3 ? birthdayParts[1] : birthdayParts[0]);
  
  return month === currentMonth;
}

function getBirthdayDate(birthday: string | null): string {
  if (!birthday) return '';
  
  const birthdayParts = birthday.includes('-') ? birthday.split('-') : null;
  if (!birthdayParts) return birthday;
  
  const month = parseInt(birthdayParts.length === 3 ? birthdayParts[1] : birthdayParts[0]);
  const day = parseInt(birthdayParts.length === 3 ? birthdayParts[2] : birthdayParts[1]);
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[month - 1]} ${day}`;
}

export default function CustomerInsights() {
  const { t } = useTranslation();

  // Fetch all customers for insights
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers/all'],
  });

  // Top 10 Spenders
  const topSpenders = [...customers]
    .sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
    .slice(0, 10);

  // Birthdays This Week - sorted by day of month (chronological)
  const birthdaysThisWeek = customers
    .filter(c => isBirthdayThisWeek(c.birthday))
    .sort((a, b) => {
      if (!a.birthday || !b.birthday) return 0;
      const aParts = a.birthday.split('-');
      const bParts = b.birthday.split('-');
      const aDay = parseInt(aParts.length === 3 ? aParts[2] : aParts[1]);
      const bDay = parseInt(bParts.length === 3 ? bParts[2] : bParts[1]);
      return aDay - bDay;
    });

  // Birthdays This Month - sorted by day of month (chronological)
  const birthdaysThisMonth = customers
    .filter(c => isBirthdayThisMonth(c.birthday))
    .sort((a, b) => {
      if (!a.birthday || !b.birthday) return 0;
      const aParts = a.birthday.split('-');
      const bParts = b.birthday.split('-');
      const aDay = parseInt(aParts.length === 3 ? aParts[2] : aParts[1]);
      const bDay = parseInt(bParts.length === 3 ? bParts[2] : bParts[1]);
      return aDay - bDay;
    });

  return (
    <div className="space-y-6">
      {/* Top 10 Spenders */}
      <Card>
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
            <div className="space-y-3">
              {topSpenders.map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover-elevate bg-muted/30"
                  data-testid={`top-spender-${index}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={customer.photo || undefined} />
                    <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <Badge className={tierColors[customer.tier as keyof typeof tierColors]}>
                    {customer.tier}
                  </Badge>
                  <div className="text-right">
                    <p className="font-bold text-lg">฿{parseFloat(customer.totalSpent).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground">{customer.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Birthdays This Week */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="w-5 h-5 text-pink-500" />
            Birthdays This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          {birthdaysThisWeek.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No birthdays this week</p>
          ) : (
            <div className="space-y-3">
              {birthdaysThisWeek.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover-elevate bg-pink-50/50"
                  data-testid={`birthday-week-${customer.id}`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={customer.photo || undefined} />
                    <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <Badge className={tierColors[customer.tier as keyof typeof tierColors]}>
                    {customer.tier}
                  </Badge>
                  <div className="text-right">
                    <p className="font-semibold text-pink-600">{getBirthdayDate(customer.birthday)}</p>
                    <p className="text-sm text-foreground">฿{parseFloat(customer.totalSpent).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground">{customer.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Birthdays This Month */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Birthdays This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {birthdaysThisMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No birthdays this month</p>
          ) : (
            <div className="space-y-3">
              {birthdaysThisMonth.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover-elevate bg-blue-50/50"
                  data-testid={`birthday-month-${customer.id}`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={customer.photo || undefined} />
                    <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <Badge className={tierColors[customer.tier as keyof typeof tierColors]}>
                    {customer.tier}
                  </Badge>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{getBirthdayDate(customer.birthday)}</p>
                    <p className="text-sm text-foreground">฿{parseFloat(customer.totalSpent).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground">{customer.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
