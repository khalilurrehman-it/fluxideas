import { z } from "zod";

export const startMarketResearchJobRequestBodySchema = z.object({
  topicQuery: z
    .string()
    .min(3, "Topic must be at least 3 characters")
    .max(500, "Topic must be 500 characters or fewer")
    .trim(),
});

export type StartMarketResearchJobRequestBody = z.infer<
  typeof startMarketResearchJobRequestBodySchema
>;

export const selectProblemSchema = z.object({
  selected_problem: z.object({
    problem_name: z.string().min(1).max(200),
    market_gap: z.string().optional(),
    urgency_score: z.number().optional(),
    commercial_potential: z.number().optional(),
    feasibility_score: z.number().optional(),
    founder_fit_score: z.number().optional(),
    market_score: z.number().optional(),
    target_customer: z.string().optional(),
    description: z.string().optional(),
    sentiment: z.string().optional(),
    source_refs: z.array(z.any()).optional(),
  }),
});

export type SelectProblemRequestBody = z.infer<typeof selectProblemSchema>;
