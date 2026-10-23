export default function AudioLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50 text-slate-800 flex flex-col">
      {children}
    </div>
  );
}



