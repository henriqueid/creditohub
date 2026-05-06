export default function PageLoader() {
  return (
    <div
      className="flex items-center justify-center w-full"
      style={{ background: "var(--off)", minHeight: 200 }}
    >
      <div
        className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{
          borderColor: "rgba(10,21,56,0.10)",
          borderTopColor: "#00D49A",
        }}
      />
    </div>
  );
}
