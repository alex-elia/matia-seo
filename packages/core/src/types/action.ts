export type ActionType =
  | "create-page"
  | "update-metadata"
  | "update-geo-surface"
  | "update-content"
  | "fix-indexability"
  | "add-internal-links"
  | "submit-indexing"
  | "enrich-registry"
  | "recommend-ads";

export type ActionStatus =
  | "proposed"
  | "approved"
  | "executing"
  | "blocked"
  | "done"
  | "rejected";

export interface SeoAction {
  id: string;
  project: string;
  type: ActionType;
  status: ActionStatus;
  rationale: string;
  targetUrl?: string;
  payload: Record<string, unknown>;
  proposedAt: string;
  approvedAt?: string;
  executedAt?: string;
  outcome?: string;
}
