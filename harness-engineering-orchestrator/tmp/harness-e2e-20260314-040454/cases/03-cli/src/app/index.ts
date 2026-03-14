export interface ScaffoldSummary {
  name: string;
  projectType: string;
  description: string;
}

export const scaffoldSummary: ScaffoldSummary = {
  name: "detailed-cli",
  projectType: "Monorepo + CLI",
  description: "Detailed CLI prepared with the Harness Engineering and Orchestrator workflow.",
};

export function getScaffoldSummary(): ScaffoldSummary {
  return scaffoldSummary;
}
