"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Icon } from "@iconify/react";
import { v4 as uuidv4 } from "uuid";
import { api } from "@/src/lib/api";
import { handleAxiosError } from "@/src/utils";
import { toast } from "sonner";
import { useExamRevisionStore } from "@/src/store/exam-revision.store";
import { useAdminUtilsStore } from "@/src/store/utils.store";
import { InputField } from "@/src/components/molecules/InputField";
import { PlateEditor } from "@/src/components/molecules/PlateEditor";
import { Button, Radio, CheckBox } from "@/src/components/atoms";
import { IQuestion, ITopic, IPassage } from "@/src/types";
import type { TDiscussion } from "@/src/components/editor/plugins/discussion-kit";
import {
  questionSchema,
  QuestionValues,
} from "@/src/schemas/exam-revision.schema";
import { CARD_SHADOW } from "@/src/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPES = [
  {
    value: "multiple_choice",
    label: "Multiple Choice",
    icon: "hugeicons:radio-button",
    short: "MC",
  },
  {
    value: "multiple_response",
    label: "Multi-Select",
    icon: "hugeicons:keyframes-multiple",
    short: "MR",
  },
  {
    value: "true_false",
    label: "True / False",
    icon: "hugeicons:task-done-02",
    short: "T/F",
  },
  {
    value: "fill_in_the_blank",
    label: "Fill in Blank",
    icon: "hugeicons:input-text",
    short: "FIB",
  },
  {
    value: "short_answer",
    label: "Short Answer",
    icon: "hugeicons:message-edit-01",
    short: "SA",
  },
  { value: "essay", label: "Essay", icon: "hugeicons:file-edit", short: "ES" },
  {
    value: "matching",
    label: "Matching",
    icon: "hugeicons:link-02",
    short: "↔",
  },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", color: "#099137", bg: "#ECFDF3" },
  { value: "medium", label: "Medium", color: "#F3A218", bg: "#FFFAEB" },
  { value: "hard", label: "Hard", color: "#D42620", bg: "#FEF3F2" },
] as const;

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionEntry = { id: string; text: string; contentFormat: 'markdown' | 'plate'; isCorrect: boolean };
type MatchPair = { id: string; left: string; right: string };

interface QuestionFormProps {
  editQuestion?: IQuestion;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuestionForm({ editQuestion }: QuestionFormProps) {
  const router = useRouter();
  const { examTypes, fetchExamTypes, examTypeSubjects, fetchExamTypeSubjects } =
    useExamRevisionStore();
  const { uploadImage } = useAdminUtilsStore();

  const [topics, setTopics] = useState<ITopic[]>([]);
  const [passages, setPassages] = useState<IPassage[]>([]);
  const [options, setOptions] = useState<OptionEntry[]>(() => {
    if (!editQuestion?.options?.length) {
      return [
        { id: uuidv4(), text: "", contentFormat: "plate" as const, isCorrect: false },
        { id: uuidv4(), text: "", contentFormat: "plate" as const, isCorrect: false },
      ];
    }
    const ca = editQuestion.correctAnswer;
    const caArr = Array.isArray(ca) ? (ca as string[]) : null;
    const computed = editQuestion.options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      contentFormat: (opt.contentFormat ?? "markdown") as "markdown" | "plate",
      isCorrect: caArr
        ? caArr.includes(opt.id) || caArr.includes(opt.text)
        : ca === opt.id || ca === opt.text || !!opt.isCorrect,
    }));
    // If nothing matched (stale/corrupted correctAnswer), fall back to stored isCorrect flags
    const anyCorrect = computed.some((o) => o.isCorrect);
    const result = anyCorrect
      ? computed
      : editQuestion.options.map((opt, i) => ({
          ...computed[i],
          isCorrect: !!opt.isCorrect,
        }));
    return result;
  });
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>(() => {
    if (editQuestion?.type === "matching" && editQuestion.correctAnswer) {
      return Object.entries(
        editQuestion.correctAnswer as Record<string, string>,
      ).map(([left, right]) => ({ id: uuidv4(), left, right }));
    }
    return [
      { id: uuidv4(), left: "", right: "" },
      { id: uuidv4(), left: "", right: "" },
    ];
  });
  const [saving, setSaving] = useState(false);
  const [discussions, setDiscussions] = useState<TDiscussion[]>(
    () => (editQuestion?.discussions as TDiscussion[] | undefined) ?? [],
  );
  const [discussionsChanged, setDiscussionsChanged] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(
    !!editQuestion?.explanation,
  );
  const [optionsChanged, setOptionsChanged] = useState(false);
  const [matchPairsChanged, setMatchPairsChanged] = useState(false);
  const [plateEdited, setPlateEdited] = useState(false);
  const passageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeStateRef = useRef<
    Record<
      string,
      { options: OptionEntry[]; matchPairs: MatchPair[]; correctAnswerText: string }
    >
  >({});

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, dirtyFields },
    resetField,
  } = useForm<QuestionValues>({
    resolver: yupResolver(questionSchema),
    mode: "onChange",
    defaultValues: {
      examTypeSubjectIds:
        editQuestion?.examTypeSubjects?.map((e) => e.id) ?? [],
      questionText: editQuestion?.questionText ?? "",
      type: editQuestion?.type ?? "multiple_choice",
      category: editQuestion?.category ?? "objectives",
      difficulty: editQuestion?.difficulty ?? "medium",
      marks: editQuestion?.marks ?? 1,
      explanation: editQuestion?.explanation ?? "",
      topicId: editQuestion?.topicId ?? "",
      passageId: editQuestion?.passageId ?? "",
      correctAnswerText:
        typeof editQuestion?.correctAnswer === "string"
          ? (editQuestion.correctAnswer as string)
          : Array.isArray(editQuestion?.correctAnswer)
            ? (editQuestion.correctAnswer as string[]).join("\n")
            : "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const questionType = watch("type");
  const selectedEtsIds = watch("examTypeSubjectIds") ?? [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _questionText = watch("questionText");

  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (examTypes.length === 0) fetchExamTypes();
    if (examTypeSubjects.length === 0) fetchExamTypeSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedEtsIds.length === 0) {
      setTopics([]);
      setPassages([]);
      return;
    }
    const selectedEts = examTypeSubjects.filter((e) =>
      selectedEtsIds.includes(e.id),
    );
    const uniqueSubjectIds = [...new Set(selectedEts.map((e) => e.subjectId))];
    if (uniqueSubjectIds.length === 1) {
      api
        .get<{ data: { items: ITopic[] } }>(
          `/admin/exam-revision/topics?subjectId=${uniqueSubjectIds[0]}&limit=200`,
        )
        .then((res) => setTopics(res.data.data.items ?? []))
        .catch(() => {});
    } else {
      setTopics([]);
    }
    if (passageTimerRef.current) clearTimeout(passageTimerRef.current);
    passageTimerRef.current = setTimeout(() => {
      api
        .get<{ data: { items: IPassage[] } }>(
          `/admin/exam-revision/passages?etsIds=${selectedEtsIds.join(",")}&limit=200`,
        )
        .then((res) => setPassages(res.data.data.items ?? []))
        .catch(() => {});
    }, 300);
    return () => {
      if (passageTimerRef.current) clearTimeout(passageTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEtsIds.join(","), examTypeSubjects.length]);

  // ─── Derived options ───────────────────────────────────────────────────────

  const selectedEts = examTypeSubjects.filter((e) =>
    selectedEtsIds.includes(e.id),
  );
  const examTypeIdsInSel = [...new Set(selectedEts.map((e) => e.examTypeId))];
  const categoryOptions = (() => {
    const all = new Set<string>();
    for (const et of examTypes) {
      if (examTypeIdsInSel.includes(et.id))
        for (const c of et.supportedCategories ?? []) all.add(c);
    }
    const cats = all.size > 0 ? [...all] : ["objectives"];
    return cats.map((c) => ({
      value: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
    }));
  })();

  const etsOptions = examTypeSubjects.map((e) => ({
    value: e.id,
    label: `${e.examType?.name ?? "?"} / ${e.subject?.name ?? "?"}`,
  }));
  const topicOptions = [
    { value: "", label: "None" },
    ...topics.map((t) => ({ value: t.id, label: t.name })),
  ];
  const passageOptions = [
    { value: "", label: "None" },
    ...passages.map((p) => ({ value: p.id, label: p.title })),
  ];

  // ─── Option helpers ────────────────────────────────────────────────────────

  const addOption = () => {
    setOptions((p) => [...p, { id: uuidv4(), text: "", contentFormat: "plate" as const, isCorrect: false }]);
    setOptionsChanged(true);
  };
  const removeOption = (id: string) => {
    setOptions((p) => p.filter((o) => o.id !== id));
    setOptionsChanged(true);
  };
  const updateOption = (
    id: string,
    field: keyof OptionEntry,
    value: unknown,
  ) => {
    setOptions((p) =>
      p.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
    setOptionsChanged(true);
  };
  const setCorrect = (id: string, multi: boolean) => {
    setOptions((p) =>
      p.map((o) =>
        multi
          ? o.id === id
            ? { ...o, isCorrect: !o.isCorrect }
            : o
          : { ...o, isCorrect: o.id === id },
      ),
    );
    setOptionsChanged(true);
  };

  const addMatchPair = () => {
    setMatchPairs((p) => [...p, { id: uuidv4(), left: "", right: "" }]);
    setMatchPairsChanged(true);
  };
  const removeMatchPair = (id: string) => {
    setMatchPairs((p) => p.filter((m) => m.id !== id));
    setMatchPairsChanged(true);
  };
  const updateMatchPair = (
    id: string,
    field: "left" | "right",
    value: string,
  ) => {
    setMatchPairs((p) =>
      p.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
    setMatchPairsChanged(true);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const handleTypeChange = (newType: string) => {
    typeStateRef.current[questionType] = {
      options: [...options],
      matchPairs: [...matchPairs],
      correctAnswerText: getValues("correctAnswerText") ?? "",
    };
    const saved = typeStateRef.current[newType];
    if (saved) {
      setOptions(saved.options);
      setMatchPairs(saved.matchPairs);
      setValue("correctAnswerText", saved.correctAnswerText, { shouldDirty: true });
    } else {
      setOptions([
        { id: uuidv4(), text: "", contentFormat: "plate" as const, isCorrect: false },
        { id: uuidv4(), text: "", contentFormat: "plate" as const, isCorrect: false },
      ]);
      setMatchPairs([
        { id: uuidv4(), left: "", right: "" },
        { id: uuidv4(), left: "", right: "" },
      ]);
      setValue("correctAnswerText", "", { shouldDirty: true });
    }
    setValue("type", newType as QuestionValues["type"], { shouldDirty: true });
  };

  // isDirty on questionText may be spuriously true (Plate format conversion on mount).
  // Track Plate user edits separately; check dirtyFields for all other fields.
  const hasChanges =
    plateEdited ||
    Object.keys(dirtyFields).some((k) => k !== "questionText") ||
    discussionsChanged ||
    optionsChanged ||
    matchPairsChanged;

  // Derive format from actual content — Plate always emits a JSON array.
  const deriveFormat = (content: string): "plate" | "markdown" => {
    if (!content) return "markdown";
    try {
      const p = JSON.parse(content);
      return Array.isArray(p) ? "plate" : "markdown";
    } catch {
      return "markdown";
    }
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const optHasContent = (opt: OptionEntry) => {
    if (!opt.text) return false;
    if (opt.contentFormat === "plate") {
      try {
        const nodes = JSON.parse(opt.text) as unknown[];
        const walk = (arr: unknown[]): boolean =>
          arr.some((n) => {
            const node = n as Record<string, unknown>;
            if ("text" in node) return (node.text as string).trim().length > 0;
            if (Array.isArray(node.children)) return walk(node.children as unknown[]);
            return false;
          });
        return walk(nodes);
      } catch { return opt.text.trim().length > 0; }
    }
    return opt.text.trim().length > 0;
  };

  const onSubmit = async (data: QuestionValues) => {
    if (!data.examTypeSubjectIds?.length) {
      toast.error("Select at least one Exam Type / Subject");
      return;
    }

    // Per-type validation
    if (["multiple_choice", "true_false", "multiple_response"].includes(data.type)) {
      if (options.some((o) => !optHasContent(o))) {
        toast.error("All options must have content before saving");
        return;
      }
      if (!options.some((o) => o.isCorrect)) {
        toast.error(
          data.type === "multiple_response"
            ? "Select at least one correct answer"
            : "Select a correct answer"
        );
        return;
      }
    }
    if (data.type === "matching") {
      if (matchPairs.some((p) => !p.left.trim() || !p.right.trim())) {
        toast.error("All match pairs must have both sides filled");
        return;
      }
    }
    if (["fill_in_the_blank", "short_answer", "essay"].includes(data.type)) {
      if (!(data.correctAnswerText ?? "").trim()) {
        const label =
          data.type === "essay"
            ? "model answer"
            : data.type === "fill_in_the_blank"
            ? "correct answer"
            : "at least one keyword";
        toast.error(`Please provide ${label}`);
        return;
      }
    }

    setSaving(true);
    try {
      let correctAnswer: unknown = null;
      if (data.type === "multiple_choice" || data.type === "true_false") {
        correctAnswer = options.find((o) => o.isCorrect)?.id ?? null;
      } else if (data.type === "multiple_response") {
        correctAnswer = options.filter((o) => o.isCorrect).map((o) => o.id);
      } else if (data.type === "matching") {
        correctAnswer = Object.fromEntries(
          matchPairs.map((p) => [p.left, p.right]),
        );
      } else if (data.type === "short_answer") {
        correctAnswer = (data.correctAnswerText ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        correctAnswer = data.correctAnswerText ?? null;
      }

      const hasOptions = [
        "multiple_choice",
        "true_false",
        "multiple_response",
      ].includes(data.type);
      const payload = {
        examTypeSubjectIds: data.examTypeSubjectIds,
        questionText: data.questionText,
        contentFormat: deriveFormat(data.questionText),
        type: data.type,
        category: data.category,
        difficulty: data.difficulty,
        marks: data.marks ?? 1,
        options: hasOptions ? options : null,
        correctAnswer,
        explanation: data.explanation || null,
        topicId: data.topicId || null,
        passageId: data.passageId || null,
        discussions: discussions.length > 0 ? discussions : null,
      };

      if (editQuestion) {
        await api.patch(
          `/admin/exam-revision/questions/${editQuestion.id}`,
          payload,
        );
        toast.success("Question updated");
      } else {
        await api.post("/admin/exam-revision/questions", payload);
        toast.success("Question created");
      }
      router.push("/exam-revision/questions");
    } catch (error) {
      handleAxiosError(error, "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const showOptions = [
    "multiple_choice",
    "true_false",
    "multiple_response",
  ].includes(questionType);
  const showMatching = questionType === "matching";
  const showTextAnswer = [
    "fill_in_the_blank",
    "short_answer",
    "essay",
  ].includes(questionType);
  const isMultiResp = questionType === "multiple_response";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* ── Sticky page sub-header ──────────────────────────────────────── */}
      <div className="sticky top-0! z-51 bg-[#F9FAFB] border-b border-[#EAECF0] px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/exam-revision/questions")}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:text-[#344054] hover:bg-[#F2F4F7] transition-colors"
          >
            <Icon icon="hugeicons:arrow-left-01" width={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#101828] leading-tight">
              {editQuestion ? "Edit Question" : "New Question"}
            </h1>
            <p className="text-xs text-[#667085] truncate">
              {selectedEtsIds.length > 0
                ? `${selectedEtsIds.length} scope${selectedEtsIds.length > 1 ? "s" : ""} selected`
                : "Select exam type & subject to begin"}
            </p>
          </div>
        </div>

        {/* Wizard Mode toggle */}
        <div className="flex items-center bg-[#F2F4F7] rounded-full p-1 gap-0.5 shrink-0">
          <div className="px-3.5 py-1.5 rounded-full bg-white text-[#344054] text-xs font-semibold shadow-sm select-none">
            Standard
          </div>
          <div className="relative group">
            <button
              type="button"
              disabled
              className="px-3.5 py-1.5 rounded-full text-[#98A2B3] text-xs font-medium cursor-not-allowed flex items-center gap-1.5 select-none"
            >
              <span>🔮</span>
              <span>Wizard</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-60 bg-[#1D2939] text-white text-[11px] leading-relaxed rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
              <p className="font-semibold mb-0.5">Wizard Mode ✨</p>
              <p className="text-[#98A2B3]">
                For SAT-style questions with geometric figures, diagram inputs,
                multi-part passages, and interactive fill-in shapes — coming
                soon.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex gap-6 p-6 items-start"
      >
        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Question text card */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-[#F2F4F7]">
              <div className="w-7 h-7 rounded-lg bg-[#DBEDFF] flex items-center justify-center">
                <Icon
                  icon="hugeicons:quill-write-02"
                  width={14}
                  color="#007FFF"
                />
              </div>
              <span className="text-sm font-semibold text-[#344054]">
                Question
              </span>
            </div>
            <div className="p-4">
              <Controller
                name="questionText"
                control={control}
                render={({ field }) => (
                  <PlateEditor
                    name="questionText"
                    value={field.value ?? ""}
                    contentFormat={editQuestion?.contentFormat ?? "plate"}
                    onImageUpload={(file) => uploadImage(file, "questions")}
                    slim
                    discussions={discussions}
                    onDiscussionsChange={(d) => {
                      setDiscussions(d);
                      setDiscussionsChanged(true);
                    }}
                    richTextProps={{ maxHeight: "380px", minHeight: "160px" }}
                    error={errors.questionText?.message}
                    onSettled={(val) =>
                      resetField("questionText", { defaultValue: val })
                    }
                    onUserEdit={() => setPlateEdited(true)}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          </div>

          {/* ── Options (MC / TF / MR) ──────────────────────────────────── */}
          {showOptions && (
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F2F4F7]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#ECFDF3] flex items-center justify-center">
                    <Icon
                      icon="hugeicons:list-view"
                      width={14}
                      color="#099137"
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#344054]">
                    Options
                    <span className="ml-2 text-xs font-normal text-[#667085]">
                      {isMultiResp
                        ? "— tick all correct"
                        : "— tick the one correct answer"}
                    </span>
                  </span>
                </div>
                {questionType !== "true_false" && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1 text-xs text-[#007FFF] font-medium hover:underline"
                  >
                    <Icon icon="hugeicons:add-01" width={13} /> Add Option
                  </button>
                )}
              </div>

              <div className="p-4 flex flex-col gap-2">
                {options.map((opt, i) => {
                  const isCorrect = opt.isCorrect;
                  return (
                    <div key={opt.id} className="flex items-start gap-3 group min-w-0">
                      {/* Correct toggle */}
                      <div className="mt-2.5 shrink-0">
                        {isMultiResp ? (
                          <CheckBox
                            value={isCorrect}
                            onChange={() => setCorrect(opt.id, true)}
                          />
                        ) : (
                          <Radio
                            name="correct-option"
                            value={isCorrect}
                            onChange={() => setCorrect(opt.id, false)}
                          />
                        )}
                      </div>

                      {/* Letter badge */}
                      <div
                        className={`mt-2.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isCorrect
                            ? "bg-[#DBEDFF] text-[#007FFF]"
                            : "bg-[#F2F4F7] text-[#667085]"
                        }`}
                      >
                        {OPTION_LETTERS[i] ?? i + 1}
                      </div>

                      {/* Text input */}
                      {questionType === "true_false" ? (
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) =>
                            updateOption(opt.id, "text", e.target.value)
                          }
                          placeholder={i === 0 ? "True" : "False"}
                          className="flex-1 border border-[#D0D5DD] rounded-lg h-10 px-3.5 text-sm text-[#344054] outline-none focus:border-[#007FFF] transition-colors mt-0.5"
                        />
                      ) : (
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <PlateEditor
                            name={`option-${opt.id}`}
                            value={opt.text}
                            contentFormat={opt.contentFormat}
                            onChange={(e) =>
                              updateOption(opt.id, "text", e.target.value)
                            }
                            onImageUpload={(file) =>
                              uploadImage(file, "questions")
                            }
                            slim
                            richTextProps={{
                              minHeight: "52px",
                              maxHeight: "180px",
                            }}
                          />
                        </div>
                      )}

                      {/* Remove */}
                      {questionType !== "true_false" && options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(opt.id)}
                          className="mt-2.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#D0D5DD] hover:text-[#D42620] hover:bg-[#FEF3F2] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Icon icon="hugeicons:delete-02" width={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Matching pairs ──────────────────────────────────────────── */}
          {showMatching && (
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F2F4F7]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F0F7FF] flex items-center justify-center">
                    <Icon icon="hugeicons:link-02" width={14} color="#007FFF" />
                  </div>
                  <span className="text-sm font-semibold text-[#344054]">
                    Matching Pairs
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addMatchPair}
                  className="flex items-center gap-1 text-xs text-[#007FFF] font-medium hover:underline"
                >
                  <Icon icon="hugeicons:add-01" width={13} /> Add Pair
                </button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2 mb-2 px-1">
                  <span className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">
                    Column A
                  </span>
                  <span className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">
                    Column B
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {matchPairs.map((pair, i) => (
                    <div
                      key={pair.id}
                      className="flex items-center gap-2 group"
                    >
                      <span className="shrink-0 w-6 text-center text-xs font-bold text-[#98A2B3]">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) =>
                          updateMatchPair(pair.id, "left", e.target.value)
                        }
                        placeholder="Prompt…"
                        className="flex-1 border border-[#D0D5DD] rounded-lg h-10 px-3.5 text-sm text-[#344054] outline-none focus:border-[#007FFF] transition-colors"
                      />
                      <Icon
                        icon="hugeicons:arrow-right-01"
                        className="text-[#D0D5DD] shrink-0"
                        width={16}
                      />
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) =>
                          updateMatchPair(pair.id, "right", e.target.value)
                        }
                        placeholder="Match…"
                        className="flex-1 border border-[#D0D5DD] rounded-lg h-10 px-3.5 text-sm text-[#344054] outline-none focus:border-[#007FFF] transition-colors"
                      />
                      {matchPairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeMatchPair(pair.id)}
                          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[#D0D5DD] hover:text-[#D42620] hover:bg-[#FEF3F2] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Icon icon="hugeicons:delete-02" width={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Text-based answer ────────────────────────────────────────── */}
          {showTextAnswer && (
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-[#F2F4F7]">
                <div className="w-7 h-7 rounded-lg bg-[#FFFAEB] flex items-center justify-center">
                  <Icon
                    icon="hugeicons:checkmark-circle-03"
                    width={14}
                    color="#F3A218"
                  />
                </div>
                <span className="text-sm font-semibold text-[#344054]">
                  Correct Answer
                  {questionType === "short_answer" && (
                    <span className="ml-2 text-xs font-normal text-[#667085]">
                      — one keyword per line
                    </span>
                  )}
                </span>
              </div>
              <div className="p-4">
                <Controller
                  name="correctAnswerText"
                  control={control}
                  render={({ field }) => (
                    <InputField
                      {...field}
                      type={
                        questionType === "fill_in_the_blank"
                          ? "text"
                          : "textarea"
                      }
                      label={null}
                      placeholder={
                        questionType === "fill_in_the_blank"
                          ? "The exact answer…"
                          : questionType === "short_answer"
                            ? "keyword1\nkeyword2\nkeyword3"
                            : "Model / examiner answer…"
                      }
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  )}
                />
              </div>
            </div>
          )}

          {/* ── Explanation (collapsible) ────────────────────────────────── */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <button
              type="button"
              onClick={() => setExplanationOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAFA] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#F0F7FF] flex items-center justify-center">
                  <Icon
                    icon="hugeicons:information-circle"
                    width={14}
                    color="#007FFF"
                  />
                </div>
                <span className="text-sm font-semibold text-[#344054]">
                  Explanation
                </span>
                <span className="text-xs text-[#98A2B3] font-normal">
                  optional
                </span>
              </div>
              <Icon
                icon={
                  explanationOpen
                    ? "hugeicons:arrow-up-01"
                    : "hugeicons:arrow-down-01"
                }
                width={16}
                className="text-[#98A2B3] transition-transform"
              />
            </button>
            {explanationOpen && (
              <div className="px-4 pb-4 border-t border-[#F2F4F7]">
                <div className="pt-4">
                  <Controller
                    name="explanation"
                    control={control}
                    render={({ field }) => (
                      <InputField
                        type="rich-text"
                        name="explanation"
                        label={null}
                        value={field.value ?? ""}
                        contentFormat={editQuestion?.contentFormat ?? "plate"}
                        richTextProps={{
                          slim: true,
                          image: { allowed: true, folder: "questions" },
                          maxHeight: "360px",
                          minHeight: "120px",
                        }}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Settings sidebar ──────────────────────────────────────────── */}
        <div className="w-71 p-0.75 -m-0.75 shrink-0 sticky top-18.25 flex flex-col gap-4 max-h-[calc(100vh-100px)] overflow-y-auto pb-6">
          {/* Scope */}
          <div
            className="bg-white rounded-2xl p-4 flex flex-col gap-3"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-center gap-2">
              <Icon
                icon="hugeicons:target-02"
                width={15}
                className="text-[#007FFF]"
              />
              <span className="text-xs font-semibold text-[#344054] uppercase tracking-wide">
                Scope
              </span>
            </div>
            <Controller
              name="examTypeSubjectIds"
              control={control}
              render={({ field }) => (
                <InputField
                  type="multi-select"
                  label={null}
                  placeholder="Select exam / subject…"
                  value={(field.value ?? []).join(",")}
                  selectOptions={etsOptions}
                  error={errors.examTypeSubjectIds?.message}
                  onChange={(e) => {
                    const val = e.target.value as string;
                    field.onChange(val ? val.split(",").filter(Boolean) : []);
                    setValue("topicId", "");
                    setValue("passageId", "");
                  }}
                />
              )}
            />
            {selectedEtsIds.length > 0 && (
              <p className="text-xs text-[#099137] flex items-center gap-1">
                <Icon icon="hugeicons:tick-double-01" width={13} />
                {selectedEtsIds.length} scope
                {selectedEtsIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Question Type visual picker */}
          <div
            className="bg-white rounded-2xl p-4 flex flex-col gap-3"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-center gap-2">
              <Icon
                icon="hugeicons:layers-01"
                width={15}
                className="text-[#007FFF]"
              />
              <span className="text-xs font-semibold text-[#344054] uppercase tracking-wide">
                Question Type
              </span>
            </div>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-4 gap-1.5">
                  {QUESTION_TYPES.map((qt) => {
                    const active = field.value === qt.value;
                    const isMatching = qt.value === "matching";
                    return (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => handleTypeChange(qt.value)}
                        className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border-2 transition-all text-center col-span-2 ${
                          isMatching ? "col-start-2" : ""
                        } ${
                          active
                            ? "border-[#007FFF] bg-[#F0F7FF]"
                            : "border-[#F2F4F7] bg-[#FAFAFA] hover:border-[#B2D6FF] hover:bg-[#F8FBFF]"
                        }`}
                      >
                        <Icon
                          icon={qt.icon}
                          width={18}
                          className={
                            active ? "text-[#007FFF]" : "text-[#667085]"
                          }
                        />
                        <span
                          className={`text-[10px] font-medium leading-tight ${
                            active ? "text-[#007FFF]" : "text-[#667085]"
                          }`}
                        >
                          {qt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* Settings: category, difficulty, marks */}
          <div
            className="bg-white rounded-2xl p-4 flex flex-col gap-3"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-center gap-2">
              <Icon
                icon="hugeicons:settings-02"
                width={15}
                className="text-[#007FFF]"
              />
              <span className="text-xs font-semibold text-[#344054] uppercase tracking-wide">
                Settings
              </span>
            </div>

            {/* Category */}
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <InputField
                  {...field}
                  type="select"
                  label="Category"
                  placeholder="Select…"
                  value={field.value || null}
                  selectOptions={categoryOptions}
                  error={errors.category?.message}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            {/* Difficulty pills */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#344054]">
                Difficulty
              </label>
              <Controller
                name="difficulty"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-1.5">
                    {DIFFICULTY_OPTIONS.map((d) => {
                      const active = field.value === d.value;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => field.onChange(d.value)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                          style={
                            active
                              ? {
                                  background: d.bg,
                                  color: d.color,
                                  borderColor: d.color,
                                }
                              : {
                                  background: "#F9FAFB",
                                  color: "#98A2B3",
                                  borderColor: "#F2F4F7",
                                }
                          }
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* Marks */}
            <Controller
              name="marks"
              control={control}
              render={({ field }) => (
                <InputField
                  {...field}
                  type="number"
                  label="Marks"
                  value={String(field.value ?? 1)}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          </div>

          {/* Metadata */}
          {(topics.length > 0 ||
            passages.length > 0 ||
            selectedEtsIds.length > 0) && (
            <div
              className="bg-white rounded-2xl p-4 flex flex-col gap-3"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center gap-2">
                <Icon
                  icon="hugeicons:tags"
                  width={15}
                  className="text-[#007FFF]"
                />
                <span className="text-xs font-semibold text-[#344054] uppercase tracking-wide">
                  Metadata
                </span>
              </div>
              <Controller
                name="topicId"
                control={control}
                render={({ field }) => (
                  <InputField
                    {...field}
                    type="select"
                    label="Topic"
                    placeholder={
                      topics.length === 0 ? "None available" : "None"
                    }
                    value={field.value || null}
                    selectOptions={topicOptions}
                    disabled={
                      selectedEtsIds.length === 0 || topics.length === 0
                    }
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="passageId"
                control={control}
                render={({ field }) => (
                  <InputField
                    {...field}
                    type="select"
                    label="Passage"
                    placeholder="None"
                    value={field.value || null}
                    selectOptions={passageOptions}
                    disabled={selectedEtsIds.length === 0}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              loading={saving}
              disabled={saving || (!!editQuestion && !hasChanges)}
              className="w-full justify-center"
            >
              {editQuestion ? "Save Changes" : "Create Question"}
            </Button>
            <button
              type="button"
              onClick={() => router.push("/exam-revision/questions")}
              className="w-full py-2.5 rounded-full border border-[#D0D5DD] text-[#344054] text-sm font-medium hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
