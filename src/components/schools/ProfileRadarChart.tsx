"use client";

import {
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useOnboardingStore } from "@/store/useOnboardingStore";

type Props = {
  school: { mcat: number; gpa: number; hours: number };
};

function normalizeGpa(gpa: number) {
  return Math.max(0, Math.min(100, ((gpa - 2.5) / 1.5) * 100));
}

function normalizeMcat(mcat: number) {
  return Math.max(0, Math.min(100, ((mcat - 470) / 58) * 100));
}

function normalizeHours(hours: number) {
  return Math.max(0, Math.min(100, (hours / 3000) * 100));
}

export function ProfileRadarChart({ school }: Props) {
  const draft = useOnboardingStore((state) => state.draft);
  const userHours = draft.activities.reduce((sum, activity) => sum + Math.max(0, activity.hours), 0);
  const user = {
    mcat: draft.basicStats.mcat || 0,
    gpa: draft.basicStats.cgpa || 0,
    hours: userHours,
  };
  const data = [
    { axis: "MCAT", user: normalizeMcat(user.mcat), school: normalizeMcat(school.mcat) },
    { axis: "GPA", user: normalizeGpa(user.gpa), school: normalizeGpa(school.gpa) },
    { axis: "Hours", user: normalizeHours(user.hours), school: normalizeHours(school.hours) },
  ];

  return (
    <div className="surface rounded-[1.6rem] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Profile Radar
      </h3>
      <p className="mt-2 text-sm text-slate-400">
        Applicant vs school median profile across GPA, MCAT, and experience hours.
      </p>
      <div className="mt-4 h-[280px] w-full">
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(148,163,184,0.25)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
            <PolarRadiusAxis tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} />
            <Radar
              name="You"
              dataKey="user"
              stroke="#22d3ee"
              fill="#22d3ee"
              fillOpacity={0.25}
            />
            <Radar
              name="School Median"
              dataKey="school"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.2}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

