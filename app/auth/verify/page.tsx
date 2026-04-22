export default function VerifyRequest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Check your email</h1>
        <p className="text-gray-600 mb-4">
          A sign in link has been sent to your email address. Please check your inbox and click the link to complete your sign in.
        </p>
        <p className="text-sm text-gray-500">
          If you don&apos;t see the email, check your spam folder.
        </p>
      </div>
    </div>
  );
}
