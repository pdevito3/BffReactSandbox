import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/svgs/loading-spinner";
import { myAppApi } from "~/lib/api";
import { useState } from "react";

export const Route = createFileRoute("/api-test")({
  component: ApiTestComponent,
});

function ApiTestComponent() {
  const [healthData, setHealthData] = useState<any>(null);
  const [protectedData, setProtectedData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [protectedLoading, setProtectedLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [protectedError, setProtectedError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const response = await myAppApi.get("/health");
      setHealthData(response.data);
    } catch (error: any) {
      setHealthError(error?.response?.data?.message || error.message || "Failed to fetch health data");
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchProtectedData = async () => {
    setProtectedLoading(true);
    setProtectedError(null);
    try {
      const response = await myAppApi.get("/data");
      setProtectedData(response.data);
    } catch (error: any) {
      setProtectedError(error?.response?.data?.message || error.message || "Failed to fetch protected data");
    } finally {
      setProtectedLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">API Test Page</h1>
        <p className="text-muted-foreground">
          Test the API proxy through the BFF with anonymous and authenticated endpoints
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Anonymous Endpoint Card */}
        <Card>
          <CardHeader>
            <CardTitle>Anonymous Endpoint</CardTitle>
            <CardDescription>
              Test the <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/health</code> endpoint
              (no authentication required)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchHealth} disabled={healthLoading} className="w-full">
              {healthLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Loading...
                </>
              ) : (
                "Fetch Health Data"
              )}
            </Button>

            {healthError && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
                <strong>Error:</strong> {healthError}
              </div>
            )}

            {healthData && (
              <div className="p-4 bg-muted rounded-md">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(healthData, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Protected Endpoint Card */}
        <Card>
          <CardHeader>
            <CardTitle>Protected Endpoint</CardTitle>
            <CardDescription>
              Test the <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/data</code> endpoint
              (requires authentication)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchProtectedData} disabled={protectedLoading} className="w-full">
              {protectedLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Loading...
                </>
              ) : (
                "Fetch Protected Data"
              )}
            </Button>

            {protectedError && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
                <strong>Error:</strong> {protectedError}
              </div>
            )}

            {protectedData && (
              <div className="p-4 bg-muted rounded-md">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(protectedData, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1. Anonymous Endpoint (/api/health):</strong> This endpoint is publicly accessible and
            does not require authentication. It demonstrates basic API proxying through the BFF.
          </p>
          <p>
            <strong>2. Protected Endpoint (/api/data):</strong> This endpoint requires authentication. The
            BFF automatically attaches the access token from your authenticated session to the request
            when proxying to the API.
          </p>
          <p>
            <strong>3. Token Flow:</strong> When you log in through the BFF, it obtains an access token
            from Authgear with the "myapp-api" audience. This token is stored in your session and
            automatically included in proxied API requests.
          </p>
          <p>
            <strong>4. API Validation:</strong> The AppApi validates the JWT token, checking the issuer,
            audience, and signature before granting access to protected endpoints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
