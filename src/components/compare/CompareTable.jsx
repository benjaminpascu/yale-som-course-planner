import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeCourseScore,
  orderRowKeys,
  professorValue,
  scoreColor,
  sortRows,
} from '../../lib/compareScoring'
import { setScore } from '../../lib/compareStorage'
import RequirementTag from '../RequirementTag'
import NotePopover from './NotePopover'
import ProfessorCell from './ProfessorCell'
import ScoreInput from './ScoreInput'

function SortHeader({ label, sortKey, sort, onSort, align = 'center', className = '' }) {
  const active = sort.key === sortKey
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`px-2 py-2 font-semibold text-yale-950 ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-yale-700 ${
          align === 'left' ? '' : 'justify-center'
        }`}
      >
        {label}
        {active ? (
          <span aria-hidden className="text-[10px]">
            {sort.dir === 'asc' ? '▲' : '▼'}
          </span>
        ) : null}
      </button>
    </th>
  )
}

/**
 * Ranked comparison. Row order freezes while focus is inside the table (or one
 * of its popovers) so rows don't jump mid-typing; it re-sorts when focus leaves.
 */
export default function CompareTable({ groups, store, update, onOpenDetails }) {
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' })
  const [frozen, setFrozen] = useState(null)
  const tableRef = useRef(null)
  const orderRef = useRef([])

  const manual = store.criteria.filter((c) => c.kind === 'manual')

  const rows = useMemo(
    () =>
      groups.map((group) => ({
        group,
        result: computeCourseScore(
          group,
          store.criteria,
          store.scores[group.key],
          store.professors,
        ),
        professor: professorValue(group.professors, store.professors),
      })),
    [groups, store.criteria, store.scores, store.professors],
  )

  const sorted = useMemo(() => {
    const getValue = (row, key) => {
      if (key === 'course') return row.group.courseNumber
      if (key === 'score') return row.result.score
      if (key === 'professor') return row.professor
      return store.scores[row.group.key]?.[key] ?? null
    }
    return sortRows(rows, sort.key, sort.dir, getValue)
  }, [rows, sort, store.scores])

  const order = orderRowKeys(
    sorted.map((r) => r.group.key),
    frozen,
  )
  orderRef.current = order
  const rowByKey = new Map(rows.map((r) => [r.group.key, r]))

  useEffect(() => {
    function check() {
      const el = document.activeElement
      const inside =
        el &&
        el !== document.body &&
        (tableRef.current?.contains(el) || el.closest?.('[data-compare-popover]'))
      setFrozen((current) => (inside ? (current ?? orderRef.current) : null))
    }
    const onFocusChange = () => setTimeout(check, 0)
    document.addEventListener('focusin', onFocusChange)
    document.addEventListener('focusout', onFocusChange)
    return () => {
      document.removeEventListener('focusin', onFocusChange)
      document.removeEventListener('focusout', onFocusChange)
    }
  }, [])

  function handleSort(key) {
    setFrozen(null)
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'course' ? 'asc' : 'desc' },
    )
  }

  return (
    <table ref={tableRef} className="min-w-full border-collapse text-xs">
      <thead className="sticky top-0 z-20 bg-gray-50">
        <tr className="border-b border-gray-200">
          <SortHeader
            label="Course"
            sortKey="course"
            sort={sort}
            onSort={handleSort}
            align="left"
            className="sticky left-0 z-10 bg-gray-50 text-left"
          />
          {manual.map((c) => (
            <SortHeader key={c.id} label={c.name} sortKey={c.id} sort={sort} onSort={handleSort} />
          ))}
          <SortHeader
            label="Professor"
            sortKey="professor"
            sort={sort}
            onSort={handleSort}
            align="left"
            className="text-left"
          />
          <SortHeader label="Score" sortKey="score" sort={sort} onSort={handleSort} />
        </tr>
      </thead>
      <tbody>
        {order.map((key, rowIndex) => {
          const { group, result } = rowByKey.get(key)
          const label = `${group.courseNumber} ${group.title}`
          return (
            <tr key={key} className="border-b border-gray-100 align-middle">
              <td className="sticky left-0 z-10 min-w-[9rem] max-w-[22rem] bg-white sm:min-w-[14rem] px-2 py-1.5">
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenDetails(group)}
                    className="min-w-0 text-left font-medium leading-snug text-gray-900 hover:text-yale-800 hover:underline"
                  >
                    {group.courseNumber} — {group.title}
                  </button>
                  <NotePopover
                    courseKey={key}
                    courseLabel={label}
                    note={store.notes[key]}
                    update={update}
                  />
                </div>
                {group.tags.length > 0 ? (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {group.tags.map((tag) => (
                      <RequirementTag
                        key={tag}
                        tagCode={tag}
                        className="!px-1 !py-px !text-[10px]"
                      />
                    ))}
                  </div>
                ) : null}
              </td>
              {manual.map((c, colIndex) => (
                <td key={c.id} className="px-2 py-1.5 text-center">
                  <ScoreInput
                    value={store.scores[key]?.[c.id] ?? null}
                    onCommit={(v) => update((s) => setScore(s, key, c.id, v))}
                    ariaLabel={`${c.name} score for ${label}`}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                  />
                </td>
              ))}
              <td className="px-2 py-1.5">
                <ProfessorCell
                  professors={group.professors}
                  ratings={store.professors}
                  update={update}
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <span
                  className={`inline-flex h-8 min-w-[3rem] items-center justify-center rounded px-2 text-sm font-bold tabular-nums text-gray-900 ${
                    result.score != null && !result.complete ? 'opacity-60' : ''
                  }`}
                  style={{ backgroundColor: scoreColor(result.score) ?? undefined }}
                >
                  {result.score != null ? result.score.toFixed(1) : '—'}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
