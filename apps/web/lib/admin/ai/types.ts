export type CaptureSource = "in_app_voice" | "paste" | "wispr_api";

export type SuggestedCaptureTask = {
  title: string;
  description?: string;
  dueInDays?: number;
};

export type StructuredCapture = {
  provider: "groq" | "heuristic";
  summary: string;
  needsBullets: string[];
  suggestedTasks: SuggestedCaptureTask[];
  interactionType: string;
  stageHint: string | null;
  tagHints: string[];
};

export type CaptureCompanyContext = {
  companyName: string;
  needs: string | null;
  tags: string[];
  stageKeys: string[];
};
