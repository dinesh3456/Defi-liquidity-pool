import { useNotification as useNotificationContext } from "../contexts/NotificationContext";

export function useNotification() {
  const { addNotification } = useNotificationContext();

  const notify = {
    success: (message: string, txHash?: string) => {
      addNotification(message, "success", txHash);
    },

    error: (message: string, txHash?: string) => {
      addNotification(message, "error", txHash);
    },

    info: (message: string, txHash?: string) => {
      addNotification(message, "info", txHash);
    },

    transaction: {
      pending: (message: string = "Transaction Pending...") => {
        addNotification(message, "info");
      },

      success: (
        message: string = "Transaction Successful",
        txHash?: string
      ) => {
        addNotification(message, "success", txHash);
      },

      error: (message: string = "Transaction Failed") => {
        addNotification(message, "error");
      },
    },
  };

  return notify;
}
