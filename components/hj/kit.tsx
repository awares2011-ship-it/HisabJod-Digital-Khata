'use client'
import { ReactNode } from 'react'
import { ArrowLeft, X } from 'lucide-react'

export const ART = (n: string) => `/art/${n}.webp`

export function Art({ name, className = '', alt = '' }: { name: string; className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ART(name)} alt={alt} draggable={false} loading="lazy"
      className={`select-none object-contain ${className}`}
      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
  )
}

export function Avatar({ name, initials, color, size = 40 }: { name?: string; initials: string; color: string; size?: number }) {
  return (
    <div aria-label={name} className="shrink-0 rounded-full flex items-center justify-center text-white font-bold font-display"
      style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(145deg, ${color}, ${color}cc)`, boxShadow: `0 4px 12px ${color}33` }}>
      {initials}
    </div>
  )
}

export function Header({ title, onBack, right, sub }: { title: ReactNode; onBack?: () => void; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 px-4 bg-hj-bg/90 backdrop-blur-md border-b border-hj-line/70" style={{ height: 'calc(60px + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {onBack && (
        <button aria-label="Back" onClick={onBack} className="press -ml-1 w-10 h-10 rounded-full flex items-center justify-center text-hj-ink hover:bg-hj-card">
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-[17px] font-extrabold text-hj-ink truncate leading-tight">{title}</h2>
        {sub && <p className="text-[11px] text-hj-muted truncate">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function IconBtn({ children, onClick, label, tone = 'plain' }: { children: ReactNode; onClick?: () => void; label: string; tone?: 'plain' | 'wa' | 'brand' }) {
  const cls = tone === 'wa' ? 'bg-[#25D366] text-white' : tone === 'brand' ? 'bg-hj-brand text-white' : 'bg-hj-card text-hj-ink border border-hj-line'
  return <button aria-label={label} title={label} onClick={onClick} className={`press w-10 h-10 rounded-full flex items-center justify-center shadow-hj ${cls}`}>{children}</button>
}

export function Sheet({ open, onClose, title, children, tall }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; tall?: boolean }) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center">
      <div className="fade-enter absolute inset-0 bg-[#06140d]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={`sheet-enter relative w-full rounded-t-[28px] bg-hj-card text-hj-ink shadow-hjlg ${tall ? 'max-h-[88%]' : 'max-h-[85%]'} flex flex-col`}>
        <div className="pt-2.5 pb-1 flex justify-center"><span className="w-10 h-1.5 rounded-full bg-hj-line" /></div>
        {title && (
          <div className="flex items-center justify-between px-5 pb-2 pt-1">
            <h3 className="font-display font-extrabold text-[17px]">{title}</h3>
            <button aria-label="Close" onClick={onClose} className="press w-9 h-9 rounded-full bg-hj-card2 flex items-center justify-center text-hj-muted"><X size={16} /></button>
          </div>
        )}
        <div className="overflow-auto scrollbar-hide px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ art, title, sub, cta, onCta, secondary }: { art: string; title: string; sub: string; cta?: string; onCta?: () => void; secondary?: ReactNode }) {
  return (
    <div className="page-enter flex flex-col items-center text-center py-8 px-6">
      <div className="relative">
        <div className="absolute inset-4 rounded-full bg-hj-brandsoft blur-2xl" />
        <Art name={art} className="relative w-40 h-40 float-y dark:bg-[#eef6f0] dark:rounded-[40px]" />
      </div>
      <p className="font-display text-[17px] font-extrabold text-hj-ink mt-3">{title}</p>
      <p className="text-[13px] text-hj-muted mt-1 max-w-[260px] leading-snug">{sub}</p>
      {cta && <button onClick={onCta} className="press mt-5 px-6 h-12 rounded-2xl bg-hj-brand text-white font-bold text-[14px] shadow-[0_8px_20px_rgba(11,122,67,.28)]">{cta}</button>}
      {secondary}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-hj-muted mb-1.5">{label}</span>
      {children}
    </label>
  )
}
export const inputCls = 'w-full h-12 rounded-2xl border border-hj-line bg-hj-card2 px-4 text-[15px] text-hj-ink placeholder:text-hj-muted/70 outline-none focus:border-hj-brand focus:ring-4 focus:ring-hj-brand/15 transition'

export function PrimaryBtn({ children, onClick, disabled, tone = 'brand', className = '' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'brand' | 'give' | 'get' | 'ghost' | 'danger'; className?: string }) {
  const t = {
    brand: 'bg-hj-brand text-white shadow-[0_10px_24px_rgba(11,122,67,.28)]',
    give: 'bg-hj-give text-white shadow-[0_10px_24px_rgba(229,72,77,.28)]',
    get: 'bg-hj-get text-white shadow-[0_10px_24px_rgba(18,161,80,.28)]',
    ghost: 'bg-hj-card text-hj-brand border-2 border-hj-brand/70',
    danger: 'bg-hj-givesoft text-hj-give',
  }[tone]
  return <button onClick={onClick} disabled={disabled} className={`press w-full h-[52px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none ${t} ${className}`}>{children}</button>
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex p-1 rounded-2xl bg-hj-card2 border border-hj-line">
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`press flex-1 h-9 rounded-xl text-[13px] font-bold transition ${value === o.v ? 'bg-hj-card text-hj-brand shadow-hj' : 'text-hj-muted'}`}>{o.label}</button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={`w-12 h-7 rounded-full p-1 transition-colors ${on ? 'bg-hj-brand' : 'bg-hj-line'}`}>
      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`press shrink-0 h-9 px-4 rounded-full text-[13px] font-bold whitespace-nowrap border transition ${active ? 'bg-hj-ink text-hj-bg border-hj-ink' : 'bg-hj-card text-hj-ink2 border-hj-line'}`}>{children}</button>
  )
}
