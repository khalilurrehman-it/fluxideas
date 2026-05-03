import { LandingHeroSection } from "./components/LandingHeroSection";
import { LandingAgentPipelineFeaturesSection } from "./components/LandingAgentPipelineFeaturesSection";
import { LandingCallToActionSection } from "./components/LandingCallToActionSection";

export default function LandingPage() {
  return (
    <>
      <LandingHeroSection />
      <LandingAgentPipelineFeaturesSection />
      <LandingCallToActionSection />
    </>
  );
}
