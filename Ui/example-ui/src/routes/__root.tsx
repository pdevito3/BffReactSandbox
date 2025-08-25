import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { LogOut, MenuIcon } from "lucide-react";
import * as React from "react";
import { AppSidebar, MobileSidebarContent } from "~/components/app-sidebar";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { ModeToggle } from "~/components/mode-toggle";
import { NotFound } from "~/components/NotFound";
import { ThemeProvider } from "~/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { useAuth } from "~/hooks/use-auth";
import { useMediaQuery } from "~/hooks/use-media-query";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: NotFound,
  component: RootComponent,
});

function ResponsiveSidebar() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { user, userInitials, userName, userEmail, logout } = useAuth();

  if (isDesktop) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {/* <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Home</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        {/* <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Home</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb> */}
        <div className="ml-auto flex items-center gap-2">
          {user?.isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background border border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userName || "User"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userEmail || ""}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ModeToggle />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Outlet />
      </div>

      {/* Floating hamburger menu button - only on mobile */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden">
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Open Menu</span>
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="sr-only">Navigation</DrawerTitle>
            <DrawerDescription className="sr-only">
              Navigate through the application
            </DrawerDescription>
          </DrawerHeader>
          <MobileSidebarContent />
          <DrawerFooter className="pt-2"></DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function RootComponent() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="example-theme">
      <ResponsiveSidebar />
      <TanStackRouterDevtools position="bottom-left" />
    </ThemeProvider>
  );
}
