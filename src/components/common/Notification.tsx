import { ExternalLink, X } from "lucide-react";
import { useNotification } from "../../contexts/NotificationContext";

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(({ id, message, type, txHash }) => (
        <div
          key={id}
          className={`p-4 rounded-lg shadow-lg flex items-center justify-between space-x-4 ${
            type === "success"
              ? "bg-green-100 text-green-800"
              : type === "error"
              ? "bg-red-100 text-red-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          <div className="flex items-center space-x-2">
            <span>{message}</span>
            {txHash && (
              <a
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-current hover:underline"
              >
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            )}
          </div>
          <button
            onClick={() => removeNotification(id)}
            className="text-current"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
