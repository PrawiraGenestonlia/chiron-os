"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setMessage(errorDesc ?? error);
      notifyParent(false, error);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing authorization code or state parameter.");
      notifyParent(false, "missing_params");
      return;
    }

    // The actual token exchange happens server-side via the API callback route.
    // Redirect to API route which handles exchange and returns HTML with postMessage.
    const apiUrl = `/api/mcp-oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    window.location.href = apiUrl;
  }, [searchParams]);

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#0a0a0b",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        margin: 0,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        {status === "loading" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 1s linear infinite" }}>
              &#8635;
            </div>
            <h2 style={{ color: "#3b82f6", margin: "0 0 8px" }}>Connecting</h2>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
            <h2 style={{ color: "#22c55e", margin: "0 0 8px" }}>Connected</h2>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#10007;</div>
            <h2 style={{ color: "#ef4444", margin: "0 0 8px" }}>Connection Failed</h2>
          </>
        )}
        <p style={{ margin: "0 0 24px", fontSize: 14 }}>{message}</p>
        {status !== "loading" && (
          <p style={{ fontSize: 12, color: "#6b7280" }}>This window will close automatically.</p>
        )}
      </div>
    </div>
  );
}

function notifyParent(success: boolean, serverName: string) {
  if (typeof window !== "undefined" && window.opener) {
    window.opener.postMessage(
      { type: "mcp-oauth-complete", success, serverName },
      "*"
    );
  }
  if (!success) {
    setTimeout(() => window.close(), 3000);
  }
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            fontFamily: "system-ui",
            background: "#0a0a0b",
            color: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <p>Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
