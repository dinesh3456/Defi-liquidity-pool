import React, { createContext, useContext, useState, useCallback } from "react";
import { XCircle, CheckCircle2, Info } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: string; // Unique ID for each notification
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
  removeNotification: (id: string) => void;
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

  const removeDuplicates = (
    newNotification: Notification,
    currentNotifications: Notification[]
  ) => {
    return currentNotifications.filter(
      (notification) => notification.message !== newNotification.message
    );
  };

  const addNotification = useCallback(
    (message: string, type: NotificationType, txHash?: string) => {
      const id = uuidv4();
      const newNotification = { id, message, type, txHash };

      setNotifications((prev) => {
        const withoutDuplicates = removeDuplicates(newNotification, prev);
        return [...withoutDuplicates, newNotification];
      });

      const timeout = type === "info" ? 3000 : 5000;
      setTimeout(() => {
        removeNotification(id);
      }, timeout);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification }}
    >
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-lg shadow-lg
              min-w-[300px] max-w-[400px] transform transition-all
              ${
                notification.type === "success"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : notification.type === "error"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
          >
            <div className="flex items-center space-x-3">
              {notification.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : notification.type === "error" ? (
                <XCircle className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
              <div>
                <p className="font-medium">{notification.message}</p>
                {notification.txHash && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${notification.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline hover:opacity-80"
                  >
                    View transaction
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
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
      success: (message: string) => context.addNotification(message, "success"),
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
