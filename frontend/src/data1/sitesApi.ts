// Path: src/api/sitesApi.ts

export const getSiteFeaturesFromApi = async (siteId: string | number) => {
  // Simulating fetching enabled features for the selected site
  return [
    { feature_name: "TICKETS_ENABLED" },
    { feature_name: "BOOKINGS_ENABLED" },
    { feature_name: "VISITOR_MGMT_ENABLED" },
    { feature_name: "BILLING_ENABLED" }
  ];
};

// Maps backend feature flags to frontend module keys
export const SITE_FEATURE_TO_MODULE_KEY: Record<string, string> = {
  "TICKETS_ENABLED": "core:my_tickets",
  "BOOKINGS_ENABLED": "operations:bookings",
  "VISITOR_MGMT_ENABLED": "operations:visitor_mgmt",
  "BILLING_ENABLED": "financial:bills"
};