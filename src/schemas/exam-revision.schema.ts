import * as yup from "yup";

// Plate JSON is an array. A "blank" plate document is [{type:'p',children:[{text:''}]}].
// We consider content empty if every text leaf is an empty string.
function hasPlateContent(value: string): boolean {
  try {
    const nodes = JSON.parse(value);
    if (!Array.isArray(nodes)) return value.trim().length > 0;
    const checkNodes = (arr: unknown[]): boolean =>
      arr.some((n) => {
        if (typeof n !== "object" || !n) return false;
        const node = n as Record<string, unknown>;
        if ("text" in node) return (node.text as string).trim().length > 0;
        if (Array.isArray(node.children)) return checkNodes(node.children as unknown[]);
        return false;
      });
    return checkNodes(nodes);
  } catch {
    return value.trim().length > 0;
  }
}

export const examTypeSchema = yup.object({
  name: yup.string().required("Name is required"),
  description: yup.string().nullable().default(null),
  minSubjectsSelectable: yup
    .number()
    .min(1)
    .required("Min subjects is required"),
  maxSubjectsSelectable: yup
    .number()
    .min(1)
    .required("Max subjects is required"),
  freeTierQuestionLimit: yup.number().min(0).default(50),
  supportedCategories: yup
    .array(yup.string().required())
    .min(1, "Select at least one category")
    .required(),
});
export type ExamTypeValues = yup.InferType<typeof examTypeSchema>;

export const subjectSchema = yup.object({
  name: yup.string().required("Name is required"),
  description: yup.string().nullable().default(null),
  isActive: yup.boolean().default(true),
  isAlsoPractical: yup.boolean().default(false),
});
export type SubjectValues = yup.InferType<typeof subjectSchema>;

export const topicSchema = yup.object({
  subjectId: yup.string().required("Subject is required"),
  name: yup.string().required("Name is required"),
  content: yup.string().nullable().default(null),
});
export type TopicValues = yup.InferType<typeof topicSchema>;

export const passageSchema = yup.object({
  examTypeSubjectIds: yup
    .array(yup.string().required())
    .min(1, "Select at least one Exam Type / Subject")
    .required(),
  title: yup.string().required("Title is required"),
  content: yup.string().required("Content is required"),
});
export type PassageValues = yup.InferType<typeof passageSchema>;

export const questionSchema = yup.object({
  examTypeSubjectIds: yup
    .array(yup.string().required())
    .min(1, "Select at least one Exam Type / Subject")
    .required(),
  questionText: yup
    .string()
    .required("Question text is required")
    .test("has-content", "Question text cannot be empty", (v) => !v || hasPlateContent(v)),
  type: yup.string().required("Question type is required"),
  category: yup.string().required("Category is required"),
  difficulty: yup.string().required("Difficulty is required"),
  marks: yup.number().min(0.5).default(1),
  explanation: yup.string().nullable().default(null),
  topicId: yup.string().nullable().default(null),
  passageId: yup.string().nullable().default(null),
  correctAnswerText: yup.string().nullable().default(null),
});
export type QuestionValues = yup.InferType<typeof questionSchema>;
