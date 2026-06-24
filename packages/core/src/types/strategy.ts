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
    notes?: string;
    evidence?: string[];
    hypothesisQueries?: string[];
  }>;
  geoEntities: Array<{
    name: string;
    type: string;
    surfaces: string[];
  }>;
  signalDetection?: Array<{
    id: string;
    source: "gsc" | "sales" | "competitor-serp" | "geo-probe" | "manual";
    hypothesis: string;
    evidenceRequired: string[];
    status: "hypothesis" | "validated" | "rejected";
  }>;
  contentPrinciples: string[];
  adsTriggers?: string[];
}
