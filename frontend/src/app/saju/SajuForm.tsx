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

export function SajuForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [{ fetching, error }, submitSaju] = useMutation(SUBMIT_SAJU);
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!state.nickname.trim()) {
      setValidationError("닉네임은 필수입니다");
      return;
    }
    if (!state.birthDate) {
      setValidationError("생년월일은 필수입니다");
      return;
    }
    if (state.ageRangeMin > state.ageRangeMax) {
      setValidationError("선호 연령 최소가 최대보다 크면 안 됩니다");
      return;
    }
    if (state.ageRangeMin < 18 || state.ageRangeMax > 100) {
      setValidationError("연령 범위는 18 ~ 100 사이여야 합니다");
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
    <main style={S.main}>
      <h1>사주 입력</h1>
      <p style={S.help}>
        생년월일·성별과 매칭 선호도를 입력하면 사주 풀이와 매칭이 자동 시작됩니다.
      </p>

      <form onSubmit={handleSubmit}>
        <fieldset style={S.fieldset}>
          <legend style={S.legend}>1. 기본 정보</legend>

          <label style={S.label}>
            <span style={S.labelText}>닉네임 *</span>
            <input
              type="text"
              value={state.nickname}
              onChange={(e) => update("nickname", e.target.value)}
              maxLength={30}
              style={S.input}
              required
            />
          </label>

          <label style={S.label}>
            <span style={S.labelText}>한 줄 소개</span>
            <textarea
              value={state.bio}
              onChange={(e) => update("bio", e.target.value)}
              maxLength={200}
              rows={3}
              style={{ ...S.input, fontFamily: "inherit", resize: "vertical" }}
            />
          </label>
        </fieldset>

        <fieldset style={S.fieldset}>
          <legend style={S.legend}>2. 생년월일시 (사주 계산용)</legend>

          <label style={S.label}>
            <span style={S.labelText}>생년월일 *</span>
            <input
              type="date"
              value={state.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
              style={S.input}
              required
            />
          </label>

          <label style={S.label}>
            <span style={S.labelText}>출생 시각 (선택, 정확한 사주 계산용)</span>
            <input
              type="time"
              value={state.birthTime}
              onChange={(e) => update("birthTime", e.target.value)}
              style={S.input}
            />
          </label>

          <div style={S.label}>
            <span style={S.labelText}>달력 *</span>
            <div style={S.radioGroup}>
              {(
                [
                  { value: "solar", label: "양력" },
                  { value: "lunar", label: "음력" },
                  { value: "lunar_leap", label: "음력 (윤달)" },
                ] as const satisfies readonly { value: CalendarType; label: string }[]
              ).map((opt) => (
                <label key={opt.value} style={S.radioLabel}>
                  <input
                    type="radio"
                    name="calendarType"
                    value={opt.value}
                    checked={state.calendarType === opt.value}
                    onChange={() => update("calendarType", opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={S.label}>
            <span style={S.labelText}>성별 *</span>
            <div style={S.radioGroup}>
              {(
                [
                  { value: "male", label: "남성" },
                  { value: "female", label: "여성" },
                ] as const satisfies readonly { value: Gender; label: string }[]
              ).map((opt) => (
                <label key={opt.value} style={S.radioLabel}>
                  <input
                    type="radio"
                    name="gender"
                    value={opt.value}
                    checked={state.gender === opt.value}
                    onChange={() => update("gender", opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <label style={S.label}>
            <span style={S.labelText}>출생지 (선택)</span>
            <input
              type="text"
              value={state.birthplace}
              onChange={(e) => update("birthplace", e.target.value)}
              placeholder="예: 서울"
              maxLength={50}
              style={S.input}
            />
          </label>
        </fieldset>

        <fieldset style={S.fieldset}>
          <legend style={S.legend}>3. 매칭 선호도</legend>

          <div style={S.label}>
            <span style={S.labelText}>관심 성별 *</span>
            <div style={S.radioGroup}>
              {(
                [
                  { value: "female", label: "여성" },
                  { value: "male", label: "남성" },
                ] as const satisfies readonly { value: Gender; label: string }[]
              ).map((opt) => (
                <label key={opt.value} style={S.radioLabel}>
                  <input
                    type="radio"
                    name="interestedGender"
                    value={opt.value}
                    checked={state.interestedGender === opt.value}
                    onChange={() => update("interestedGender", opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <label style={S.label}>
            <span style={S.labelText}>
              선호 연령 범위 *: {state.ageRangeMin} ~ {state.ageRangeMax}세
            </span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="number"
                min={18}
                max={100}
                value={state.ageRangeMin}
                onChange={(e) =>
                  update("ageRangeMin", Number(e.target.value) || 18)
                }
                style={{ ...S.input, width: 80 }}
              />
              <span>~</span>
              <input
                type="number"
                min={18}
                max={100}
                value={state.ageRangeMax}
                onChange={(e) =>
                  update("ageRangeMax", Number(e.target.value) || 100)
                }
                style={{ ...S.input, width: 80 }}
              />
            </div>
          </label>
        </fieldset>

        {validationError && <p style={S.errorBox}>{validationError}</p>}
        {error && <p style={S.errorBox}>서버 오류: {error.message}</p>}

        <button type="submit" disabled={fetching} style={S.submitBtn}>
          {fetching ? "제출 중..." : "사주 입력 완료"}
        </button>
      </form>
    </main>
  );
}

const S = {
  main: {
    padding: 32,
    fontFamily: "system-ui",
    maxWidth: 640,
    margin: "0 auto",
  },
  help: { fontSize: 13, color: "#666", marginTop: -8 },
  fieldset: {
    marginTop: 20,
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
  },
  legend: { fontSize: 14, fontWeight: 600, padding: "0 8px" },
  label: { display: "block", marginTop: 12 },
  labelText: {
    display: "block",
    fontSize: 13,
    color: "#333",
    marginBottom: 4,
  },
  input: {
    width: "100%",
    padding: 8,
    border: "1px solid #ccc",
    borderRadius: 4,
    fontSize: 14,
    boxSizing: "border-box" as const,
  },
  radioGroup: { display: "flex", gap: 16, alignItems: "center" },
  radioLabel: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    fontSize: 14,
    cursor: "pointer",
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    background: "#fee",
    border: "1px solid #fcc",
    borderRadius: 4,
    color: "crimson",
    fontSize: 13,
  },
  submitBtn: {
    marginTop: 20,
    padding: "12px 24px",
    background: "#000",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
  },
} as const;
