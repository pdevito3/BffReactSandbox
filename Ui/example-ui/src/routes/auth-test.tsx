import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useAuth } from "~/hooks/use-auth";
import { myAppApi } from "~/lib/api";

export const Route = createFileRoute("/auth-test")({
  component: ApiTest,
});

interface PublicResponse {
  message: string;
  timestamp: string;
}

interface SecureResponse {
  message: string;
  data?: string;
  timestamp: string;
}

function ApiTest() {
  const { isAuthenticated, userName, login } = useAuth();
  const [publicName, setPublicName] = useState("");
  const [secureName, setSecureName] = useState("");
  const [secureData, setSecureData] = useState("");

  const publicMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await myAppApi.post<PublicResponse>("/public", { name });
      return response.data;
    },
  });

  const secureMutation = useMutation({
    mutationFn: async ({ name, data }: { name: string; data: string }) => {
      const response = await myAppApi.post<SecureResponse>("/secure", {
        name,
        data,
      });
      return response.data;
    },
  });

  const handlePublicTest = () => {
    publicMutation.mutate(publicName);
  };

  const handleSecureTest = () => {
    secureMutation.mutate({ name: secureName, data: secureData });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Endpoint Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test the public and secure endpoints of the TestApi through the BFF
          proxy
        </p>
      </div>

      {!isAuthenticated && (
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be authenticated to test the secure endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => login()}>Login</Button>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && (
        <Card className="border-green-500">
          <CardContent className="pt-6">
            <p className="text-sm">
              Authenticated as:{" "}
              <span className="font-semibold">{userName}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Public Endpoint Test */}
        <Card>
          <CardHeader>
            <CardTitle>Public Endpoint</CardTitle>
            <CardDescription>
              POST /api/public - No authentication required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="public-name">Name</Label>
              <Input
                id="public-name"
                placeholder="Enter your name"
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
              />
            </div>

            <Button
              onClick={handlePublicTest}
              disabled={publicMutation.isPending}
              className="w-full"
            >
              {publicMutation.isPending ? "Testing..." : "Test Public Endpoint"}
            </Button>

            {publicMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-600">
                  {publicMutation.error.message}
                </p>
              </div>
            )}

            {publicMutation.isSuccess && publicMutation.data && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium">Success</p>
                <p className="text-sm text-green-700">
                  {publicMutation.data.message}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {new Date(publicMutation.data.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Secure Endpoint Test */}
        <Card>
          <CardHeader>
            <CardTitle>Secure Endpoint</CardTitle>
            <CardDescription>
              POST /api/secure - Authentication required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secure-name">Name</Label>
              <Input
                id="secure-name"
                placeholder="Enter your name"
                value={secureName}
                onChange={(e) => setSecureName(e.target.value)}
                disabled={!isAuthenticated}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secure-data">Data</Label>
              <Input
                id="secure-data"
                placeholder="Enter some data"
                value={secureData}
                onChange={(e) => setSecureData(e.target.value)}
                disabled={!isAuthenticated}
              />
            </div>

            <Button
              onClick={handleSecureTest}
              disabled={!isAuthenticated || secureMutation.isPending}
              className="w-full"
            >
              {secureMutation.isPending ? "Testing..." : "Test Secure Endpoint"}
            </Button>

            {secureMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-600">
                  {secureMutation.error.message}
                </p>
              </div>
            )}

            {secureMutation.isSuccess && secureMutation.data && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium">Success</p>
                <p className="text-sm text-green-700">
                  {secureMutation.data.message}
                </p>
                {secureMutation.data.data && (
                  <p className="text-sm text-green-600 mt-1">
                    Data: {secureMutation.data.data}
                  </p>
                )}
                <p className="text-xs text-green-600 mt-1">
                  {new Date(secureMutation.data.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
