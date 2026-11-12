import { APP_VERSION, UPDATES, formatUpdateDate } from '../lib/updates'

/** The /updates page: patch notes since launch, newest first. */
export default function UpdatesPage({ onBack }) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-yale-700 hover:text-yale-900"
        >
          ← Back
        </button>
        <div className="mt-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold text-yale-950">Updates</h2>
          <p className="text-sm text-gray-500">v{APP_VERSION}</p>
        </div>
        <ol className="mt-5 space-y-4">
          {UPDATES.map((update) => (
            <li
              key={update.version}
              className="rounded-lg border border-yale-150 bg-white px-5 py-4 text-yale-950"
            >
              <p className="font-semibold">
                {update.version}{' '}
                <span className="font-normal text-gray-500">
                  · {update.date ? formatUpdateDate(update.date) : update.label}
                </span>
              </p>
              {update.changes.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
                  {update.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}
