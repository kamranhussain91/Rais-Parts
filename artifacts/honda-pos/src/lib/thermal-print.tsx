import React from 'react';

export const THERMAL_PAPER_OPTIONS = [
  { value: '80x210', label: 'Printer Paper(80 x 210mm)' },
  { value: '80x297', label: 'Printer Paper(80 x 297mm)' },
  { value: '80x3276', label: 'Printer Paper(80 x 3276mm)' },
] as const;

export type ThermalPaperSize = typeof THERMAL_PAPER_OPTIONS[number]['value'];

export const DEFAULT_THERMAL_PAPER_SIZE: ThermalPaperSize = '80x210';

export const thermalPaperClass = (size: ThermalPaperSize) => `thermal-paper-${size}`;

export const ThermalPaperSizeSelect: React.FC<{
  value: ThermalPaperSize;
  onChange: (value: ThermalPaperSize) => void;
}> = ({ value, onChange }) => (
  <select
    aria-label="Thermal printer paper size"
    value={value}
    onChange={event => onChange(event.target.value as ThermalPaperSize)}
    className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-neutral-600 outline-none transition-colors focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
  >
    {THERMAL_PAPER_OPTIONS.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);