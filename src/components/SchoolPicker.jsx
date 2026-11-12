/** Which Yale school's courses the Course Catalog shows (one at a time). */
export default function SchoolPicker({ schools, schoolId, onSchoolChange, className = '' }) {
  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">School</span>
      <select
        value={schoolId}
        onChange={(e) => onSchoolChange(e.target.value)}
        className="h-[38px] w-full appearance-none truncate rounded-md border border-[#c5ced9] bg-white py-1.5 pr-9 pl-3 text-sm font-semibold text-yale-800 hover:bg-yale-50"
      >
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-xs text-yale-800">
        ▾
      </span>
    </label>
  )
}
