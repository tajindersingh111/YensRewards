import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  console.log('🔐 useAuth - User data:', user);
  console.log('🔐 useAuth - User role:', user?.role);
  console.log('🔐 useAuth - Is authenticated:', !!user);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
