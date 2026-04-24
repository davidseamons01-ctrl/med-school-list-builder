"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/useOnboardingStore";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

const DEALBREAKER_OPTIONS = [
  "No mandatory lectures",
  "No pass/fail preclinical curriculum",
  "No family support resources",
  "Cost of living too high",
  "No major research infrastructure",
];

const MUST_HAVE_OPTIONS = [
  "Strong NIH-funded research ecosystem",
  "Robust spouse/partner support",
  "Reasonable daycare access and costs",
  "Large academic hospital network",
  "Flexible clerkship scheduling",
];

export default function OnboardingPage() {
  const router = useRouter();
  const draft = useOnboardingStore((state) => state.draft);
  const setCgpa = useOnboardingStore((state) => state.setCgpa);
  const setSgpa = useOnboardingStore((state) => state.setSgpa);
  const setMcat = useOnboardingStore((state) => state.setMcat);
  const setResidencyState = useOnboardingStore((state) => state.setResidencyState);
  const addStrongTieState = useOnboardingStore((state) => state.addStrongTieState);
  const removeStrongTieState = useOnboardingStore((state) => state.removeStrongTieState);
  const setIsMarried = useOnboardingStore((state) => state.setIsMarried);
  const setDependents = useOnboardingStore((state) => state.setDependents);
  const addActivity = useOnboardingStore((state) => state.addActivity);
  const updateActivity = useOnboardingStore((state) => state.updateActivity);
  const removeActivity = useOnboardingStore((state) => state.removeActivity);
  const setPersonalStatement = useOnboardingStore((state) => state.setPersonalStatement);
  const addDealbreaker = useOnboardingStore((state) => state.addDealbreaker);
  const removeDealbreaker = useOnboardingStore((state) => state.removeDealbreaker);

  const [currentStep, setCurrentStep] = useState(1);
  const [specialtyAmbition, setSpecialtyAmbition] = useState(3);
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [activityPaste, setActivityPaste] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityError, setActivityError] = useState<string | null>(null);
  const [cgpaInput, setCgpaInput] = useState(String(draft.basicStats.cgpa || ""));
  const [sgpaInput, setSgpaInput] = useState(String(draft.basicStats.sgpa || ""));
  const [mcatInput, setMcatInput] = useState(String(draft.basicStats.mcat || ""));
  const [dependentsInput, setDependentsInput] = useState(String(draft.familyStatus.dependents || ""));
  const [activityHoursInput, setActivityHoursInput] = useState("");

  const meaningfulCount = useMemo(
    () => draft.activities.filter((activity) => activity.isMostMeaningful).length,
    [draft.activities],
  );

  function toggleStrongTieState(stateCode: string) {
    if (draft.strongTieStates.includes(stateCode)) {
      removeStrongTieState(stateCode);
      return;
    }
    addStrongTieState(stateCode);
  }

  function addManualActivity() {
    if (!activityTitle.trim()) return;
    const parsedHours = Number(activityHoursInput);
    addActivity({
      title: activityTitle.trim(),
      description: activityDescription.trim(),
      isMostMeaningful: false,
      hours: Number.isFinite(parsedHours) ? Math.max(0, parsedHours) : 0,
    });
    setActivityTitle("");
    setActivityDescription("");
    setActivityHoursInput("");
  }

  function addPastedActivities() {
    const rows = activityPaste
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    rows.forEach((line) => {
      const [title, description = "", hoursRaw = "0"] = line.split("|").map((part) => part.trim());
      addActivity({
        title: title || "Untitled Activity",
        description,
        isMostMeaningful: false,
        hours: Number(hoursRaw) > 0 ? Number(hoursRaw) : 0,
      });
    });
    setActivityPaste("");
  }

  function toggleMostMeaningful(index: number) {
    const entry = draft.activities[index];
    if (!entry) return;
    if (!entry.isMostMeaningful && meaningfulCount >= 3) {
      setActivityError("Only 3 activities can be marked as Most Meaningful.");
      return;
    }
    setActivityError(null);
    updateActivity(index, { isMostMeaningful: !entry.isMostMeaningful });
  }

  function toggleDealbreaker(option: string) {
    if (draft.dealbreakers.includes(option)) {
      removeDealbreaker(option);
      return;
    }
    addDealbreaker(option);
  }

  function toggleMustHave(option: string) {
    setMustHaves((prev) =>
      prev.includes(option) ? prev.filter((value) => value !== option) : [...prev, option],
    );
  }

  function loadTestingPersona() {
    setCgpa(3.97);
    setSgpa(3.95);
    setMcat(522);
    setResidencyState("ID");
    setIsMarried(true);
    setDependents(1);
    setCgpaInput("3.97");
    setSgpaInput("3.95");
    setMcatInput("522");
    setDependentsInput("1");
    setSpecialtyAmbition(5);
    addActivity({
      title: "Lab Manager - Translational Neuroscience",
      description: "Managed wet-lab operations, protocols, and data quality.",
      isMostMeaningful: true,
      hours: 2400,
    });
    addActivity({
      title: "RBT",
      description: "Direct patient-facing behavioral intervention and documentation.",
      isMostMeaningful: true,
      hours: 1800,
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="surface rounded-[2rem] p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Onboarding</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Build your strategy profile</h1>
          </div>
          <button
            type="button"
            onClick={loadTestingPersona}
            className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20"
          >
            Load testing persona
          </button>
        </div>
        <div className="mt-6 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                step === currentStep ? "bg-cyan-400 text-slate-950" : "bg-white/10 text-slate-300"
              }`}
            >
              Step {step}
            </button>
          ))}
        </div>
      </section>

      <section className="surface rounded-[2rem] p-8">
        {currentStep === 1 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Step 1 - Stats and State Ties</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <label className="text-sm text-slate-300">
                cGPA
                <input
                  type="number"
                  step="0.01"
                  value={cgpaInput}
                  onChange={(event) => setCgpaInput(event.target.value)}
                  onBlur={() => {
                    if (cgpaInput.trim() === "") return;
                    const next = Number(cgpaInput);
                    if (Number.isFinite(next)) setCgpa(next);
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                sGPA
                <input
                  type="number"
                  step="0.01"
                  value={sgpaInput}
                  onChange={(event) => setSgpaInput(event.target.value)}
                  onBlur={() => {
                    if (sgpaInput.trim() === "") return;
                    const next = Number(sgpaInput);
                    if (Number.isFinite(next)) setSgpa(next);
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                MCAT
                <input
                  type="number"
                  value={mcatInput}
                  onChange={(event) => setMcatInput(event.target.value)}
                  onBlur={() => {
                    if (mcatInput.trim() === "") return;
                    const next = Number(mcatInput);
                    if (Number.isFinite(next)) setMcat(next);
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Residency State
                <select
                  value={draft.basicStats.residencyState}
                  onChange={(event) => setResidencyState(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
                >
                  <option value="">Select</option>
                  {US_STATES.map((stateCode) => (
                    <option key={stateCode} value={stateCode}>
                      {stateCode}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Strong ties to other states</p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {US_STATES.map((stateCode) => (
                  <label key={stateCode} className="inline-flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.strongTieStates.includes(stateCode)}
                      onChange={() => toggleStrongTieState(stateCode)}
                    />
                    {stateCode}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Step 2 - Family and Ambition</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={draft.familyStatus.isMarried}
                  onChange={(event) => setIsMarried(event.target.checked)}
                />
                Married / Partnered
              </label>
              <label className="text-sm text-slate-300">
                Dependents
                <input
                  type="number"
                  min={0}
                  value={dependentsInput}
                  onChange={(event) => setDependentsInput(event.target.value)}
                  onBlur={() => {
                    if (dependentsInput.trim() === "") return;
                    const next = Number(dependentsInput);
                    if (Number.isFinite(next)) setDependents(next);
                  }}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Specialty Ambition ({specialtyAmbition})
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={specialtyAmbition}
                  onChange={(event) => setSpecialtyAmbition(Number(event.target.value))}
                  className="mt-3 w-full"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span>Primary Care</span>
                  <span>Ultra-Competitive Subspecialty</span>
                </div>
              </label>
            </div>
          </div>
        ) : null}

        {currentStep === 3 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Step 3 - Activities</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Add activity manually</p>
                <input
                  placeholder="Title"
                  value={activityTitle}
                  onChange={(event) => setActivityTitle(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                />
                <textarea
                  placeholder="Description"
                  rows={3}
                  value={activityDescription}
                  onChange={(event) => setActivityDescription(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                />
                <input
                  type="number"
                  placeholder="Hours"
                  value={activityHoursInput}
                  onChange={(event) => setActivityHoursInput(event.target.value)}
                  onBlur={() => {
                    if (activityHoursInput.trim() === "") return;
                    const next = Number(activityHoursInput);
                    if (Number.isFinite(next)) setActivityHoursInput(String(next));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={addManualActivity}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
                >
                  Add activity
                </button>
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Paste activities (Title | Description | Hours)</p>
                <textarea
                  rows={7}
                  value={activityPaste}
                  onChange={(event) => setActivityPaste(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={addPastedActivities}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
                >
                  Add pasted activities
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-300">
                Most Meaningful selected: <span className="font-semibold text-white">{meaningfulCount}/3</span>
              </p>
              {activityError ? <p className="mt-1 text-xs text-rose-300">{activityError}</p> : null}
              <div className="mt-3 space-y-3">
                {draft.activities.map((activity, index) => (
                  <div key={`${activity.title}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{activity.title}</p>
                        <p className="text-xs text-slate-300">{activity.description || "No description provided."}</p>
                        <p className="mt-1 text-xs text-slate-400">Hours: {activity.hours}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActivity(index)}
                        className="text-xs text-rose-300 hover:text-rose-200"
                      >
                        Remove
                      </button>
                    </div>
                    <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={activity.isMostMeaningful}
                        onChange={() => toggleMostMeaningful(index)}
                      />
                      Mark as Most Meaningful
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {currentStep === 4 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Step 4 - Draft Personal Statement</h2>
            <textarea
              rows={18}
              value={draft.personalStatement}
              onChange={(event) => setPersonalStatement(event.target.value)}
              placeholder="Paste your full draft personal statement here..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
            />
          </div>
        ) : null}

        {currentStep === 5 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Step 5 - Dealbreakers and Must-Haves</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Dealbreakers</p>
                <div className="mt-3 space-y-2">
                  {DEALBREAKER_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.dealbreakers.includes(option)}
                        onChange={() => toggleDealbreaker(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Must-Haves</p>
                <div className="mt-3 space-y-2">
                  {MUST_HAVE_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={mustHaves.includes(option)}
                        onChange={() => toggleMustHave(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="rounded-full border border-white/15 px-5 py-2 text-sm text-slate-200 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentStep === 5) {
                router.push("/schools");
                return;
              }
              setCurrentStep((prev) => Math.min(5, prev + 1));
            }}
            className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            {currentStep === 5 ? "Finish and open explorer" : "Continue"}
          </button>
        </div>
      </section>
    </div>
  );
}

