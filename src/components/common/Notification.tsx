// src/components/common/NotificationContainer.tsx
import { useNotification } from "@/contexts/NotificationContext";
import { ExternalLink, X } from "lucide-react";

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(({ id, message, type, txHash }) => (
        <div
          key={id}
          className={`p-4 rounded-lg shadow-lg min-w-[300px] max-w-[400px] flex items-center justify-between ${
            type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : type === "error"
              ? "bg-red-100 text-red-800 border border-red-200"
              : "bg-blue-100 text-blue-800 border border-blue-200"
          }`}
        >
          <div className="flex flex-col">
            <p className="font-medium">{message}</p>
            {txHash && (
              <a
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm mt-1 hover:underline"
              >
                View transaction <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            )}
          </div>
          <button
            onClick={() => removeNotification(id)}
            className="ml-4 text-current hover:opacity-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
