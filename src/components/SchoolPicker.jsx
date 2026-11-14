import Dropdown from './Dropdown'

/** Which Yale school's courses the Course Catalog shows (one at a time). */
export default function SchoolPicker({ schools, schoolId, onSchoolChange, className = '' }) {
  return (
    <Dropdown
      ariaLabel="School"
      options={schools.map((s) => ({ value: s.id, label: s.label }))}
      value={schoolId}
      onChange={onSchoolChange}
      className={className}
      buttonClassName="h-[38px] rounded-md border border-[#c5ced9] bg-white py-1.5 pl-3 text-sm font-semibold text-yale-800 hover:bg-yale-50"
    />
  )
}
