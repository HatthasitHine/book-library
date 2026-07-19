interface StatusMessageProps {
  message: string | null;
  tone?: "success" | "error";
}

export function StatusMessage({ message, tone = "success" }: StatusMessageProps) {
  if (!message) {
    return null;
  }

  if (tone === "error") {
    return <p className="status-message status-message--error" role="alert">{message}</p>;
  }

  return <p className="status-message status-message--success" role="status" aria-live="polite">{message}</p>;
}
