import { Spinner } from "@/components/ui/spinner";

export default function AuthLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <Spinner size={32} />
    </div>
  );
}
