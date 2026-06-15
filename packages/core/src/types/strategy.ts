export interface SiteStrategyProfile {
  project: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  goals: {
    primary: string;
    secondary?: string[];
    horizon: "90d" | "6m" | "12m";
    successMetrics: string[];
  };
  icp: {
    personas: Array<{
      name: string;
      geography: string[];
      painPoints: string[];
      searchBehavior: string[];
      languages: string[];
    }>;
    antiPersonas?: string[];
  };
  positioning: {
    valueProposition: string;
    differentiators: string[];
    competitors?: string[];
    partnerSites?: Array<{ project: string; url: string }>;
  };
  intentMap: Array<{
    intent: string;
    type: "commercial" | "informational" | "navigational" | "geo-entity";
    priority: "high" | "medium" | "low";
    targetPages: string[];
    status: "covered" | "partial" | "missing";
  }>;
  geoEntities: string[];
  contentPrinciples: string[];
  adsTriggers?: string[];
}
