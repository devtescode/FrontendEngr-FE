import { createFileRoute } from "@tanstack/react-router";

import { NavAppShell } from "@/components/NavAppShell";
import { CustomerPolicies } from "@/components/home/CustomerPolicies";
import { FeaturedComponents } from "@/components/home/FeaturedComponents";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LabLogistics } from "@/components/home/LabLogistics";
import { StatsSection } from "@/components/home/StatsSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { usePaginatedComponents } from "@/hooks/usePaginatedComponents";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EU Hardwarestore — Elizade University Hardware Hub" },
      {
        name: "description",
        content:
          "Order microcontrollers, sensors and lab components online from the Elizade University hardware hub and collect them on campus.",
      },
      {
        property: "og:title",
        content: "EU Hardwarestore — Elizade University Hardware Hub",
      },
      {
        property: "og:description",
        content:
          "Live stock, secure payment through Paystack, and campus pickup for Elizade University engineering students.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/logo.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const {
    components,
    pagination,
    page: componentsPage,
    setPage: setComponentsPage,
    loading: componentsLoading,
    refreshing: componentsRefreshing,
    error: componentsError,
    refresh: refreshComponents,
  } = usePaginatedComponents({
    pageSize: 6,
    sort: "createdAt",
    order: "desc",
    resetPageOnCreate: true,
  });

  return (
    <NavAppShell>
      <HeroSection />

      <div className="relative z-20 mx-auto -mt-10 max-w-7xl px-4 sm:px-6">
        <StatsSection
          totalItems={pagination.totalItems}
          loading={componentsLoading}
          error={Boolean(componentsError)}
        />
      </div>

      <HowItWorks />

      <FeaturedComponents
        components={components}
        pagination={pagination}
        page={componentsPage}
        loading={componentsLoading}
        refreshing={componentsRefreshing}
        error={componentsError}
        onPageChange={setComponentsPage}
        onRefresh={refreshComponents}
      />

      <LabLogistics components={components} loading={componentsLoading} />

      <TestimonialsSection />
      <CustomerPolicies />
    </NavAppShell>
  );
}
