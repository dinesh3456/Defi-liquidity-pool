import { useNotification } from "../contexts/NotificationContext";

export function useTransaction() {
  const { addNotification } = useNotification();

  const handleTransaction = async (
    transactionPromise: Promise<any>,
    messages: {
      pending?: string;
      success?: string;
      error?: string;
    }
  ) => {
    try {
      const tx = await transactionPromise;

      if (messages.pending) {
        addNotification(messages.pending, "info");
      }

      const receipt = await tx.wait();

      if (messages.success) {
        addNotification(messages.success, "success", receipt.transactionHash);
      }

      return receipt;
    } catch (error: any) {
      if (messages.error) {
        addNotification(messages.error, "error");
      }
      throw error;
    }
  };

  return { handleTransaction };
}
