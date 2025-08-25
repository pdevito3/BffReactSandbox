import { createFileRoute } from "@tanstack/react-router";
import { AuthButton } from "~/components/auth-button";
import { UserInfo } from "~/components/user-info";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Example UI</h1>
        <AuthButton />
      </div>

      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Welcome to the Example UI system. Please authenticate to access your
          dashboard.
        </p>

        <UserInfo />
      </div>
    </div>
  );
}
