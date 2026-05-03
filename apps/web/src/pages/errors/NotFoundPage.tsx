import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { TbRadar2, TbArrowLeft } from "react-icons/tb";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <TbRadar2 className="w-12 h-12 text-primary/50 mx-auto mb-6" />
        <h1 className="text-6xl font-extrabold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Nothing on radar at this location.
        </p>
        <Button
          asChild
          size="lg"
          className="h-11 px-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-2 shadow-md transition-all"
        >
          <Link to="/">
            <TbArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
