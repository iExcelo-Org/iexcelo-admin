"use client";

import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { handleAxiosError } from "@/src/utils";
import { IQuestion } from "@/src/types";
import { CARD_SHADOW } from "@/src/utils";
import QuestionForm from "../../QuestionForm";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function QuestionFormSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-51 bg-[#F9FAFB] border-b border-[#EAECF0] px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EAECF0]" />
          <div className="flex flex-col gap-1.5">
            <div className="h-5 w-36 rounded-md bg-[#EAECF0]" />
            <div className="h-3 w-52 rounded-md bg-[#EAECF0]" />
          </div>
        </div>
        <div className="h-9 w-44 rounded-full bg-[#EAECF0]" />
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="flex gap-6 p-6 items-start">
        {/* ── Main left column ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Question card */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-[#F2F4F7]">
              <div className="w-7 h-7 rounded-lg bg-[#EAECF0]" />
              <div className="h-4 w-20 rounded bg-[#EAECF0]" />
            </div>
            <div className="p-4">
              {/* Plate editor skeleton */}
              <div className="border border-[#E4E7EC] rounded-md overflow-hidden">
                {/* Toolbar strip */}
                <div className="h-10 border-b border-[#F2F4F7] px-2 flex items-center gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="w-7 h-7 rounded bg-[#F2F4F7]" />
                  ))}
                  <div className="w-px h-5 bg-[#EAECF0] mx-1" />
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-7 h-7 rounded bg-[#F2F4F7]" />
                  ))}
                  <div className="w-px h-5 bg-[#EAECF0] mx-1" />
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-7 h-7 rounded bg-[#F2F4F7]" />
                  ))}
                </div>
                {/* Content lines */}
                <div className="px-4 py-3 flex flex-col gap-3" style={{ minHeight: '160px' }}>
                  <div className="h-4 w-4/5 rounded bg-[#F2F4F7]" />
                  <div className="h-4 w-full rounded bg-[#F2F4F7]" />
                  <div className="h-4 w-3/4 rounded bg-[#F2F4F7]" />
                  <div className="h-4 w-11/12 rounded bg-[#F2F4F7]" />
                  <div className="h-4 w-2/3 rounded bg-[#F2F4F7]" />
                </div>
              </div>
            </div>
          </div>

          {/* Options card */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#F2F4F7]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EAECF0]" />
                <div className="h-4 w-16 rounded bg-[#EAECF0]" />
                <div className="h-3 w-32 rounded bg-[#F2F4F7]" />
              </div>
              <div className="h-4 w-20 rounded bg-[#F2F4F7]" />
            </div>
            <div className="p-4 flex flex-col gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-2.5 w-7 h-7 rounded-full bg-[#EAECF0] shrink-0" />
                  <div className="mt-2.5 w-7 h-7 rounded-full bg-[#F2F4F7] shrink-0" />
                  {/* TipTap option editor skeleton */}
                  <div className="flex-1 border border-[#E4E7EC] rounded-md overflow-hidden">
                    <div className="h-8 border-b border-[#F2F4F7] px-2 flex items-center gap-1">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="w-5 h-5 rounded bg-[#F2F4F7]" />
                      ))}
                    </div>
                    <div className="px-3 py-2">
                      <div className="h-3.5 rounded bg-[#F2F4F7]" style={{ width: `${55 + (i * 13) % 35}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation card (collapsed) */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EAECF0]" />
                <div className="h-4 w-24 rounded bg-[#EAECF0]" />
                <div className="h-3 w-14 rounded bg-[#F2F4F7]" />
              </div>
              <div className="w-4 h-4 rounded bg-[#F2F4F7]" />
            </div>
          </div>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────────── */}
        <div className="w-[284px] shrink-0 flex flex-col gap-4">
          {/* Scope card */}
          <div className="bg-white rounded-2xl p-4 flex flex-col gap-3" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#EAECF0]" />
              <div className="h-3 w-10 rounded bg-[#EAECF0]" />
            </div>
            {/* Multi-select box */}
            <div className="border border-[#E4E7EC] rounded-lg h-10 px-3 flex items-center gap-2 bg-[#FAFAFA]">
              <div className="flex-1 h-3 rounded bg-[#F2F4F7]" />
              <div className="w-4 h-4 rounded bg-[#F2F4F7] shrink-0" />
            </div>
          </div>

          {/* Question type card */}
          <div className="bg-white rounded-2xl p-4 flex flex-col gap-3" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#EAECF0]" />
              <div className="h-3 w-28 rounded bg-[#EAECF0]" />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {/* 6 regular items: col-span-2 → 3 full rows */}
              {[...Array(6)].map((_, i) => (
                <div key={i} className="col-span-2 h-[66px] rounded-xl bg-[#F2F4F7] flex flex-col items-center justify-center gap-2 p-2.5">
                  <div className="w-[18px] h-[18px] rounded bg-[#EAECF0]" />
                  <div className="h-2.5 w-10 rounded bg-[#EAECF0]" />
                </div>
              ))}
              {/* Matching: col-start-2 col-span-2 */}
              <div className="col-start-2 col-span-2 h-[66px] rounded-xl bg-[#F2F4F7] flex flex-col items-center justify-center gap-2 p-2.5">
                <div className="w-[18px] h-[18px] rounded bg-[#EAECF0]" />
                <div className="h-2.5 w-14 rounded bg-[#EAECF0]" />
              </div>
            </div>
          </div>

          {/* Settings card */}
          <div className="bg-white rounded-2xl p-4 flex flex-col gap-3" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#EAECF0]" />
              <div className="h-3 w-16 rounded bg-[#EAECF0]" />
            </div>
            {/* Category */}
            <div className="flex flex-col gap-1">
              <div className="h-3 w-16 rounded bg-[#EAECF0]" />
              <div className="h-10 rounded-lg bg-[#F2F4F7]" />
            </div>
            {/* Difficulty pills */}
            <div className="flex flex-col gap-1">
              <div className="h-3 w-16 rounded bg-[#EAECF0]" />
              <div className="flex gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex-1 h-8 rounded-lg bg-[#F2F4F7]" />
                ))}
              </div>
            </div>
            {/* Marks */}
            <div className="flex flex-col gap-1">
              <div className="h-3 w-10 rounded bg-[#EAECF0]" />
              <div className="h-10 rounded-lg bg-[#F2F4F7]" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <div className="h-11 w-full rounded-full bg-[#007FFF]/20" />
            <div className="h-10 w-full rounded-full bg-[#F2F4F7]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditQuestionClient({ id }: { id: string }) {
  const [question, setQuestion] = useState<IQuestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: IQuestion }>(`/admin/exam-revision/questions/${id}`)
      .then((res) => setQuestion(res.data.data))
      .catch((err) => handleAxiosError(err, "Failed to load question"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <QuestionFormSkeleton />;

  if (!question) {
    return (
      <div
        className="bg-white rounded-2xl p-8 text-center text-[#667085]"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <p className="text-lg font-semibold text-[#344054]">Question not found</p>
        <p className="text-sm mt-1">It may have been deleted or the ID is invalid.</p>
      </div>
    );
  }

  return <QuestionForm editQuestion={question} />;
}
