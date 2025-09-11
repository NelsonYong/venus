"use client";

import { ProtectedRoute } from "./components/auth/protected-route";
import { ChatBot } from "./components/chat/chat-bot";

function ProtectedChatPage() {
  return (
    <ProtectedRoute>
      <ChatBot />
    </ProtectedRoute>
  );
}

export default ProtectedChatPage;
