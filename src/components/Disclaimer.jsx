/** Shared copy per PRD §7.3 / §10 — tags and official source. */
export function TagDisclaimer({ className = '' }) {
  return (
    <p className={`text-xs text-amber-900/90 ${className}`.trim()}>
      Requirement tags are student-maintained. Verify requirements with your
      advisor and the{' '}
      <a
        href="https://som.yale.edu/elective-core-courses"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-2 hover:text-amber-950"
      >
        official Yale SOM course list
      </a>{' '}
      before registering.
    </p>
  )
}

export function PlanDisclaimer({ className = '' }) {
  return (
    <p className={`text-xs text-gray-500 ${className}`.trim()}>
      Saved plans stay in this browser only. Clearing cache removes them.
    </p>
  )
}
