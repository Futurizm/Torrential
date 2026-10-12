import { useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  Database,
  ExternalLink,
  FolderOpen,
  Gauge,
  HardDrive,
  Info,
  Languages,
  Network,
  ShieldCheck,
} from 'lucide-react'
import { store, useStore } from '@/store/store'
import { LOCALES, useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { isDesktop, revealDownloads } from '@/lib/desktop'
import { formatBytes } from '@/lib/format'

const MB = 1024 * 1024

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-zinc-200">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

function LimitInput({
  value,
  onChange,
}: {
  value: number
  onChange: (bytes: number) => void
}) {
  const { t } = useI18n()
  const unlimited = value < 0
  const [text, setText] = useState(unlimited ? '' : String(Math.round(value / MB)))

  useEffect(() => {
    setText(unlimited ? '' : String(Math.round(value / MB)))
  }, [value])

  return (
    <div className="flex items-center gap-2">
      <input
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const parsed = Number(event.target.value)
          onChange(Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * MB) : -1)
        }}
        placeholder={t('settings.unlimited')}
        inputMode="numeric"
        className="focus-ring h-9 w-32 rounded-xl border border-white/[0.08] bg-black/25 px-3 text-[13px] text-zinc-100 placeholder:text-zinc-600"
      />
      <span className="text-[11px] text-zinc-600">MB/s</span>
      <span className="tabular ml-auto text-[11px] text-zinc-500">
        {unlimited ? t('settings.noLimit') : formatBytes(value)}
      </span>
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Gauge
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="card p-5 shadow-glow">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-indigo-300">
          <Icon size={17} strokeWidth={1.9} />
        </span>
        <div>
          <h3 className="text-[14px] font-semibold text-white">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-zinc-600">{description}</p>}
        </div>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] pb-2 last:border-0">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-300">{value}</dd>
    </div>
  )
}

export function SettingsView() {
  const { settings, global, connection } = useStore()
  const { t, locale, setLocale } = useI18n()
  const [downloadLimit, setDownloadLimit] = useState(-1)
  const [uploadLimit, setUploadLimit] = useState(-1)

  useEffect(() => {
    if (!settings) return
    setDownloadLimit(settings.downloadLimit)
    setUploadLimit(settings.uploadLimit)
  }, [settings])

  const dirty =
    settings !== null &&
    (downloadLimit !== settings.downloadLimit || uploadLimit !== settings.uploadLimit)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto grid max-w-4xl items-start gap-4 lg:grid-cols-2">
        <Card icon={Languages} title={t('settings.language')} description={t('settings.language.hint')}>
          <div className="flex gap-2">
            {LOCALES.map((option) => (
              <button
                key={option.id}
                onClick={() => setLocale(option.id)}
                className={cn(
                  'btn flex-1 py-2.5 text-xs font-semibold',
                  locale === option.id
                    ? 'bg-indigo-500/90 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500'
                    : 'border border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-white',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        <Card icon={Gauge} title={t('settings.speed')} description={t('settings.speed.hint')}>
          <Field label={t('settings.downloadLimit')}>
            <LimitInput value={downloadLimit} onChange={setDownloadLimit} />
          </Field>
          <Field label={t('settings.uploadLimit')} hint={t('settings.uploadLimit.hint')}>
            <LimitInput value={uploadLimit} onChange={setUploadLimit} />
          </Field>

          <button
            className="btn-primary w-full disabled:opacity-40"
            disabled={!dirty}
            onClick={() => void store.saveSettings({ downloadLimit, uploadLimit })}
          >
            {t('settings.saveLimits')}
          </button>
        </Card>

        <Card icon={HardDrive} title={t('settings.storage')} description={t('settings.storage.hint')}>
          <Field label={t('settings.downloadDir')}>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5">
                <FolderOpen size={15} className="shrink-0 text-zinc-500" />
                <span className="truncate font-mono text-[12px] text-zinc-300">
                  {settings?.downloadDir ?? '…'}
                </span>
              </div>
              {isDesktop && (
                <button
                  className="btn-ghost shrink-0 px-3 py-2.5"
                  title={t('settings.reveal')}
                  onClick={() => void revealDownloads()}
                >
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          </Field>

          <dl className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-zinc-600">
                {t('settings.received')}
              </dt>
              <dd className="tabular mt-0.5 text-zinc-200">{formatBytes(global.downloaded)}</dd>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-zinc-600">
                {t('settings.sent')}
              </dt>
              <dd className="tabular mt-0.5 text-zinc-200">{formatBytes(global.uploaded)}</dd>
            </div>
          </dl>
        </Card>

        <Card icon={Network} title={t('settings.engine')} description={t('settings.engine.hint')}>
          <ul className="space-y-2.5 text-[12px]">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <Database size={13} className="text-zinc-600" />
                {t('settings.dht')}
              </span>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px]',
                  settings?.dht
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-white/[0.05] text-zinc-500',
                )}
              >
                {settings?.dht ? t('settings.dhtOn') : t('settings.dhtOff')}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <ShieldCheck size={13} className="text-zinc-600" />
                {t('settings.persist')}
              </span>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px]',
                  settings?.persist
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-white/[0.05] text-zinc-500',
                )}
              >
                {settings?.persist ? t('settings.persistOn') : t('settings.persistOff')}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400">
                <Activity size={13} className="text-zinc-600" />
                {t('settings.socket')}
              </span>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px]',
                  connection === 'open'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-amber-500/10 text-amber-300',
                )}
              >
                {connection === 'open' ? t('settings.socketOn') : t('settings.socketOff')}
              </span>
            </li>
          </ul>

          <p className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-zinc-500">
            <Info size={13} className="mt-0.5 shrink-0 text-zinc-600" />
            {t('settings.envHint', { a: 'DOWNLOAD_DIR', b: 'DHT' })}
          </p>
        </Card>

        <Card icon={Info} title={t('settings.about')} description={t('settings.about.hint')}>
          <dl className="space-y-2 text-[12px]">
            <Row label={t('settings.about.engine')} value={t('settings.about.engineValue')} />
            <Row label={t('settings.about.ui')} value={t('settings.about.uiValue')} />
            <Row label={t('settings.about.updates')} value={t('settings.about.updatesValue')} />
          </dl>

          <ul className="space-y-1.5 text-[11px] text-zinc-600">
            <Shortcut combo="Ctrl + V" description={t('shortcut.magnet')} />
            <Shortcut combo="/" description={t('shortcut.search')} />
            <Shortcut combo="Ctrl + N" description={t('shortcut.add')} />
            <Shortcut combo="Esc" description={t('shortcut.close')} />
          </ul>
        </Card>
      </div>
    </div>
  )
}

/** Подсказка с сочетанием клавиш: справа — локализованное действие. */
function Shortcut({ combo, description }: { combo: string; description: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="kbd shrink-0">{combo}</span>
      <span>{description}</span>
    </li>
  )
}