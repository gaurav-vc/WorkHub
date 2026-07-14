// Path: src/siteStorage.ts

export const hydrateSitesFromApi = async () => {
  // Simulating an API call delay
  return new Promise((resolve) => setTimeout(resolve, 500));
};

export const listSites = () => {
  // Mock sites data for the dropdown
  return [
    { 
      id: "1", 
      siteName: "Main Headquarters", 
      moduleState: { 
        "core:my_tickets": true, 
        "operations:bookings": true,
        "financial:bills": true 
      } 
    },
    { 
      id: "2", 
      siteName: "Regional Branch", 
      moduleState: { 
        "core:my_tickets": true, 
        "operations:visitor_mgmt": true 
      } 
    }
  ];
};