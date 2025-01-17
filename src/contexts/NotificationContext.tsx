import React, { createContext, useContext, useState, useCallback } from "react";
import { XCircle, CheckCircle2, Info } from "lucide-react";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  txHash?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    message: string,
    type: NotificationType,
    txHash?: string
  ) => void;
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (message: string, type: NotificationType, txHash?: string) => {
      const id = Date.now();
      setNotifications((prev) => [...prev, { id, message, type, txHash }]);
      const timeout = type === "info" ? 5000 : 8000;
      // Auto remove after 5 seconds
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    },
    []
  );

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification }}
    >
      {children}
      {/* Notification Display */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map(({ id, message, type, txHash }) => (
          <div
            key={id}
            className={`
              flex items-center justify-between p-4 rounded-lg shadow-lg min-w-[300px] max-w-[400px]
              ${
                type === "success"
                  ? "bg-green-100 text-green-800"
                  : type === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }
            `}
          >
            <div className="flex items-center space-x-3">
              {type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : type === "error" ? (
                <XCircle className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
              <div>
                <p className="font-medium">{message}</p>
                {txHash && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline"
                  >
                    View transaction
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => removeNotification(id)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return {
    ...context,
    notify: {
      success: (message: string, txHash?: string) =>
        context.addNotification(message, "success", txHash),
      error: (message: string) => context.addNotification(message, "error"),
      info: (message: string) => context.addNotification(message, "info"),
    },
    transaction: {
      success: (message: string, txHash?: string) =>
        context.addNotification(message, "success", txHash),
      error: (message: string) => context.addNotification(message, "error"),
      pending: (message: string) => context.addNotification(message, "info"),
    },
  };
}
