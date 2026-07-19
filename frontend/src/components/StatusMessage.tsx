interface StatusMessageProps {
  message: string | null;
  tone?: "success" | "error";
}

export function StatusMessage({ message, tone = "success" }: StatusMessageProps) {
  if (!message) {
    return null;
  }

  return <p role={tone === "error" ? "alert" : "status"}>{message}</p>;
}
