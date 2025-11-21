export default function LoadingSplash() {
  return (
    <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Loading CAD Editor</h2>
        <p className="text-gray-400">Initializing 3D engine...</p>
      </div>
    </div>
  );
}
