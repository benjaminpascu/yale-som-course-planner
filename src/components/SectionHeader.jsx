import { isInverseSectionTone, sectionTone } from '../lib/sectionTheme'

export default function SectionHeader({ tone, title, subtitle, children }) {
  const { header } = sectionTone(tone)
  const inverse = isInverseSectionTone(tone)

  return (
    <div className={`border-b px-4 py-2.5 ${header}`}>
      <div
        className={`flex justify-between gap-3 ${children ? 'items-center' : 'items-start'}`}
      >
        <div className="min-w-0">
          <h2
            className={`text-sm font-semibold ${inverse ? 'text-white' : 'text-yale-950'}`}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={`mt-0.5 text-xs leading-snug ${inverse ? 'text-yale-100' : 'text-yale-700'}`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {children ? (
          <div className="flex shrink-0 justify-end">{children}</div>
        ) : null}
      </div>
    </div>
  )
}
