"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  FileText, 
  Star,
  Settings, 
  Flag,
  BarChart2,
  Menu,
  X,
  Search,
  Database
} from "lucide-react";
import { useSession } from "next-auth/react";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: ShoppingBag,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: FileText,
  },
  {
    title: "Reviews",
    href: "/admin/reviews",
    icon: Star,
    submenu: [
      {
        title: "Overview",
        href: "/admin/reviews",
      },
      {
        title: "Moderation",
        href: "/admin/reviews/moderation",
      },
      {
        title: "Analytics",
        href: "/admin/reviews/analytics",
        badge: "New"
      },
      {
        title: "Content Filtering",
        href: "/admin/reviews/filter-config",
        badge: "New"
      },
    ],
  },
  {
    title: "Database",
    href: "/admin/database",
    icon: Database,
    submenu: [
      {
        title: "Dashboard",
        href: "/admin/database",
      },
      {
        title: "KV Migration",
        href: "/admin/database/migrate",
        badge: "New"
      },
    ],
  },
  {
    title: "Search",
    href: "/admin/search",
    icon: Search,
    submenu: [
      {
        title: "Analytics",
        href: "/admin/search/analytics",
        badge: "New"
      },
      {
        title: "Relevance Tuning",
        href: "/admin/search/relevance",
        badge: "New"
      },
    ],
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart2,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  
  // Handle expanding/collapsing submenus
  const toggleSubmenu = (title: string) => {
    if (expandedMenu === title) {
      setExpandedMenu(null);
    } else {
      setExpandedMenu(title);
    }
  };
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
  // Auto-expand submenu based on current path
  useEffect(() => {
    navItems.forEach(item => {
      if (item.submenu && item.submenu.some(subItem => pathname.startsWith(subItem.href))) {
        setExpandedMenu(item.title);
      }
    });
  }, [pathname]);
  
  if (!session) {
    return null;
  }
  
  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          className="bg-primary text-white p-2 rounded-md"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:sticky top-0 h-screen bg-gray-50 border-r border-gray-200 w-64 transition-all duration-300 ease-in-out z-40",
          isMobileMenuOpen ? "left-0" : "-left-64 lg:left-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-6">
            <h2 className="text-xl font-bold">AgriSmart Admin</h2>
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <div key={item.title} className="mb-1">
                {item.submenu ? (
                  // Menu item with submenu
                  <>
                    <button
                      onClick={() => toggleSubmenu(item.title)}
                      className={cn(
                        "flex items-center w-full px-4 py-2 rounded-md text-left transition-colors",
                        pathname.startsWith(item.href)
                          ? "bg-gray-200"
                          : "hover:bg-gray-100"
                      )}
                    >
                      <item.icon className="h-5 w-5 mr-2" />
                      <span>{item.title}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={cn(
                          "h-4 w-4 ml-auto transition-transform",
                          expandedMenu === item.title && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    
                    {/* Submenu */}
                    <div
                      className={cn(
                        "pl-10 space-y-1 mt-1",
                        expandedMenu === item.title ? "block" : "hidden"
                      )}
                    >
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.title}
                          href={subItem.href}
                          className={cn(
                            "flex items-center py-2 px-4 rounded-md relative",
                            pathname === subItem.href
                              ? "bg-gray-200"
                              : "hover:bg-gray-100"
                          )}
                        >
                          <span>{subItem.title}</span>
                          {subItem.badge && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-white rounded-md">
                              {subItem.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  // Regular menu item
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-2 rounded-md",
                      pathname === item.href
                        ? "bg-gray-200"
                        : "hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-2" />
                    <span>{item.title}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
          
          <div className="mt-auto px-6 py-4">
            <div className="text-xs text-gray-500">
              <p>Logged in as:</p>
              <p className="font-medium truncate">{session.user?.name || session.user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
