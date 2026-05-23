import { normalizeCategory } from '../lib/categoryDisplay'
import { formatCourseHeading } from '../lib/courseDisplay'
import { IN_PLAN_SURFACE } from '../lib/sectionTheme'
import { formatSchedule, hasMeetingTime } from '../lib/parseCourses'
import { formatSessionLabel } from '../lib/sessionDisplay'
import RegistrationTag from './RegistrationTag'
import RequirementTag from './RequirementTag'

export default function CourseRow({
  course,
  requirementTagCodes = [],
  isSelected,
  hasConflict,
  onToggle,
}) {
  const rowBg = isSelected
    ? IN_PLAN_SURFACE
    : hasConflict
      ? 'border border-transparent bg-amber-50/70'
      : 'border border-transparent bg-white even:bg-gray-50/80'

  return (
    <li className={rowBg}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
          isSelected
            ? 'hover:bg-yale-selected-hover'
            : 'hover:bg-black/[0.03]'
        } ${hasConflict && !isSelected ? 'text-gray-600' : ''}`}
      >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            {requirementTagCodes.map((code) => (
              <RequirementTag key={code} tagCode={code} />
            ))}
            <div
              className={`min-w-0 flex-1 font-medium ${hasConflict && !isSelected ? 'text-gray-600' : 'text-gray-900'}`}
            >
              {formatCourseHeading(course)}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <RegistrationTag bidOrPermission={course.bidOrPermission} />
          {hasConflict && !isSelected && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">
              Conflict
            </span>
          )}
          {isSelected && (
            <span className="rounded bg-yale-600 px-1.5 py-0.5 text-xs font-medium text-white">
              In plan
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 text-gray-600">{course.faculty || 'Faculty TBA'}</div>
      <div className="mt-1 text-gray-500">
        {formatSchedule(course)} · {formatSessionLabel(course.session)}
        {course.category
          ? ` · ${normalizeCategory(course.category)}`
          : ''}
      </div>
      {!hasMeetingTime(course) && (
        <p className="mt-1 text-xs text-amber-700">
          No time defined — won&apos;t show on calendar
        </p>
      )}
      {course.syllabusUrl && (
        <a
          href={course.syllabusUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1 inline-block text-xs font-medium text-yale-800 underline decoration-yale-800/30 hover:decoration-yale-800"
        >
          Syllabus
        </a>
      )}
      </button>
    </li>
  )
}
