import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="text-center max-w-lg">
        <h1 className="text-8xl font-extrabold text-coral mb-4">404</h1>
        <h2 className="text-2xl font-extrabold text-navy mb-4">Page Not Found</h2>
        <p className="text-slate-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button
          onClick={() => (window.location.href = "/")}
          className="bg-coral hover:bg-coral-dark text-white font-semibold px-8 py-5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/20"
        >
          Back to Home
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
