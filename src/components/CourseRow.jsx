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
import { isSomCourse } from '../lib/schools'
import { formatSessionLabel } from '../lib/sessionDisplay'
import BiddingHistory, { useBiddingRounds } from './BiddingHistory'
import CollapseChevron from './CollapseChevron'
import RegistrationTag from './RegistrationTag'
import NoDescription from './NoDescription'
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

  const biddingRounds = useBiddingRounds(course)
  // Open bid course with no past results: "No bidding history" where the squares would be.
  const showNoBiddingHistory =
    biddingRounds === null &&
    isExpanded &&
    isSomCourse(course) &&
    normalizeBidType(course.bidOrPermission) === 'bid'

  const showRightRail =
    requirementTagCodes.length > 0 ||
    isSelected ||
    (hasConflict && !isSelected)

  const categoryLabel = course.category
    ? normalizeCategory(course.category)
    : null

  // Left bar: green = in your plan, red = clashes with it.
  const rowBg = isSelected
    ? // A layer on top (not a shadow) so the in-plan ring doesn't cover half the bar.
      `${IN_PLAN_SURFACE} relative before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-save-800 before:pointer-events-none`
    : [
        'bg-white even:bg-yale-100',
        hasConflict && !isSelected
          ? 'shadow-[inset_4px_0_0_0_var(--color-danger)]'
          : '',
      ].join(' ')

  return (
    <li className={rowBg}>
      <button
        type="button"
        onClick={onExpandToggle}
        aria-expanded={isExpanded}
        className={`relative grid w-full items-start gap-x-1.5 px-3 py-2 text-left transition-colors ${
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
            <span
              className={`mt-0.5 block truncate text-[11px] leading-snug ${
                // Room for the squares pinned at the end of this line.
                biddingRounds ? (showRightRail ? 'pr-5' : 'pr-14') : ''
              }`}
            >
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
                  <span className="text-caution">
                    {NO_MEETING_TIME_MESSAGE}
                  </span>
                </>
              )}
            </span>
          ) : (
            // Open course: the time moves into the details. Its line stays (exactly as tall)
            // so the row doesn't change height, and holds the Bid required tag if any.
            <span className="mt-0.5 flex h-[1.375em] items-center text-[11px]">
              {showRegistrationTag ? (
                <RegistrationTag
                  bidOrPermission={course.bidOrPermission}
                  className="!px-1 !py-px !text-[10px]"
                />
              ) : null}
            </span>
          )}
        </span>
        {showRightRail ? (
          <span
            className={`flex max-w-[9rem] flex-col items-end gap-1 self-stretch sm:max-w-[11rem] ${
              // Keep In Plan / Conflict above the squares in the corner.
              (biddingRounds || showNoBiddingHistory) && (isSelected || hasConflict) ? 'pb-4' : ''
            }`}
          >
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
                    In Plan
                  </span>
                ) : null}
                {hasConflict && !isSelected ? (
                  <span className="rounded bg-danger px-1 py-px text-[10px] font-semibold leading-tight text-white shadow-sm">
                    Conflict
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
        ) : null}
        {biddingRounds ? (
          // Pinned in the bottom-right corner, on the time line, so it doesn't
          // take width from the title.
          <BiddingHistory rounds={biddingRounds} className="absolute right-3 bottom-[11px]" />
        ) : showNoBiddingHistory ? (
          <span className="absolute right-3 bottom-[9px] text-[10px] leading-tight text-gray-400">
            No bidding history
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
                hasMeetingTime(course) ? '' : 'font-medium text-caution'
              }
            />
            <FactItem
              label="Session"
              value={formatSessionLabel(course.session)}
            />
            <FactItem label="Category" value={categoryLabel} />
            <FactItem label="Units" value={isSomCourse(course) ? formatCourseUnits(course.units) : null} />
            <FactItem label="Section" value={course.section} />
            <FactItem label="Room" value={course.room} />
            <FactItem label="Also listed as" value={course.crossListings?.join(', ')} />
          </div>

          {course.prerequisites ? (
            <p className="border-t border-gray-200/60 pt-2 text-gray-600">{course.prerequisites}</p>
          ) : null}

          {course.description ? (
            <p className="border-t border-gray-200/60 pt-2 text-gray-600">
              {course.description}
            </p>
          ) : (
            <NoDescription className="border-t border-gray-200/60 pt-2" />
          )}

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
          {course.coursePageUrl ? (
            <a
              href={course.coursePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 inline-block text-[10px] font-medium text-yale-800 underline decoration-yale-800/30 hover:decoration-yale-800"
            >
              Course page
            </a>
          ) : null}

          <button
            type="button"
            onClick={onTogglePlan}
            className={`w-full rounded-md border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
              isSelected
                ? 'border-danger-hover bg-danger text-white hover:bg-danger-hover'
                : 'border-save-900 bg-save-800 text-white hover:bg-save-900'
            }`}
          >
            {isSelected ? 'Remove from Plan' : 'Add to Plan'}
          </button>
        </div>
      ) : null}
    </li>
  )
}
