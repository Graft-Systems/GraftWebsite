import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SnapPhotoSection from "@/components/SnapPhotoSection";
import VineTracker from "@/components/VineTracker";
import MLEstimationSection from "@/components/MLEstimationSection";
import EstimationGraphSection from "@/components/EstimationGraphSection";
import GeoLocatorSection from "@/components/GeoLocatorSection";
import BarrelBenefitsSection from "@/components/BarrelBenefitsSection";
import TryToolSection from "@/components/TryToolSection";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <VineTracker />
      <HeroSection />
      <SnapPhotoSection />
      <MLEstimationSection />
      <EstimationGraphSection />
      <GeoLocatorSection />
      <BarrelBenefitsSection />
      <TryToolSection />
    </div>
  );
}
