export default function VersionCheck() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg p-12 text-center shadow-2xl max-w-2xl">
        <div className="text-8xl mb-6 animate-bounce">✅</div>
        <h1 className="text-6xl font-bold text-green-600 mb-4">
          VERSION 20 IS LIVE!
        </h1>
        <p className="text-3xl text-gray-700 mb-6">
          Camera fixes are deployed and ready to test!
        </p>
        <div className="bg-green-100 border-4 border-green-500 rounded-lg p-6 mb-6">
          <p className="text-2xl font-bold text-green-800">
            Cache Version: v20
          </p>
          <p className="text-xl text-green-700 mt-2">
            Last Updated: {new Date().toLocaleString()}
          </p>
        </div>
        <p className="text-lg text-gray-600">
          If you can see this page, the new code is successfully deployed!
        </p>
      </div>
    </div>
  );
}
