"use client";

import { useState } from "react";
import { getWeekRange, type WeekRange } from "@/lib/week-utils";
import { format } from "date-fns";

interface WeekSelectorProps {
  weeks: WeekRange[];
  selectedWeek: WeekRange | null;
  onSelect: (week: WeekRange) => void;
}

export function WeekSelector({ weeks, selectedWeek, onSelect }: WeekSelectorProps) {
  const [dateValue, setDateValue] = useState("");

  const handleDropdownChange = (value: string) => {
    const week = weeks.find((w) => w.start.toISOString() === value);
    if (week) {
      onSelect(week);
      setDateValue(format(week.start, "yyyy-MM-dd"));
    }
  };

  const handleDateChange = (value: string) => {
    setDateValue(value);
    if (!value) return;
    const date = new Date(value + "T00:00:00");
    if (isNaN(date.getTime())) return;
    const snapped = getWeekRange(date);
    onSelect(snapped);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground font-medium">Week</label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedWeek?.start.toISOString() ?? ""}
          onChange={(e) => handleDropdownChange(e.target.value)}
        >
          <option value="">All weeks</option>
          {weeks.map((week) => (
            <option key={week.start.toISOString()} value={week.start.toISOString()}>
              {week.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground font-medium">Pick date (snaps to Sat-Fri)</label>
        <input
          type="date"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={dateValue}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>
    </div>
  );
}
