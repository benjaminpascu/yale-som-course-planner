import { bidBadge } from '../lib/courseDisplay'
import { IN_PLAN_SURFACE } from '../lib/sectionTheme'
import { formatSchedule, hasMeetingTime } from '../lib/parseCourses'
import { formatSessionLabel } from '../lib/sessionDisplay'

export default function CourseRow({
  course,
  isSelected,
  hasConflict,
  onToggle,
}) {
  const badge = bidBadge(course.bidOrPermission)

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
      <div className="flex flex-wrap items-start gap-2">
        <span
          className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={`font-medium ${hasConflict && !isSelected ? 'text-gray-600' : 'text-gray-900'}`}
          >
            {course.courseNumber} — {course.title}
          </div>
        </div>
        {hasConflict && !isSelected && (
          <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">
            Conflict
          </span>
        )}
        {isSelected && (
          <span className="shrink-0 rounded bg-yale-600 px-1.5 py-0.5 text-xs font-medium text-white">
            In plan
          </span>
        )}
      </div>
      <div className="mt-1 text-gray-600">{course.faculty || 'Faculty TBA'}</div>
      <div className="mt-1 text-gray-500">
        {formatSchedule(course)} · {course.units} unit
        {course.units === 1 ? '' : 's'} · {formatSessionLabel(course.session)}
        {course.category ? ` · ${course.category}` : ''}
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
