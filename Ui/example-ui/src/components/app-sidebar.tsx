import { LogOut, ChevronRight } from "lucide-react";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useAuth } from "~/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "~/components/ui/sidebar";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Main Navigation",
      url: "#",
      items: [
        {
          title: "Home",
          url: "/",
        },
        {
          title: "Posts",
          url: "/posts",
        },
        {
          title: "Users",
          url: "/users",
        },
      ],
    },
    {
      title: "Examples",
      url: "#",
      items: [
        {
          title: "Pathless Layout",
          url: "/route-a",
        },
        {
          title: "Deferred",
          url: "/deferred",
        },
      ],
    },
  ],
};

export function MobileSidebarContent() {
  const { user, userInitials, userName, userEmail, logout } = useAuth();
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 p-2">
        <div className="flex flex-col gap-0.5 leading-none">
          <Link to="/" className="flex items-center gap-2 p-2">
            <div className="flex flex-col gap-0.5 leading-none">
              <p className="font-semibold text-xl text-primary">Example UI</p>
            </div>
          </Link>
        </div>
      </div>
      <div className="flex-1 p-2">
        <div className="flex flex-col gap-1">
          {data.navMain.map((item, index) => {
            const [isOpen, setIsOpen] = React.useState(index === 1);
            
            return (
              <div key={item.title}>
                <button 
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex w-full items-center justify-between rounded-md p-2 text-left text-sm hover:bg-accent"
                >
                  {item.title}
                  <motion.span
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                    className="flex"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {isOpen && item.items?.length && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                      className="ml-4 flex flex-col gap-1 border-l pl-4 overflow-hidden"
                    >
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.title}
                          to={subItem.url}
                          className="block rounded-md p-2 text-sm hover:bg-accent"
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      
      {user?.isAuthenticated && (
        <div className="border-t p-2">
          <div className="flex items-center gap-2 p-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={undefined} />
              <AvatarFallback className="text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {userName || 'User'}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {userEmail || ''}
              </span>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, userInitials, userName, userEmail, logout } = useAuth();
  
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex flex-col gap-0.5 leading-none">
                  <p className="font-semibold text-xl text-primary">
                    Example UI
                  </p>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* <SearchForm /> */}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item, index) => {
              const [isOpen, setIsOpen] = React.useState(index === 1);
              
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton onClick={() => setIsOpen(!isOpen)}>
                    {item.title}{" "}
                    <motion.span
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                      className="ml-auto flex"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.span>
                  </SidebarMenuButton>
                  <AnimatePresence>
                    {isOpen && item.items?.length && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                        className="overflow-hidden"
                      >
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <Link to={subItem.url}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
      {user?.isAuthenticated && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userName || 'User'}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userEmail || ''}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
