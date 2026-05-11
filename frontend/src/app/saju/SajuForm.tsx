"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "urql";
import { graphql } from "@/gql";
import type { CalendarType, Gender } from "@/gql/graphql";

const SUBMIT_SAJU = graphql(`
  mutation SubmitSaju($input: SubmitSajuInput!) {
    submitSaju(input: $input) {
      yearStem
      yearBranch
      monthStem
      monthBranch
      dayStem
      dayBranch
      hourStem
      hourBranch
      dayMaster
      fiveElements {
        wood
        fire
        earth
        metal
        water
      }
      computedAt
    }
  }
`);

type FormState = {
  nickname: string;
  birthDate: string;
  birthTime: string;
  calendarType: CalendarType;
  gender: Gender;
  birthplace: string;
  bio: string;
  interestedGender: Gender;
  ageRangeMin: number;
  ageRangeMax: number;
};

const INITIAL_STATE: FormState = {
  nickname: "",
  birthDate: "",
  birthTime: "",
  calendarType: "solar",
  gender: "male",
  birthplace: "",
  bio: "",
  interestedGender: "female",
  ageRangeMin: 25,
  ageRangeMax: 40,
};

type StepNumber = 1 | 2 | 3;

const STEPS: ReadonlyArray<{ number: StepNumber; label: string; title: string }> = [
  { number: 1, label: "기본 정보", title: "기본 정보" },
  { number: 2, label: "생년월일시", title: "생년월일시 (사주 계산용)" },
  { number: 3, label: "매칭 선호도", title: "매칭 선호도" },
];

function isStepValid(state: FormState, step: StepNumber): boolean {
  if (step === 1) {
    return state.nickname.trim().length > 0;
  }
  if (step === 2) {
    return state.birthDate.length > 0;
  }
  return (
    state.ageRangeMin >= 18 &&
    state.ageRangeMax <= 100 &&
    state.ageRangeMin <= state.ageRangeMax
  );
}

function stepMissingHint(state: FormState, step: StepNumber): string | null {
  if (step === 1 && state.nickname.trim().length === 0) {
    return "닉네임을 입력해 주세요";
  }
  if (step === 2 && state.birthDate.length === 0) {
    return "생년월일을 선택해 주세요";
  }
  if (step === 3) {
    if (state.ageRangeMin > state.ageRangeMax) {
      return "선호 연령 최소가 최대보다 크면 안 됩니다";
    }
    if (state.ageRangeMin < 18 || state.ageRangeMax > 100) {
      return "연령 범위는 18 ~ 100 사이여야 합니다";
    }
  }
  return null;
}

export function SajuForm() {
  const router = useRouter();
  const [step, setStep] = useState<StepNumber>(1);
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [{ fetching, error }, submitSaju] = useMutation(SUBMIT_SAJU);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const currentValid = isStepValid(state, step);
  const currentHint = stepMissingHint(state, step);
  const isLastStep = step === 3;

  const handleNext = () => {
    if (!currentValid) return;
    if (step < 3) {
      setStep((s) => (s + 1) as StepNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as StepNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isStepValid(state, 1)) {
      setStep(1);
      setSubmitError("닉네임은 필수입니다");
      return;
    }
    if (!isStepValid(state, 2)) {
      setStep(2);
      setSubmitError("생년월일은 필수입니다");
      return;
    }
    if (!isStepValid(state, 3)) {
      setStep(3);
      setSubmitError(stepMissingHint(state, 3) ?? "매칭 선호도를 확인해 주세요");
      return;
    }

    const result = await submitSaju({
      input: {
        nickname: state.nickname.trim(),
        birthDate: state.birthDate,
        birthTime: state.birthTime || null,
        calendarType: state.calendarType,
        gender: state.gender,
        birthplace: state.birthplace.trim() || null,
        bio: state.bio.trim() || null,
        interestedGender: state.interestedGender,
        ageRangeMin: state.ageRangeMin,
        ageRangeMax: state.ageRangeMax,
      },
    });

    if (result.error) return;
    if (!result.data) return;

    router.push("/reading");
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header>
        <p className="m-0 font-serif text-2xl text-vermilion-700 tracking-wide">
          卦 <span className="text-ink-900">사주 입력</span>
        </p>
        <p className="mt-1 text-sm text-ink-500">
          생년월일·성별과 매칭 선호도를 입력하면 사주 풀이와 매칭이 자동 시작됩니다.
        </p>
      </header>

      <StepIndicator currentStep={step} />

      <form onSubmit={handleSubmit} className="mt-4">
        <section className="rounded-lg border border-ink-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <header className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-vermilion-500 bg-vermilion-50 font-serif text-[13px] font-semibold text-vermilion-700"
            >
              {step}
            </span>
            <h2 className="m-0 font-serif text-lg text-ink-900">
              {STEPS[step - 1]?.title}
            </h2>
            <span className="ml-auto text-[11px] text-ink-500">
              {step} / 3
            </span>
          </header>

          <div className="mt-4 flex flex-col gap-3">
            {step === 1 && (
              <Step1Fields state={state} update={update} />
            )}
            {step === 2 && (
              <Step2Fields state={state} update={update} />
            )}
            {step === 3 && (
              <Step3Fields state={state} update={update} />
            )}
          </div>
        </section>

        {(submitError || error) && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-crimson-600/40 bg-crimson-50 p-3 text-sm text-crimson-600"
          >
            {submitError || `서버 오류: ${error?.message}`}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={fetching}
              className="inline-flex items-center rounded-md border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-700 transition-colors hover:bg-hanji-50 disabled:opacity-50"
            >
              ← 이전
            </button>
          ) : (
            <span className="invisible" />
          )}

          <div className="flex-1" />

          {!isLastStep && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!currentValid}
              aria-label="다음 단계"
              className="inline-flex items-center rounded-md bg-vermilion-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(28,25,23,0.08)] transition-colors hover:bg-vermilion-600 disabled:cursor-not-allowed disabled:bg-ink-300"
            >
              다음 →
            </button>
          )}

          {isLastStep && (
            <button
              type="submit"
              disabled={fetching || !currentValid}
              aria-label="사주 입력 완료"
              className="inline-flex items-center rounded-md bg-vermilion-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(28,25,23,0.08)] transition-colors hover:bg-vermilion-600 disabled:cursor-not-allowed disabled:bg-ink-300"
            >
              {fetching ? "제출 중..." : "사주 입력 완료 →"}
            </button>
          )}
        </div>

        {!currentValid && currentHint && (
          <p className="mt-2 text-center text-[12px] text-ink-500">
            {currentHint}
          </p>
        )}
      </form>
    </main>
  );
}

function StepIndicator({ currentStep }: { currentStep: StepNumber }) {
  return (
    <ol
      aria-label="진행 단계"
      className="mt-5 flex items-center gap-1.5"
    >
      {STEPS.map((s, idx) => {
        const isCurrent = s.number === currentStep;
        const isDone = s.number < currentStep;
        const isLast = idx === STEPS.length - 1;

        const dotClass = isDone
          ? "border-jade-600 bg-jade-600 text-white"
          : isCurrent
            ? "border-vermilion-500 bg-vermilion-50 text-vermilion-700"
            : "border-ink-200 bg-white text-ink-400";
        const labelClass = isCurrent
          ? "text-vermilion-700 font-semibold"
          : isDone
            ? "text-jade-600"
            : "text-ink-400";
        const lineClass = isDone ? "bg-jade-600" : "bg-ink-200";

        return (
          <li
            key={s.number}
            aria-current={isCurrent ? "step" : undefined}
            className="flex flex-1 items-center gap-1.5"
          >
            <div className="flex flex-col items-center gap-1">
              <span
                aria-hidden
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border font-serif text-[12px] font-semibold transition-colors",
                  dotClass,
                ].join(" ")}
              >
                {isDone ? "✓" : s.number}
              </span>
              <span
                className={[
                  "whitespace-nowrap text-[11px] transition-colors",
                  labelClass,
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden
                className={[
                  "mb-5 h-0.5 flex-1 rounded-full transition-colors",
                  lineClass,
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

const INPUT_CLASS =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-vermilion-500 focus:outline-none focus:ring-2 focus:ring-vermilion-500/20";

function Step1Fields({
  state,
  update,
}: {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <Field label="닉네임" required>
        <input
          type="text"
          value={state.nickname}
          onChange={(e) => update("nickname", e.target.value)}
          maxLength={30}
          required
          autoFocus
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="한 줄 소개" hint="선택">
        <textarea
          value={state.bio}
          onChange={(e) => update("bio", e.target.value)}
          maxLength={200}
          rows={3}
          className={`${INPUT_CLASS} resize-y`}
        />
      </Field>
    </>
  );
}

function Step2Fields({
  state,
  update,
}: {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <Field label="생년월일" required>
        <input
          type="date"
          value={state.birthDate}
          onChange={(e) => update("birthDate", e.target.value)}
          required
          autoFocus
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="출생 시각" hint="선택 - 정확한 사주 계산용">
        <input
          type="time"
          value={state.birthTime}
          onChange={(e) => update("birthTime", e.target.value)}
          className={INPUT_CLASS}
        />
      </Field>
      <Field label="달력" required>
        <PillRadioGroup
          name="calendarType"
          value={state.calendarType}
          options={[
            { value: "solar", label: "양력" },
            { value: "lunar", label: "음력" },
            { value: "lunar_leap", label: "음력 (윤달)" },
          ]}
          onChange={(v) => update("calendarType", v)}
        />
      </Field>
      <Field label="성별" required>
        <PillRadioGroup
          name="gender"
          value={state.gender}
          options={[
            { value: "male", label: "남성" },
            { value: "female", label: "여성" },
          ]}
          onChange={(v) => update("gender", v)}
        />
      </Field>
      <Field label="출생지" hint="선택">
        <input
          type="text"
          value={state.birthplace}
          onChange={(e) => update("birthplace", e.target.value)}
          placeholder="예: 서울"
          maxLength={50}
          className={INPUT_CLASS}
        />
      </Field>
    </>
  );
}

function Step3Fields({
  state,
  update,
}: {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <Field label="관심 성별" required>
        <PillRadioGroup
          name="interestedGender"
          value={state.interestedGender}
          options={[
            { value: "female", label: "여성" },
            { value: "male", label: "남성" },
          ]}
          onChange={(v) => update("interestedGender", v)}
        />
      </Field>
      <Field
        label={`선호 연령 범위 (${state.ageRangeMin} ~ ${state.ageRangeMax}세)`}
        required
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={18}
            max={100}
            value={state.ageRangeMin}
            onChange={(e) =>
              update("ageRangeMin", Number(e.target.value) || 18)
            }
            className={`${INPUT_CLASS} tabular w-20`}
            aria-label="선호 최소 연령"
          />
          <span className="text-ink-500">~</span>
          <input
            type="number"
            min={18}
            max={100}
            value={state.ageRangeMax}
            onChange={(e) =>
              update("ageRangeMax", Number(e.target.value) || 100)
            }
            className={`${INPUT_CLASS} tabular w-20`}
            aria-label="선호 최대 연령"
          />
          <span className="text-ink-500">세</span>
        </div>
      </Field>
    </>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] text-ink-700">
        {label}
        {required && (
          <span className="ml-0.5 text-vermilion-500" aria-label="필수">
            *
          </span>
        )}
        {hint && (
          <span className="ml-1.5 text-[11px] text-ink-500">({hint})</span>
        )}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function PillRadioGroup<V extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: V;
  options: ReadonlyArray<{ value: V; label: string }>;
  onChange: (v: V) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              "inline-flex items-center rounded-full border px-3 py-1.5 text-[13px] transition-colors",
              active
                ? "border-vermilion-500 bg-vermilion-50 font-semibold text-vermilion-700"
                : "border-ink-200 bg-white text-ink-600 hover:bg-hanji-50",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
