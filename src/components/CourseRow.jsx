import { normalizeCategory } from '../lib/categoryDisplay'
import {
  formatCourseHeading,
  formatCourseUnits,
  normalizeBidType,
} from '../lib/courseDisplay'
import { IN_PLAN_SURFACE } from '../lib/sectionTheme'
import {
  formatSchedule,
  hasMeetingTime,
  NO_MEETING_TIME_MESSAGE,
} from '../lib/parseCourses'
import { formatSessionLabel } from '../lib/sessionDisplay'
import CollapseChevron from './CollapseChevron'
import RegistrationTag from './RegistrationTag'
import RequirementTag from './RequirementTag'

function FactItem({ label, value, valueClassName = '' }) {
  if (value == null || value === '') return null
  return (
    <div className="text-gray-600">
      <span className="font-medium text-gray-800">{label}:</span>{' '}
      <span className={valueClassName}>{value}</span>
    </div>
  )
}

export default function CourseRow({
  course,
  requirementTagCodes = [],
  isSelected,
  hasConflict,
  isExpanded,
  onExpandToggle,
  onTogglePlan,
}) {
  const showRegistrationTag =
    Boolean(course.bidOrPermission) &&
    normalizeBidType(course.bidOrPermission) !== 'core'

  const showRightRail =
    requirementTagCodes.length > 0 ||
    isSelected ||
    (hasConflict && !isSelected)

  const categoryLabel = course.category
    ? normalizeCategory(course.category)
    : null

  const rowBg = isSelected
    ? IN_PLAN_SURFACE
    : [
        'bg-white even:bg-yale-100',
        hasConflict && !isSelected
          ? 'shadow-[inset_4px_0_0_0_#dc2626]'
          : '',
      ].join(' ')

  return (
    <li className={rowBg}>
      <button
        type="button"
        onClick={onExpandToggle}
        aria-expanded={isExpanded}
        className={`grid w-full items-start gap-x-1.5 px-3 py-2 text-left transition-colors ${
          showRightRail
            ? 'grid-cols-[auto_minmax(0,1fr)_auto]'
            : 'grid-cols-[auto_minmax(0,1fr)]'
        } ${
          isSelected ? 'hover:bg-save-100' : 'hover:bg-save-50'
        }`}
      >
        <CollapseChevron open={isExpanded} />
        <span className="min-w-0">
          <span
            className={`block text-xs font-medium leading-snug ${
              hasConflict && !isSelected ? 'text-gray-700' : 'text-gray-900'
            }`}
          >
            {formatCourseHeading(course)}
          </span>
          {!isExpanded ? (
            <span className="mt-0.5 block truncate text-[11px] leading-snug">
              {hasMeetingTime(course) ? (
                <span className="text-gray-500">
                  {formatSessionLabel(course.session)} ·{' '}
                  {formatSchedule(course)}
                </span>
              ) : (
                <>
                  <span className="text-gray-500">
                    {formatSessionLabel(course.session)} ·{' '}
                  </span>
                  <span className="text-amber-700">
                    {NO_MEETING_TIME_MESSAGE}
                  </span>
                </>
              )}
            </span>
          ) : null}
        </span>
        {showRightRail ? (
          <span className="flex max-w-[42%] flex-col items-end gap-1 self-stretch sm:max-w-[11rem]">
            {requirementTagCodes.length > 0 ? (
              <span className="flex flex-wrap items-center justify-end gap-1">
                {requirementTagCodes.map((code) => (
                  <RequirementTag
                    key={code}
                    tagCode={code}
                    className="!px-1 !py-px !text-[10px]"
                  />
                ))}
              </span>
            ) : null}
            {isSelected || (hasConflict && !isSelected) ? (
              <span
                className={`flex flex-wrap items-center justify-end gap-1 ${
                  requirementTagCodes.length > 0 ? 'mt-auto' : ''
                }`}
              >
                {isSelected ? (
                  <span className="rounded bg-save-800 px-1 py-px text-[10px] font-medium leading-tight text-white">
                    In plan
                  </span>
                ) : null}
                {hasConflict && !isSelected ? (
                  <span className="rounded bg-red-700 px-1 py-px text-[10px] font-semibold leading-tight text-white shadow-sm">
                    Conflict
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
        ) : null}
      </button>

      {isExpanded ? (
        <div className="space-y-2 border-t border-yale-200/90 px-3 py-2 text-[11px] leading-snug">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <FactItem label="Faculty" value={course.faculty || 'TBA'} />
            <FactItem
              label="When"
              value={
                hasMeetingTime(course)
                  ? formatSchedule(course)
                  : NO_MEETING_TIME_MESSAGE
              }
              valueClassName={
                hasMeetingTime(course) ? '' : 'font-medium text-amber-700'
              }
            />
            <FactItem
              label="Session"
              value={formatSessionLabel(course.session)}
            />
            <FactItem label="Category" value={categoryLabel} />
            <FactItem label="Units" value={formatCourseUnits(course.units)} />
            <FactItem label="Room" value={course.room} />
          </div>

          {showRegistrationTag ? (
            <RegistrationTag
              bidOrPermission={course.bidOrPermission}
              className="!px-1 !py-px !text-[10px]"
            />
          ) : null}

          {course.description ? (
            <p className="border-t border-gray-200/60 pt-2 text-gray-600">
              {course.description}
            </p>
          ) : null}

          {course.syllabusUrl ? (
            <a
              href={course.syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[10px] font-medium text-yale-800 underline decoration-yale-800/30 hover:decoration-yale-800"
            >
              Syllabus
            </a>
          ) : null}

          <button
            type="button"
            onClick={onTogglePlan}
            className={`w-full rounded-md border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
              isSelected
                ? 'border-red-800 bg-red-700 text-white hover:bg-red-800'
                : 'border-save-900 bg-save-800 text-white hover:bg-save-900'
            }`}
          >
            {isSelected ? 'Remove from plan' : 'Add to plan'}
          </button>
        </div>
      ) : null}
    </li>
  )
}
