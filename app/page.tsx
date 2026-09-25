'use client'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  ArrowDownLeft, ArrowUpRight, Bell, Search, Plus, ChevronRight, Home, Users, BarChart3, MoreHorizontal,
  Phone, MapPin, Pencil, CreditCard, Wallet, StickyNote, Calendar, Share2, Download, Globe, Moon, Lock,
  CloudUpload, Upload, HelpCircle, Info, Check, Trash2, Landmark, Smartphone, Delete, FileText, FileSpreadsheet,
  Star, Gift, X, ArrowUpDown, MessageCircle, Receipt as ReceiptIcon, Flame, Sparkles, ShieldCheck, Clock, Fingerprint, ChevronDown,
} from 'lucide-react'
import { Lang, LANGS, tr, TKey, reminderMessage } from '@/lib/i18n'
import {
  View, TxnType, Filter, SortKey, ReminderTab, Reminder, Customer, Txn,
  customersInit, txnsInit, remindersInit, formatINR, compactINR, localISO, addDays, daysBetween, prettyDate, shortDate,
  evalExpr, effect, txnSortKey, colorFor, initialsOf, receiptPdf, statementPdf, customersPdf, monthPdf, parseCustomersCsv,
} from '@/lib/hj'
import { Art, Avatar, Header, IconBtn, Sheet, EmptyState, Field, inputCls, PrimaryBtn, Segmented, Toggle, Chip } from '@/components/hj/kit'

const STORE = 'hisabjod-v2'
const METHODS: { v: string; k: TKey; icon: typeof Wallet }[] = [
  { v: 'Cash', k: 'cash', icon: Wallet }, { v: 'UPI', k: 'upi', icon: Smartphone }, { v: 'Bank', k: 'bank', icon: Landmark },
  { v: 'Card', k: 'card', icon: CreditCard }, { v: 'Other', k: 'other', icon: MoreHorizontal },
]
type Confirm = { title: string; sub: string; cta: string; onYes: () => void } | null
type Toast = { msg: string; action?: { label: string; run: () => void } } | null

const isNativeApp = () => typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()

export default function Page() {
  // ---------- core state ----------
  const [hydrated, setHydrated] = useState(false)
  const [view, setView] = useState<View>('splash')
  const [dark, setDark] = useState(false)
  const [lang, setLang] = useState<Lang>('English')
  const [customers, setCustomers] = useState<Customer[]>(customersInit)
  const [txns, setTxns] = useState<Txn[]>(txnsInit)
  const [reminders, setReminders] = useState<Reminder[]>(remindersInit)
  const [selectedId, setSelectedId] = useState('1')
  const [filter, setFilter] = useState<Filter>('All')
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [search, setSearch] = useState('')
  const [txnType, setTxnType] = useState<TxnType>('give')
  const [expr, setExpr] = useState('')
  const [method, setMethod] = useState('Cash')
  const [desc, setDesc] = useState('')
  const [txnDateISO, setTxnDateISO] = useState(localISO())
  const [lastTxn, setLastTxn] = useState<Txn | null>(null)
  const [reminderTab, setReminderTab] = useState<ReminderTab>('Upcoming')
  const [detailTab, setDetailTab] = useState<'txns' | 'details' | 'notes'>('txns')
  const [notesDraft, setNotesDraft] = useState('')
  const [toast, setToast] = useState<Toast>(null)
  const toastTimer = useRef<any>(null)
  // business
  const [bizName, setBizName] = useState('Shree Kirana')
  const [ownerName, setOwnerName] = useState('')
  const [bizPhone, setBizPhone] = useState('+91 98765 43210')
  const [bizUpi, setBizUpi] = useState('')
  // sheets
  const [sheet, setSheet] = useState<null | 'addCust' | 'editCust' | 'biz' | 'lang' | 'changeCust' | 'addReminder' | 'rate' | 'sort' | 'month' | 'about' | 'txnActions' | 'forgot'>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [newCust, setNewCust] = useState({ name: '', phone: '', village: '', opening: '', dir: 'get' as 'get' | 'give' })
  const [editCust, setEditCust] = useState({ name: '', phone: '', village: '' })
  const [newReminder, setNewReminder] = useState({ customerId: '', name: '', amount: '', dueISO: localISO() })
  const [actionTxn, setActionTxn] = useState<Txn | null>(null)
  // lock
  const [storedPin, setStoredPin] = useState('')
  const [lockEnabled, setLockEnabled] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [unlockPin, setUnlockPin] = useState('')
  const [pinDraft, setPinDraft] = useState('')
  const [pinFirst, setPinFirst] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const hiddenAt = useRef<number | null>(null)
  // misc
  const [slide, setSlide] = useState(0)
  const [online, setOnline] = useState(true)
  const [offlineDismissed, setOfflineDismissed] = useState(false)
  const [viewHistory, setViewHistory] = useState<View[]>([])
  const touchStartX = useRef<number | null>(null)
  const [referralCode, setReferralCode] = useState('')
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [reportMonth, setReportMonth] = useState(localISO().slice(0, 7))
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const [native, setNative] = useState(false)

  const t = useCallback((k: TKey, v?: Record<string, string | number>) => tr(lang, k, v), [lang])
  const todayISO = localISO()
  const dayLabel = useCallback((iso: string) => {
    const d = daysBetween(iso, todayISO)
    return d === 0 ? t('today') : d === 1 ? t('yesterday') : prettyDate(iso)
  }, [t, todayISO])

  function showToast(msg: string, action?: { label: string; run: () => void }) {
    setToast({ msg, action }); clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), action ? 4500 : 2400)
  }
  const buzz = (ms = 10) => { try { if ('vibrate' in navigator) (navigator as any).vibrate(ms) } catch { } }

  // ---------- navigation ----------
  function navigateTo(v: View) {
    if (v === view) return
    setViewHistory(h => [...h, view])
    setView(v); buzz()
    try { window.history.pushState({ view: v }, '') } catch { }
  }
  function replaceView(v: View) { setView(v) }
  function goTab(v: View) {
    setViewHistory(v === 'home' ? [] : ['home']); setView(v); buzz(6)
  }
  function goBack() {
    if (sheet) { setSheet(null); return }
    if (confirm) { setConfirm(null); return }
    setViewHistory(h => {
      const prev = h[h.length - 1]
      if (prev && prev !== 'splash') { setView(prev === 'add-transaction' && view === 'success' ? 'home' : prev); return h.slice(0, -1) }
      if (view !== 'home' && view !== 'splash') setView('home')
      return []
    })
    buzz(8)
  }
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (touchStartX.current < 40 && dx > 80 && view !== 'splash' && view !== 'home') goBack()
    touchStartX.current = null
  }
  useEffect(() => {
    const onPop = () => { if (view !== 'splash' && !isLocked) goBack() }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isLocked, sheet, confirm])

  // ---------- persistence ----------
  useEffect(() => {
    let onboarded = false
    try {
      const raw = localStorage.getItem(STORE)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.customers) setCustomers(d.customers)
        if (d.txns) setTxns(d.txns)
        if (d.reminders) setReminders(d.reminders)
        const pinOk = d.storedPin && d.storedPin !== 'bio' // legacy "biometric" flag could never be unlocked
        if (pinOk) setStoredPin(d.storedPin)
        if (typeof d.lockEnabled === 'boolean') setLockEnabled(d.lockEnabled && !!pinOk)
        if (d.lockEnabled && pinOk) setIsLocked(true)
        if (d.bizName) setBizName(d.bizName)
        if (d.ownerName) setOwnerName(d.ownerName)
        if (d.bizPhone) setBizPhone(d.bizPhone)
        if (d.bizUpi) setBizUpi(d.bizUpi)
        if (typeof d.dark === 'boolean') setDark(d.dark)
        if (d.lang) setLang(d.lang)
        onboarded = true
      }
      if (localStorage.getItem('hisabjod-onboarded')) onboarded = true
      setLastBackupAt(localStorage.getItem('hisabjod-last-backup'))
    } catch { }
    setNative(isNativeApp())
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    setView(onboarded ? 'home' : 'splash')
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORE, JSON.stringify({ customers, txns, reminders, storedPin, lockEnabled, bizName, ownerName, bizPhone, bizUpi, dark, lang })) } catch { }
  }, [hydrated, customers, txns, reminders, storedPin, lockEnabled, bizName, ownerName, bizPhone, bizUpi, dark, lang])

  // re-lock after the app has been in background > 30s (previously it re-locked on every screen change)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now()
      else if (hiddenAt.current && Date.now() - hiddenAt.current > 30000 && lockEnabled && storedPin) setIsLocked(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [lockEnabled, storedPin])

  // online / offline
  useEffect(() => {
    const on = () => { setOnline(true); setOfflineDismissed(false) }
    const off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // referral ?ref= + PWA install
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref) { localStorage.setItem('hisabjod-ref', ref); showToast(`Referral: ${ref}`) }
      let code = localStorage.getItem('hisabjod-my-ref')
      if (!code) { code = 'HJ' + Math.random().toString(36).slice(2, 6).toUpperCase(); localStorage.setItem('hisabjod-my-ref', code) }
      setReferralCode(code)
    } catch { }
    const onBeforeInstall = (e: any) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = customers.find(c => c.id === selectedId) || customers[0]
  useEffect(() => { setNotesDraft(selected?.notes || '') }, [selectedId, selected?.notes])

  // ---------- derived ----------
  const lastTxnOf = useMemo(() => {
    const m: Record<string, Txn> = {}
    for (const x of txns) if (!m[x.customerId] || txnSortKey(x) > txnSortKey(m[x.customerId])) m[x.customerId] = x
    return m
  }, [txns])
  const reminderStatus = useCallback((r: Reminder): ReminderTab => {
    if (r.status === 'Completed') return 'Completed'
    if (r.dueISO) return r.dueISO < todayISO ? 'Overdue' : 'Upcoming'
    return r.status
  }, [todayISO])
  const dueText = (r: Reminder) => {
    if (!r.dueISO) return r.due
    if (r.type === 'rent') return prettyDate(r.dueISO)
    const d = daysBetween(todayISO, r.dueISO)
    return d === 0 ? t('dueToday') : d === 1 ? t('dueTomorrow') : d > 1 ? t('dueIn', { n: d }) : t('overdueBy', { n: -d })
  }
  const isOverdue = useCallback((c: Customer) => {
    if (c.balance <= 0) return false
    if (reminders.some(r => reminderStatus(r) === 'Overdue' && (r.customerId === c.id || r.name === c.name))) return true
    const last = lastTxnOf[c.id]
    const since = last?.dateISO || c.createdAt
    return !since || daysBetween(since, todayISO) > 30
  }, [reminders, reminderStatus, lastTxnOf, todayISO])

  const totalReceive = customers.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0)
  const totalPay = customers.reduce((s, c) => s + (c.balance < 0 ? -c.balance : 0), 0)
  const net = totalReceive - totalPay
  const overdueList = customers.filter(isOverdue)
  const overdueAmt = overdueList.reduce((s, c) => s + c.balance, 0)
  const todayTxns = txns.filter(x => x.dateISO === todayISO)
  const todayIn = todayTxns.filter(x => x.type === 'received').reduce((s, x) => s + x.amount, 0)
  const todayOut = todayTxns.filter(x => x.type === 'given').reduce((s, x) => s + x.amount, 0)
  const topDebtor = [...customers].sort((a, b) => b.balance - a.balance)[0]
  const pendingReminders = reminders.filter(r => reminderStatus(r) !== 'Completed' && (r.dueISO ? r.dueISO <= todayISO : r.status === 'Overdue')).length

  const streak = useMemo(() => {
    const dates = new Set(txns.map(x => x.dateISO))
    let s = 0; let d = todayISO
    if (!dates.has(d)) d = addDays(d, -1)
    while (dates.has(d) && s < 365) { s++; d = addDays(d, -1) }
    return s
  }, [txns, todayISO])
  const checklist = { cust: customers.length > 0, txn: txns.length > 0, backup: !!lastBackupAt }
  const checklistProgress = (checklist.cust ? 1 : 0) + (checklist.txn ? 1 : 0) + (checklist.backup ? 1 : 0)

  const customerCounts = useMemo(() => ({
    All: customers.length,
    Receivable: customers.filter(c => c.balance > 0).length,
    Payable: customers.filter(c => c.balance < 0).length,
    Overdue: overdueList.length,
  }), [customers, overdueList.length])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = customers.filter(c => {
      if (filter === 'Receivable' && c.balance <= 0) return false
      if (filter === 'Payable' && c.balance >= 0) return false
      if (filter === 'Overdue' && !isOverdue(c)) return false
      if (q && !(c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || (c.village || '').toLowerCase().includes(q))) return false
      return true
    })
    if (sortKey === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortKey === 'recent') list.sort((a, b) => (lastTxnOf[b.id] ? txnSortKey(lastTxnOf[b.id]) : '').localeCompare(lastTxnOf[a.id] ? txnSortKey(lastTxnOf[a.id]) : ''))
    else list.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    return list
  }, [filter, search, customers, sortKey, lastTxnOf, isOverdue])

  // running balance, newest first — robust even after deletes/edits
  const ledger = useMemo(() => {
    if (!selected) return [] as { t: Txn; run: number }[]
    const list = txns.filter(x => x.customerId === selected.id).sort((a, b) => txnSortKey(b).localeCompare(txnSortKey(a)))
    let run = selected.balance
    return list.map(x => { const r = { t: x, run }; run -= effect(x); return r })
  }, [txns, selected])

  // ---------- notifications / backup nudge — 4hr multicolor retention ----------
  useEffect(() => {
    if (!hydrated) return
    if (native) {
      (async () => {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          const perm = await LocalNotifications.requestPermissions()
          if (perm.display === 'granted') {
            // clear old single 9am notification
            try { await LocalNotifications.cancel({ notifications: [{ id: 1 }] }); } catch { }
            try {
              const pending = await LocalNotifications.getPending()
              if (pending.notifications?.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })
            } catch { }
            const baseBody = overdueList.length ? `${overdueList.length} customers overdue ${formatINR(overdueAmt)} — send reminders` : `Add today's entries — keep your ${Math.max(streak, 1)}-day streak`
            const multicolor: { h: number; m: number; color: string; emoji: string; title: string }[] = [
              { h: 9, m: 0, color: '#0b7a43', emoji: '🌿', title: 'Good morning — HisabJod' },
              { h: 13, m: 0, color: '#2563eb', emoji: '🔵', title: 'Afternoon check — HisabJod' },
              { h: 17, m: 0, color: '#f5a524', emoji: '🟡', title: 'Evening reminder — HisabJod' },
              { h: 21, m: 0, color: '#7c3aed', emoji: '🟣', title: 'Day wrap — HisabJod' },
            ]
            await LocalNotifications.schedule({
              notifications: multicolor.map((c, idx) => ({
                id: 101 + idx,
                title: `${c.emoji} ${c.title}`,
                body: `${c.emoji} ${baseBody} ${c.emoji}`,
                smallIcon: 'ic_launcher',
                // color is used on Android for smallIcon background — multicolor retention
                schedule: { on: { hour: c.h, minute: c.m }, allowWhileIdle: true },
                // extra for channel customization if supported
                channelId: 'hisabjod-retention',
              } as any)),
            })
            // create notification channel with multicolor importance (Android)
            try { await (LocalNotifications as any).createChannel?.({ id: 'hisabjod-retention', name: 'HisabJod Reminders', importance: 4, visibility: 1, lights: true, lightColor: '#0b7a43', vibration: true }) } catch { }
          }
        } catch { }
      })()
    }
    try {
      if ((!lastBackupAt || Date.now() - new Date(lastBackupAt).getTime() > 7 * 864e5) && customers.length > 0 && txns.length >= 5 && view === 'home') {
        const id = setTimeout(() => showToast(t('backupDue'), { label: t('backup'), run: () => navigateTo('backup') }), 2500)
        return () => clearTimeout(id)
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, native, view === 'home'])
  // rate prompt after 3 entries
  useEffect(() => {
    if (hydrated && txns.length === 3 && !localStorage.getItem('hisabjod-rated')) { const id = setTimeout(() => setSheet('rate'), 1500); return () => clearTimeout(id) }
  }, [txns.length, hydrated])

  // ---------- AdMob (unchanged ad units) ----------
  const interstitialCountRef = useRef(0)
  const lastInterstitialRef = useRef(0)
  useEffect(() => {
    if (!isNativeApp()) return
    ; (async () => {
      try {
        const { AdMob } = await import('@capacitor-community/admob')
        await AdMob.initialize({ requestTrackingAuthorization: true, initializeForTesting: false } as any)
        try { await (AdMob as any).prepareAppOpenAd?.({ adId: 'ca-app-pub-1607968585289432/6998555510' }) } catch { }
      } catch (e) { console.log('AdMob init', e) }
    })()
  }, [])
  // Banner — removed from Home, now inside feature screens with real ads
  useEffect(() => {
    if (!isNativeApp()) return
    const remove = async () => { try { const { AdMob } = await import('@capacitor-community/admob'); await AdMob.removeBanner().catch(() => { }) } catch { } }
    const bannerViews: View[] = ['customers', 'customer-detail', 'reports', 'reminders', 'backup', 'settings']
    if (!bannerViews.includes(view) || sheet || isLocked) { remove(); return }
    ; (async () => {
      try {
        const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob')
        await AdMob.removeBanner().catch(() => { })
        const opts: any = { adId: 'ca-app-pub-1607968585289432/3656322283', adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 90, isTesting: false }
        await AdMob.showBanner(opts)
      } catch { }
    })()
    return () => { remove() }
  }, [view, sheet, isLocked])
  async function showAppOpenAd() {
    if (!isNativeApp()) return
    try {
      const { AdMob } = await import('@capacitor-community/admob')
      try { await (AdMob as any).showAppOpenAd?.() } catch {
        try { await (AdMob as any).prepareAppOpenAd?.({ adId: 'ca-app-pub-1607968585289432/6998555510' }); await (AdMob as any).showAppOpenAd?.() } catch { }
      }
    } catch { }
  }
  async function showInterstitialSmart() {
    const now = Date.now()
    if (now - lastInterstitialRef.current < 120000) return // 2-min cap
    interstitialCountRef.current++
    if (interstitialCountRef.current % 3 !== 0) return // every 3rd save
    lastInterstitialRef.current = now
    try {
      const { AdMob } = await import('@capacitor-community/admob')
      await AdMob.prepareInterstitial({ adId: 'ca-app-pub-1607968585289432/2091959177', isTesting: false } as any)
      await AdMob.showInterstitial()
    } catch { }
  }
  async function showRewardedAd(onReward: () => void) {
    try {
      if (!isNativeApp()) { onReward(); return }
      const { AdMob } = await import('@capacitor-community/admob')
      await AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-1607968585289432/8717077271', isTesting: false } as any)
      let done = false
      // @ts-ignore
      AdMob.addListener('onRewardedVideoAdReward' as any, () => { if (!done) { done = true; onReward() } })
      await AdMob.showRewardVideoAd()
      setTimeout(() => { try { (AdMob as any).removeAllListeners?.() } catch { } }, 30000)
    } catch { onReward() }
  }
  useEffect(() => {
    if (hydrated && view === 'home' && !isLocked) { const id = setTimeout(() => showAppOpenAd(), 900); return () => clearTimeout(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // ---------- amount keypad / calculator ----------
  const hasOp = /[+\-×÷]/.test(expr.replace(/^-/, ''))
  const amountVal = expr ? evalExpr(expr) : NaN
  function handleKey(k: string) {
    buzz(5)
    if (k === 'del') { setExpr(a => a.slice(0, -1)); return }
    if (k === 'C') { setExpr(''); return }
    const ops = ['+', '-', '×', '÷']
    setExpr(a => {
      const last = a.slice(-1)
      if (ops.includes(k)) {
        if (!a) return a
        if (ops.includes(last)) return a.slice(0, -1) + k
        if (last === '.') return a
        return a.length > 28 ? a : a + k
      }
      const seg = a.split(/[+\-×÷]/).pop() || ''
      if (k === '.') { if (seg.includes('.')) return a; return a + (seg === '' ? '0.' : '.') }
      if (seg.includes('.') && seg.split('.')[1].length >= 2) return a
      if (!seg.includes('.') && seg.replace(/^0+/, '').length >= 7) return a
      if (seg === '0') return a.slice(0, -1) + k
      return a.length > 28 ? a : a + k
    })
  }
  function quickAdd(n: number) {
    const cur = Number.isFinite(amountVal) ? amountVal : 0
    setExpr(String(Math.round((cur + n) * 100) / 100))
  }

  // ---------- actions ----------
  function startEntry(type: TxnType, customerId?: string) {
    if (customers.length === 0) { showToast(t('addCustomerFirst')); setSheet('addCust'); return }
    if (customerId) setSelectedId(customerId)
    setTxnType(type); setExpr(''); setDesc(''); setMethod('Cash'); setTxnDateISO(localISO())
    navigateTo('add-transaction')
  }
  function saveTxn() {
    const amt = amountVal
    if (!amt || isNaN(amt) || amt <= 0) return showToast(t('enterAmount'))
    if (amt > 10000000) return showToast(t('amountTooLarge'))
    const isGive = txnType === 'give'
    const newBal = isGive ? selected.balance + amt : selected.balance - amt
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    const nt: Txn = { id: 't' + Date.now(), customerId: selected.id, name: selected.name, initials: selected.initials, color: selected.color, type: isGive ? 'given' : 'received', amount: amt, method, time, dateLabel: dayLabel(txnDateISO), bal: newBal, note: desc.trim(), dateISO: txnDateISO }
    setCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, balance: newBal, totalGiven: isGive ? c.totalGiven + amt : c.totalGiven, totalReceived: !isGive ? c.totalReceived + amt : c.totalReceived } : c))
    setTxns(prev => [nt, ...prev])
    setLastTxn(nt)
    setExpr(''); setDesc('')
    buzz(25)
    replaceView('success')
    setTimeout(() => showInterstitialSmart(), 1400)
  }
  function deleteTxn(x: Txn) {
    const snapshot = { customers, txns }
    setTxns(prev => prev.filter(y => y.id !== x.id))
    setCustomers(prev => prev.map(c => c.id === x.customerId ? { ...c, balance: c.balance - effect(x), totalGiven: x.type === 'given' ? c.totalGiven - x.amount : c.totalGiven, totalReceived: x.type === 'received' ? c.totalReceived - x.amount : c.totalReceived } : c))
    showToast(t('entryDeleted'), { label: t('undo'), run: () => { setCustomers(snapshot.customers); setTxns(snapshot.txns); setToast(null) } })
  }
  function addCustomer() {
    const name = newCust.name.trim()
    if (!name) return showToast(t('nameRequired'))
    if (newCust.phone && !/^\+?[\d\s-]{7,15}$/.test(newCust.phone)) return showToast(t('invalidPhone'))
    if (customers.some(c => c.name.toLowerCase() === name.toLowerCase())) { /* allow duplicates but warn */ showToast('⚠ ' + name) }
    const id = String(Date.now())
    const opening = Number(newCust.opening) || 0
    const bal = newCust.dir === 'get' ? opening : -opening
    const c: Customer = { id, name, phone: newCust.phone.trim() || '-', village: newCust.village.trim(), initials: initialsOf(name), color: colorFor(name), balance: bal, totalGiven: bal > 0 ? bal : 0, totalReceived: bal < 0 ? -bal : 0, notes: '', createdAt: localISO() }
    setCustomers(p => [c, ...p])
    if (opening) setTxns(p => [{ id: 't' + Date.now(), customerId: id, name, initials: c.initials, color: c.color, type: bal > 0 ? 'given' : 'received', amount: opening, method: 'Other', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), dateLabel: '', bal, note: 'Opening balance', dateISO: localISO() }, ...p])
    setNewCust({ name: '', phone: '', village: '', opening: '', dir: 'get' }); setSheet(null)
    setSelectedId(id); showToast(t('customerAdded'))
    navigateTo('customer-detail'); setDetailTab('txns')
  }
  function saveEditCustomer() {
    const name = editCust.name.trim()
    if (!name) return showToast(t('nameRequired'))
    setCustomers(prev => prev.map(c => c.id === selectedId ? { ...c, name, phone: editCust.phone || c.phone, village: editCust.village, initials: initialsOf(name) } : c))
    setTxns(prev => prev.map(x => x.customerId === selectedId ? { ...x, name, initials: initialsOf(name) } : x))
    setSheet(null); showToast(t('customerUpdated'))
  }
  function openEdit() { setEditCust({ name: selected.name, phone: selected.phone === '-' ? '' : selected.phone, village: selected.village || '' }); setSheet('editCust') }
  function askDeleteCustomer() {
    setConfirm({
      title: t('deleteCustomerQ', { name: selected.name }), sub: t('deleteCustomerSub'), cta: t('delete'), onYes: () => {
        const id = selected.id
        setCustomers(p => p.filter(c => c.id !== id)); setTxns(p => p.filter(x => x.customerId !== id))
        setReminders(p => p.filter(r => r.customerId !== id))
        goTab('customers'); showToast(t('customerDeleted'))
      },
    })
  }
  function saveNotes() { setCustomers(prev => prev.map(c => c.id === selectedId ? { ...c, notes: notesDraft } : c)); showToast(t('notesSaved')) }
  function openAddReminder(c?: Customer) {
    setNewReminder({ customerId: c?.id || '', name: c?.name || '', amount: c && c.balance > 0 ? String(c.balance) : '', dueISO: addDays(localISO(), 1) })
    setSheet('addReminder')
  }
  function handleAddReminder() {
    const name = newReminder.name.trim()
    if (!name || !newReminder.amount) return showToast(t('enterAmount'))
    setReminders(p => [{ id: 'r' + Date.now(), name, customerId: newReminder.customerId || undefined, amount: Number(newReminder.amount), due: '', status: 'Upcoming', dueISO: newReminder.dueISO }, ...p])
    setSheet(null); showToast(t('reminderAdded'))
    if (view !== 'reminders') navigateTo('reminders')
    setReminderTab(newReminder.dueISO < localISO() ? 'Overdue' : 'Upcoming')
  }
  function shareTextViaWhatsApp(phone: string, text: string) {
    const clean = phone.replace(/\D/g, '')
    const num = clean.length === 10 ? '91' + clean : clean
    window.open(num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }
  function remindCustomer(c: Customer, amount = c.balance) {
    shareTextViaWhatsApp(c.phone, reminderMessage(lang, c.name, formatINR(Math.abs(amount)), bizName, bizUpi || undefined))
    showToast(t('reminderSent'))
  }
  function shareKhataViaWhatsApp() {
    const c = selected
    const txt = `*${bizName} — Khata*\n${c.name} (${c.phone})\n${c.balance > 0 ? `Pending: ${formatINR(c.balance)}` : c.balance < 0 ? `Advance / payable: ${formatINR(-c.balance)}` : 'Settled ✅'}\nTotal given: ${formatINR(c.totalGiven)}\nTotal received: ${formatINR(c.totalReceived)}${bizUpi ? `\nUPI: ${bizUpi}` : ''}\n\nSent via HisabJod`
    shareTextViaWhatsApp(c.phone, txt)
  }

  async function saveBlobNative(blob: Blob, fileName: string, dir: 'Documents' | 'Cache' = 'Documents', shareText?: string) {
    if (!isNativeApp()) return false
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob) })
      await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory[dir] })
      try {
        const { Share } = await import('@capacitor/share')
        const uri = await Filesystem.getUri({ path: fileName, directory: Directory[dir] })
        await Share.share({ title: fileName, text: shareText || `Saved to Documents/${fileName}`, url: uri.uri, dialogTitle: 'Share' })
      } catch { }
      showToast(`Saved: ${fileName}`)
      return true
    } catch (e) { console.error(e) }
    return false
  }
  async function downloadBlob(blob: Blob, fileName: string) {
    if (await saveBlobNative(blob, fileName)) return
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500)
  }
  async function sharePdf(pdf: any, fileName: string, text: string, phone = '') {
    const blob = pdf.output('blob') as Blob
    const file = new File([blob], fileName, { type: 'application/pdf' })
    try {
      if ((navigator as any).canShare?.({ files: [file] })) { await (navigator as any).share({ title: fileName, text, files: [file] }); return }
    } catch { }
    if (await saveBlobNative(blob, fileName, 'Cache', text)) return
    shareTextViaWhatsApp(phone, text)
    pdf.save(fileName); showToast('PDF downloaded — attach in WhatsApp')
  }
  async function exportBackup() {
    const data = JSON.stringify({ app: 'HisabJod', version: 2, customers, txns, reminders, bizName, ownerName, bizPhone, bizUpi, date: new Date().toISOString() }, null, 2)
    await downloadBlob(new Blob([data], { type: 'application/json' }), `HisabJod-backup-${localISO()}.json`)
    const at = new Date().toISOString(); localStorage.setItem('hisabjod-last-backup', at); setLastBackupAt(at)
    showToast(t('backupSaved'))
  }
  function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result))
        if (!Array.isArray(d.customers)) throw new Error('bad')
        setCustomers(d.customers); setTxns(d.txns || []); setReminders(d.reminders || [])
        if (d.bizName) setBizName(d.bizName); if (d.bizUpi) setBizUpi(d.bizUpi); if (d.ownerName) setOwnerName(d.ownerName)
        const at = new Date().toISOString(); localStorage.setItem('hisabjod-last-backup', at); setLastBackupAt(at)
        showToast(t('restoreOk'))
      } catch { showToast(t('invalidFile')) }
    }
    r.readAsText(f); e.target.value = ''
  }
  function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => {
      const rows = parseCustomersCsv(String(r.result))
      if (!rows.length) return showToast(t('invalidFile'))
      const base = Date.now()
      const newC: Customer[] = rows.map((x, i) => ({ id: String(base + i), name: x.name, phone: x.phone, village: '', initials: initialsOf(x.name), color: colorFor(x.name), balance: x.balance, totalGiven: Math.max(0, x.balance), totalReceived: Math.max(0, -x.balance), notes: '', createdAt: localISO() }))
      const newT: Txn[] = newC.filter(c => c.balance).map((c, i) => ({ id: 't' + (base + i), customerId: c.id, name: c.name, initials: c.initials, color: c.color, type: c.balance > 0 ? 'given' : 'received', amount: Math.abs(c.balance), method: 'Other', time: '', dateLabel: '', bal: c.balance, note: 'Opening balance', dateISO: localISO() }))
      setCustomers(p => [...newC, ...p]); setTxns(p => [...newT, ...p])
      showToast(t('importedN', { n: newC.length }))
    }
    r.readAsText(f); e.target.value = ''
  }
  async function exportCSV() {
    await showRewardedAd(async () => {
      const header = 'Name,Phone,Village,Balance,Given,Received\n'
      const rows = customers.map(c => `"${c.name}","${c.phone}","${c.village || ''}",${c.balance},${c.totalGiven},${c.totalReceived}`).join('\n')
      await downloadBlob(new Blob(['﻿' + header + rows], { type: 'text/csv' }), `HisabJod-customers-${localISO()}.csv`)
    })
  }
  async function customerReportPdf() {
    await showRewardedAd(async () => { const p = customersPdf(customers, bizName); if (!(await saveBlobNative(p.output('blob'), 'HisabJod-customers.pdf'))) p.save('HisabJod-customers.pdf') })
  }
  async function monthReportPdf(label: string, list: Txn[]) {
    await showRewardedAd(async () => { const p = monthPdf(label, list, bizName); const fn = `HisabJod-${reportMonth}.pdf`; if (!(await saveBlobNative(p.output('blob'), fn))) p.save(fn) })
  }
  async function shareReceipt(x = lastTxn || txns[0]) {
    if (!x) return
    const c = customers.find(cc => cc.id === x.customerId)
    const txt = `*${bizName} — Receipt*\n${x.type === 'received' ? 'Received from' : 'Given to'} ${x.name}: *${formatINR(x.amount)}*\nDate: ${prettyDate(x.dateISO)} ${x.time}\nMode: ${x.method}\nBalance: ${formatINR(x.bal)}\n\nThank you 🙏 — HisabJod`
    await sharePdf(receiptPdf(x, bizName), `HisabJod-receipt-${x.name.replace(/\s+/g, '_')}-${x.amount}.pdf`, txt, c?.phone || '')
  }
  async function saveReceiptPdf(x = lastTxn || txns[0]) {
    if (!x) return
    const p = receiptPdf(x, bizName); const fn = `HisabJod-receipt-${x.id.slice(-6)}.pdf`
    if (!(await saveBlobNative(p.output('blob'), fn))) { p.save(fn); showToast('PDF saved') }
  }
  async function shareStatement() {
    const c = selected
    await sharePdf(statementPdf(c, ledger, bizName), `HisabJod-${c.name.replace(/\s+/g, '_')}-statement.pdf`, `*${bizName}* — statement for ${c.name}. Balance: ${formatINR(c.balance)}`, c.phone)
  }
  function inviteFriends() {
    const url = typeof window !== 'undefined' ? window.location.origin + '/?ref=' + referralCode : referralCode
    shareTextViaWhatsApp('', `Try *HisabJod* — free digital khata for dukandars 📒\nSimple • Secure • Offline • Marathi, Hindi, English\nUse my code *${referralCode}*:\n${url}`)
  }
  function eraseAll() {
    setCustomers([]); setTxns([]); setReminders([]); setStoredPin(''); setLockEnabled(false); setIsLocked(false)
    showToast(t('resetData'))
    goTab('home')
  }

  // ---------- PIN ----------
  function unlockKey(k: string) {
    if (k === 'del') { setUnlockPin(p => p.slice(0, -1)); return }
    const next = (unlockPin + k).slice(0, 4)
    setUnlockPin(next); buzz(5)
    if (next.length === 4) {
      setTimeout(() => {
        if (next === storedPin) { setIsLocked(false); setUnlockPin('') } else { setShakeKey(s => s + 1); buzz(60); setUnlockPin(''); showToast(t('wrongPin')) }
      }, 120)
    }
  }
  function setupKey(k: string) {
    if (k === 'del') { setPinDraft(p => p.slice(0, -1)); return }
    const next = (pinDraft + k).slice(0, 4)
    setPinDraft(next); buzz(5)
    if (next.length === 4) {
      setTimeout(() => {
        if (!pinFirst) { setPinFirst(next); setPinDraft('') }
        else if (pinFirst === next) { setStoredPin(next); setLockEnabled(true); setPinFirst(''); setPinDraft(''); showToast(t('pinSaved')); goBack() }
        else { setShakeKey(s => s + 1); setPinFirst(''); setPinDraft(''); showToast(t('pinMismatch')) }
      }, 120)
    }
  }

  // ---------- reports data ----------
  const monthOptions = useMemo(() => {
    const set = new Set<string>(txns.map(x => x.dateISO.slice(0, 7)))
    const d = new Date(); for (let i = 0; i < 6; i++) { set.add(localISO(new Date(d.getFullYear(), d.getMonth() - i, 1)).slice(0, 7)) }
    return [...set].sort().reverse().slice(0, 18)
  }, [txns])
  const monthLabelOf = (m: string) => new Date(m + '-01T00:00:00').toLocaleDateString(lang === 'English' ? 'en-IN' : lang === 'हिंदी' ? 'hi-IN' : 'mr-IN', { month: 'long', year: 'numeric' })

  const hour = new Date().getHours()
  const greet = hour < 12 ? t('goodMorning') : hour < 17 ? t('goodAfternoon') : t('goodEvening')
  const bizInitials = initialsOf(ownerName || bizName)
  const showNav = hydrated && !['splash', 'applock', 'add-transaction', 'success', 'receipt', 'customer-detail'].includes(view)
  const navPad = native && view === 'home' ? 'pb-[170px]' : 'pb-[110px]'

  // ======================================================================
  return (
    <div className={`${dark ? 'dark' : ''} min-h-[100dvh] flex justify-center sm:py-6`} lang={lang === 'English' ? 'en' : lang === 'हिंदी' ? 'hi' : 'mr'} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        className="w-full max-w-[430px] h-[100dvh] sm:h-[880px] sm:rounded-[36px] overflow-hidden relative flex flex-col bg-hj-bg text-hj-ink sm:shadow-[0_30px_80px_rgba(7,60,33,.25)] sm:border sm:border-hj-line"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>

        {/* boot */}
        {!hydrated && (
          <div className="flex-1 flex flex-col items-center justify-center bg-hj-bg">
            <Art name="khata" className="w-28 h-28 pop-enter" />
            <p className="font-display text-[26px] font-extrabold text-hj-brand mt-2">Hisab<span className="text-hj-gold">Jod</span></p>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div className={`fade-enter absolute left-4 right-4 z-[60] ${showNav ? 'bottom-[96px]' : 'bottom-6'} flex items-center gap-3 rounded-2xl bg-[#0f2319] text-white px-4 py-3 shadow-hjlg`}>
            <Check size={16} className="text-[#4ade80] shrink-0" />
            <span className="flex-1 text-[13px] font-semibold">{toast.msg}</span>
            {toast.action && <button onClick={toast.action.run} className="text-[13px] font-extrabold text-[#fbbf24] uppercase tracking-wide">{toast.action.label}</button>}
          </div>
        )}

        {/* LOCK OVERLAY */}
        {hydrated && isLocked && view !== 'splash' && (
          <div className="absolute inset-0 z-[70] bg-gradient-to-b from-[#0b7a43] to-[#053a20] flex flex-col items-center justify-center px-8 text-white">
            <div className="w-20 h-20 rounded-[26px] bg-white/15 backdrop-blur flex items-center justify-center"><Lock size={32} /></div>
            <h3 className="font-display font-extrabold text-[22px] mt-5">{t('appLocked')}</h3>
            <p className="text-white/70 text-[13px] mt-1">{t('enterPinUnlock')}</p>
            <div key={shakeKey} className={`flex gap-4 mt-6 ${shakeKey ? 'shake' : ''}`}>{[0, 1, 2, 3].map(i => <span key={i} className={`w-4 h-4 rounded-full transition ${i < unlockPin.length ? 'bg-white scale-110' : 'bg-white/25'}`} />)}</div>
            <PinPad onKey={unlockKey} dark />
            <button onClick={() => setSheet('forgot')} className="mt-4 text-white/80 text-[13px] font-semibold underline underline-offset-4">{t('forgotPin')}</button>
          </div>
        )}

        {/* ===================== ONBOARDING ===================== */}
        {hydrated && view === 'splash' && (() => {
          const slides = [
            { art: 'hero', title: t('ob1Title'), body: t('ob1Body'), bg: 'from-[#fff6e0] to-hj-bg' },
            { art: 'shop', title: t('ob2Title'), body: t('ob2Body'), bg: 'from-[#e7f5ec] to-hj-bg' },
            { art: 'private', title: t('ob3Title'), body: t('ob3Body'), bg: 'from-[#eaf2fd] to-hj-bg' },
          ]
          const s = slides[slide]
          const finish = () => { try { localStorage.setItem('hisabjod-onboarded', '1') } catch { } setViewHistory([]); setView('home'); setTimeout(() => showAppOpenAd(), 900) }
          return (
            <div className={`flex-1 flex flex-col bg-gradient-to-b ${dark ? 'from-hj-card2' : s.bg} px-6 pt-5 pb-7 transition-colors`}>
              <div className="flex items-center justify-between">
                <p className="font-display text-[20px] font-extrabold text-hj-brand">Hisab<span className="text-hj-gold">Jod</span></p>
                {slide < 2 && <button onClick={finish} className="text-[13px] font-bold text-hj-muted px-2 py-1">{t('skip')}</button>}
              </div>
              <div key={slide} className="page-enter flex-1 flex flex-col items-center justify-center text-center">
                <div className="relative w-[280px] h-[280px] flex items-center justify-center">
                  <div className="absolute inset-6 rounded-full bg-white/70 dark:bg-white/5 blur-2xl" />
                  <Art name={s.art} className={`relative ${s.art === 'hero' ? 'h-[270px] w-auto rounded-[28px] shadow-hjlg' : 'w-[260px] float-y'}`} alt={s.title} />
                </div>
                <h1 className="font-display text-[28px] leading-tight font-extrabold text-hj-ink mt-6">{s.title}</h1>
                <p className="text-[15px] text-hj-muted mt-2 max-w-[300px] leading-relaxed">{s.body}</p>
              </div>
              <div className="flex justify-center gap-2 mb-5">{slides.map((_, i) => <button aria-label={`Slide ${i + 1}`} key={i} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? 'w-7 bg-hj-brand' : 'w-2 bg-hj-line'}`} />)}</div>
              <PrimaryBtn onClick={() => slide < 2 ? setSlide(slide + 1) : finish()}>{slide < 2 ? t('next') : t('getStarted')} <ArrowUpRight size={18} /></PrimaryBtn>
              <div className="mt-4 flex justify-center">
                <div className="flex rounded-full p-1 gap-1 bg-hj-card border border-hj-line shadow-hj">
                  {LANGS.map(l => <button key={l} onClick={() => setLang(l)} className={`press px-4 h-8 rounded-full text-[13px] font-bold ${lang === l ? 'bg-hj-brand text-white' : 'text-hj-muted'}`}>{l}</button>)}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ===================== HOME ===================== */}
        {hydrated && view === 'home' && (
          <div className={`page-enter flex-1 overflow-auto scrollbar-hide ${navPad}`}>
            {/* top bar — safe-area fix for notch/status bar */}
            <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
              <button onClick={() => setSheet('biz')} className="press"><Avatar initials={bizInitials} color="#0b7a43" size={44} /></button>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-hj-muted">{greet} 👋</p>
                <p className="font-display text-[18px] font-extrabold truncate leading-tight">{ownerName || bizName}</p>
              </div>
              <button aria-label={t('reminders')} onClick={() => navigateTo('reminders')} className="press relative w-11 h-11 rounded-full bg-hj-card border border-hj-line shadow-hj flex items-center justify-center">
                <Bell size={19} className="text-hj-ink" />
                {pendingReminders > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-hj-give text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-hj-bg">{pendingReminders}</span>}
              </button>
            </div>

            {/* hero balance card */}
            <div className="px-5">
              <div className="relative overflow-hidden rounded-[28px] p-5 text-white bg-[radial-gradient(120%_120%_at_0%_0%,#14a05a_0%,#0b7a43_45%,#064d2a_100%)] shadow-hjlg">
                <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
                <div className="absolute right-10 -bottom-16 w-40 h-40 rounded-full bg-[#f5a524]/20" />
                <Art name="growth" className="absolute right-1 top-4 w-[108px] opacity-95 drop-shadow-xl" />
                <p className="relative text-[12px] font-semibold text-white/75 uppercase tracking-wider">{t('netBalance')}</p>
                <p className="relative font-display text-[34px] font-extrabold leading-tight tnum mt-0.5">{formatINR(Math.abs(net))}</p>
                <p className="relative text-[12px] font-semibold text-white/80">{net >= 0 ? t('youWillGet') : t('youWillGive')} • {t('customersN', { n: customers.length })}</p>
                <div className="relative grid grid-cols-2 gap-2.5 mt-4">
                  <button onClick={() => { setFilter('Receivable'); goTab('customers') }} className="press text-left rounded-2xl bg-white/12 backdrop-blur border border-white/15 px-3.5 py-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75"><span className="w-5 h-5 rounded-full bg-[#4ade80]/25 flex items-center justify-center"><ArrowDownLeft size={12} /></span>{t('toReceive')}</span>
                    <span className="block font-display text-[18px] font-extrabold tnum mt-1">{formatINR(totalReceive)}</span>
                  </button>
                  <button onClick={() => { setFilter('Payable'); goTab('customers') }} className="press text-left rounded-2xl bg-white/12 backdrop-blur border border-white/15 px-3.5 py-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75"><span className="w-5 h-5 rounded-full bg-[#fca5a5]/25 flex items-center justify-center"><ArrowUpRight size={12} /></span>{t('toPay')}</span>
                    <span className="block font-display text-[18px] font-extrabold tnum mt-1">{formatINR(totalPay)}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* offline */}
            {!online && !offlineDismissed && (
              <div className="page-enter mx-5 mt-4 flex items-center gap-3 rounded-3xl bg-hj-pinksoft p-3 pr-4">
                <Art name="offline" className="w-14 h-14" />
                <div className="flex-1"><p className="font-bold text-[14px]">{t('offlineTitle')}</p><p className="text-[12px] text-hj-muted leading-snug">{t('offlineSub')}</p></div>
                <button aria-label={t('close')} onClick={() => setOfflineDismissed(true)} className="text-hj-muted"><X size={18} /></button>
              </div>
            )}

            {/* quick actions */}
            <div className="grid grid-cols-4 gap-2.5 px-5 mt-5">
              {[
                { label: t('youGave'), art: 'give', bg: 'bg-hj-givesoft', act: () => startEntry('give') },
                { label: t('youGot'), art: 'receive', bg: 'bg-hj-getsoft', act: () => startEntry('receive') },
                { label: t('addCustomer'), art: 'add-user', bg: 'bg-hj-bluesoft', act: () => setSheet('addCust') },
                { label: t('reports'), art: 'analytics', bg: 'bg-hj-goldsoft', act: () => goTab('reports') },
              ].map(b => (
                <button key={b.label} onClick={b.act} className="press flex flex-col items-center gap-1.5">
                  <span className={`w-full aspect-square rounded-[22px] ${b.bg} flex items-center justify-center overflow-hidden`}><Art name={b.art} className="w-[86%]" /></span>
                  <span className="text-[12px] font-bold text-hj-ink2 text-center leading-tight">{b.label}</span>
                </button>
              ))}
            </div>

            {/* today strip */}
            <div className="mx-5 mt-5 grid grid-cols-3 rounded-3xl bg-hj-card border border-hj-line shadow-hj divide-x divide-hj-line">
              {[
                { l: t('today'), v: t('txnsN', { n: todayTxns.length }), c: 'text-hj-ink' },
                { l: t('collected'), v: formatINR(todayIn), c: 'text-hj-get' },
                { l: t('given'), v: formatINR(todayOut), c: 'text-hj-give' },
              ].map(k => (
                <div key={k.l} className="px-3 py-3 text-center"><p className="text-[11px] font-semibold text-hj-muted truncate">{k.l}</p><p className={`font-display text-[15px] font-extrabold tnum mt-0.5 truncate ${k.c}`}>{k.v}</p></div>
              ))}
            </div>

            {/* overdue / insight */}
            {overdueList.length > 0 ? (
              <div className="mx-5 mt-4 relative overflow-hidden rounded-3xl bg-hj-goldsoft p-4 pr-3 flex items-center gap-3">
                <Art name="bell" className="w-16 h-16 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-extrabold text-[15px]">{t('overdueBanner', { n: overdueList.length, amt: formatINR(overdueAmt) })}</p>
                  <p className="text-[12px] text-hj-muted leading-snug mt-0.5">{t('overdueSub')}</p>
                </div>
                <button onClick={() => { setFilter('Overdue'); goTab('customers') }} className="press shrink-0 h-10 px-4 rounded-full bg-hj-ink text-hj-bg text-[13px] font-bold">{t('remind')}</button>
              </div>
            ) : topDebtor && topDebtor.balance > 0 && (
              <div className="mx-5 mt-4 rounded-3xl bg-hj-card border border-hj-line p-4 flex items-center gap-3 shadow-hj">
                <span className="w-11 h-11 rounded-2xl bg-hj-purplesoft flex items-center justify-center text-[#7c3aed]"><Sparkles size={20} /></span>
                <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-hj-muted uppercase tracking-wide">{t('insight')}</p><p className="text-[13px] font-semibold leading-snug">{t('insightTop', { name: topDebtor.name, amt: formatINR(topDebtor.balance) })}</p></div>
                <button onClick={() => remindCustomer(topDebtor)} className="press shrink-0 w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center" aria-label={t('remindNow')}><MessageCircle size={18} /></button>
              </div>
            )}

            {/* install */}
            {installPrompt && (
              <div className="mx-5 mt-4 flex items-center gap-3 p-4 rounded-3xl bg-hj-brand text-white">
                <Download size={20} />
                <div className="flex-1"><p className="text-[14px] font-bold">{t('installTitle')}</p><p className="text-[12px] opacity-80">{t('installSub')}</p></div>
                <button onClick={async () => { installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null) }} className="press px-4 h-9 rounded-full bg-white text-hj-brand text-[13px] font-bold">{t('install')}</button>
              </div>
            )}

            {/* setup checklist */}
            {checklistProgress < 3 && (
              <div className="mx-5 mt-4 rounded-3xl bg-hj-card border border-hj-line p-4 shadow-hj">
                <div className="flex items-center gap-3">
                  <Ring value={checklistProgress / 3} label={`${checklistProgress}/3`} />
                  <div className="flex-1"><p className="font-display font-extrabold text-[15px]">{t('setupTitle')}</p>
                    <div className="flex gap-3 mt-1 text-[12px] font-semibold">
                      {([['cust', 'stepCustomer'], ['txn', 'stepEntry'], ['backup', 'stepBackup']] as const).map(([k, l]) => (
                        <span key={k} className={`flex items-center gap-1 ${checklist[k] ? 'text-hj-get' : 'text-hj-muted'}`}>{checklist[k] ? <Check size={13} strokeWidth={3} /> : <span className="w-3 h-3 rounded-full border-2 border-current" />}{t(l)}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => !checklist.cust ? setSheet('addCust') : !checklist.txn ? startEntry('give') : navigateTo('backup')} className="press w-10 h-10 rounded-full bg-hj-brandsoft text-hj-brand flex items-center justify-center"><ChevronRight size={20} /></button>
                </div>
              </div>
            )}

            {/* streak + invite */}
            <div className="grid grid-cols-2 gap-3 mx-5 mt-4">
              <div className="rounded-3xl p-4 bg-gradient-to-br from-[#fff1d6] to-[#ffe2c2] dark:from-[#3a2a10] dark:to-[#3a1f10]">
                <span className="w-9 h-9 rounded-full bg-white/70 dark:bg-white/10 flex items-center justify-center text-[#ea580c]"><Flame size={18} /></span>
                <p className="font-display font-extrabold text-[16px] mt-2">{t('streak', { n: Math.max(streak, 0) })}</p>
                <p className="text-[11px] text-hj-muted leading-snug">{t('streakSub')}</p>
              </div>
              <button onClick={inviteFriends} className="press text-left rounded-3xl p-4 bg-gradient-to-br from-[#e3f8ea] to-[#d2f1de] dark:from-[#10301d] dark:to-[#0c2517]">
                <span className="w-9 h-9 rounded-full bg-white/70 dark:bg-white/10 flex items-center justify-center text-hj-brand"><Gift size={18} /></span>
                <p className="font-display font-extrabold text-[16px] mt-2">{t('inviteTitle')}</p>
                <p className="text-[11px] text-hj-muted leading-snug">{t('inviteSub', { code: referralCode })}</p>
              </button>
            </div>

            {/* recent */}
            <div className="flex justify-between items-center px-5 mt-6 mb-2">
              <h3 className="font-display text-[17px] font-extrabold">{t('recent')}</h3>
              {txns.length > 0 && <button onClick={() => goTab('customers')} className="text-[13px] font-bold text-hj-brand">{t('seeAll')}</button>}
            </div>
            <div className="mx-5 rounded-3xl bg-hj-card border border-hj-line shadow-hj overflow-hidden">
              {[...txns].sort((a, b) => txnSortKey(b).localeCompare(txnSortKey(a))).slice(0, 6).map((x, i) => (
                <button key={x.id} onClick={() => { setSelectedId(x.customerId); setDetailTab('txns'); navigateTo('customer-detail') }} className={`w-full text-left flex items-center gap-3 px-4 py-3 active:bg-hj-card2 ${i ? 'border-t border-hj-line' : ''}`}>
                  <Avatar initials={x.initials} color={x.color} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate">{x.name}</p>
                    <p className="text-[12px] text-hj-muted truncate">{dayLabel(x.dateISO)}{x.time ? ` • ${x.time}` : ''} • {x.note || x.method}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-display text-[15px] font-extrabold tnum ${x.type === 'received' ? 'text-hj-get' : 'text-hj-give'}`}>{x.type === 'received' ? '+' : '−'}{formatINR(x.amount)}</p>
                    <p className="text-[11px] text-hj-muted">{x.type === 'received' ? t('received') : t('given')}</p>
                  </div>
                </button>
              ))}
              {txns.length === 0 && <EmptyState art="no-transactions" title={t('noTxns')} sub={t('noTxnsSub')} cta={t('addEntry')} onCta={() => startEntry('give')} />}
            </div>
            <p className="text-center text-[12px] italic text-hj-muted mt-6 px-8">🌿 “{t('quote')}” 🌿</p>
          </div>
        )}

        {/* ===================== CUSTOMERS ===================== */}
        {hydrated && view === 'customers' && (
          <div className="page-enter flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-3 bg-hj-bg">
              <div className="flex items-center justify-between">
                <div><h2 className="font-display text-[24px] font-extrabold leading-tight">{t('customers')}</h2><p className="text-[12px] text-hj-muted">{t('customersN', { n: customers.length })}</p></div>
                <button onClick={() => setSheet('sort')} className="press h-10 px-3.5 rounded-full bg-hj-card border border-hj-line shadow-hj flex items-center gap-1.5 text-[13px] font-bold"><ArrowUpDown size={15} />{t('sortBy')}</button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div className="rounded-2xl bg-hj-getsoft px-3.5 py-2.5"><p className="text-[11px] font-semibold text-hj-muted">{t('youWillGet')}</p><p className="font-display font-extrabold text-[17px] text-hj-get tnum">{formatINR(totalReceive)}</p></div>
                <div className="rounded-2xl bg-hj-givesoft px-3.5 py-2.5"><p className="text-[11px] font-semibold text-hj-muted">{t('youWillGive')}</p><p className="font-display font-extrabold text-[17px] text-hj-give tnum">{formatINR(totalPay)}</p></div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-hj-line bg-hj-card px-4 h-12 shadow-hj focus-within:border-hj-brand">
                <Search size={18} className="text-hj-muted" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPh')} className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-hj-muted/70" />
                {search && <button aria-label={t('clearSearch')} onClick={() => setSearch('')}><X size={16} className="text-hj-muted" /></button>}
              </div>
              <div className="flex gap-2 mt-3 overflow-auto scrollbar-hide -mx-5 px-5">
                {(['All', 'Receivable', 'Payable', 'Overdue'] as Filter[]).map(f => (
                  <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{t(f === 'All' ? 'all' : f === 'Receivable' ? 'receivable' : f === 'Payable' ? 'payable' : 'overdue')} <span className="opacity-60 ml-1">{customerCounts[f]}</span></Chip>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-auto scrollbar-hide px-5 pb-[120px]">
              <div className="rounded-3xl bg-hj-card border border-hj-line shadow-hj overflow-hidden empty:hidden">
                {filtered.map((c, i) => {
                  const last = lastTxnOf[c.id]
                  const od = isOverdue(c)
                  return (
                    <div key={c.id}>
                      <button onClick={() => { setSelectedId(c.id); setDetailTab('txns'); navigateTo('customer-detail') }} className={`w-full text-left flex items-center gap-3 px-4 py-3.5 active:bg-hj-card2 ${i ? 'border-t border-hj-line' : ''}`}>
                        <Avatar initials={c.initials} color={c.color} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold flex items-center gap-1.5 min-w-0"><span className="truncate">{c.name}</span>{od && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-hj-goldsoft text-[#b45309] dark:text-hj-gold text-[10px] font-extrabold">{t('overdue')}</span>}</p>
                          <p className="text-[12px] text-hj-muted truncate">{last ? `${dayLabel(last.dateISO)} • ${last.type === 'received' ? t('received') : t('given')} ${formatINR(last.amount)}` : c.phone}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-display text-[16px] font-extrabold tnum ${c.balance > 0 ? 'text-hj-get' : c.balance < 0 ? 'text-hj-give' : 'text-hj-muted'}`}>{formatINR(Math.abs(c.balance))}</p>
                          <p className="text-[11px] font-semibold text-hj-muted">{c.balance > 0 ? t('youWillGet') : c.balance < 0 ? t('youWillGive') : t('settled')}</p>
                        </div>
                      </button>
                      {i === 2 && filtered.length > 4 && (
                        <div className="border-t border-hj-line px-4 py-3 flex items-center gap-3 bg-gradient-to-r from-hj-brandsoft to-hj-card">
                          <Art name="reports" className="w-12 h-12" />
                          <div className="flex-1"><p className="text-[13px] font-extrabold flex items-center gap-1"><Star size={13} className="text-hj-gold fill-hj-gold" /> {t('proTitle')}</p><p className="text-[12px] text-hj-muted">{t('proSub')}</p></div>
                          <button onClick={() => showRewardedAd(() => showToast('Pro unlocked!'))} className="press h-9 px-3.5 rounded-full bg-hj-brand text-white text-[12px] font-bold">{t('watchAd')}</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {filtered.length === 0 && (customers.length === 0
                ? <EmptyState art="no-customers" title={t('noCustomers')} sub={t('noCustomersSub')} cta={t('addCustomer')} onCta={() => setSheet('addCust')} />
                : <EmptyState art="no-results" title={t('noResults')} sub={t('noResultsSub')} cta={t('clearSearch')} onCta={() => { setSearch(''); setFilter('All') }} />)}
            </div>
            <button onClick={() => setSheet('addCust')} className="press absolute bottom-[92px] right-5 h-14 pl-4 pr-5 rounded-full bg-hj-brand text-white flex items-center gap-2 font-bold text-[14px] shadow-[0_12px_28px_rgba(11,122,67,.4)]">
              <Plus size={20} strokeWidth={2.6} /> {t('addCustomer')}
            </button>
          </div>
        )}

        {/* ===================== CUSTOMER DETAIL ===================== */}
        {hydrated && view === 'customer-detail' && selected && (
          <div className="page-enter flex-1 flex flex-col overflow-hidden">
            <Header title={selected.name} sub={selected.phone !== '-' ? selected.phone : undefined} onBack={goBack}
              right={<div className="flex gap-2"><IconBtn label={t('edit')} onClick={openEdit}><Pencil size={16} /></IconBtn><IconBtn label={t('whatsapp')} tone="wa" onClick={shareKhataViaWhatsApp}><Share2 size={16} /></IconBtn></div>} />
            <div className="flex-1 overflow-auto scrollbar-hide pb-[110px]">
              {/* balance card */}
              <div className="px-5 pt-4">
                <div className={`relative overflow-hidden rounded-[28px] p-5 ${selected.balance > 0 ? 'bg-hj-getsoft' : selected.balance < 0 ? 'bg-hj-givesoft' : 'bg-hj-card2'}`}>
                  <Art name="ledger" className="absolute right-2 top-2 w-[88px] opacity-90" />
                  <div className="flex items-center gap-3 relative pr-20">
                    <Avatar initials={selected.initials} color={selected.color} size={52} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-hj-muted">{selected.balance > 0 ? t('youWillGet') : selected.balance < 0 ? t('youWillGive') : t('settled')}</p>
                      <p className={`font-display text-[30px] font-extrabold tnum leading-tight ${selected.balance > 0 ? 'text-hj-get' : selected.balance < 0 ? 'text-hj-give' : 'text-hj-muted'}`}>{formatINR(Math.abs(selected.balance))}</p>
                    </div>
                  </div>
                  {selected.village && <p className="relative text-[12px] text-hj-muted flex items-center gap-1 mt-2"><MapPin size={12} />{selected.village}</p>}
                  <div className="relative flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-black/5 dark:border-white/10 text-[12px]">
                    <span><span className="text-hj-muted">{t('totalGiven')} </span><b className="text-hj-give tnum">{formatINR(selected.totalGiven)}</b></span>
                    <span><span className="text-hj-muted">{t('totalReceived')} </span><b className="text-hj-get tnum">{formatINR(selected.totalReceived)}</b></span>
                  </div>
                </div>
              </div>
              {/* action row */}
              <div className="grid grid-cols-4 gap-2 px-5 mt-4">
                {[
                  { label: t('call'), icon: Phone, cls: 'bg-hj-bluesoft text-[#2563eb]', act: () => { if (selected.phone !== '-') window.open('tel:' + selected.phone.replace(/\s/g, '')) } },
                  { label: t('remind'), icon: MessageCircle, cls: 'bg-[#25D366]/15 text-[#128c4a]', act: () => remindCustomer(selected) },
                  { label: t('statement'), icon: FileText, cls: 'bg-hj-purplesoft text-[#7c3aed]', act: shareStatement },
                  { label: t('reminders'), icon: Bell, cls: 'bg-hj-goldsoft text-[#d97706]', act: () => openAddReminder(selected) },
                ].map(b => (
                  <button key={b.label} onClick={b.act} className="press flex flex-col items-center gap-1.5 py-1">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${b.cls}`}><b.icon size={20} /></span>
                    <span className="text-[11px] font-bold text-hj-ink2">{b.label}</span>
                  </button>
                ))}
              </div>
              {/* tabs */}
              <div className="px-5 mt-5"><Segmented value={detailTab} onChange={setDetailTab} options={[{ v: 'txns', label: t('ledger') }, { v: 'details', label: t('details') }, { v: 'notes', label: t('notes') }]} /></div>

              {detailTab === 'txns' && (
                <div className="px-5 mt-4">
                  {ledger.length === 0 && <EmptyState art="no-transactions" title={t('noTxns')} sub={t('noTxnsSub')} />}
                  {Object.entries(ledger.reduce<Record<string, { t: Txn; run: number }[]>>((g, r) => { (g[r.t.dateISO] ||= []).push(r); return g }, {})).map(([iso, list]) => (
                    <div key={iso} className="mb-4">
                      <p className="text-[12px] font-bold text-hj-muted mb-2 flex items-center gap-2"><Calendar size={12} />{dayLabel(iso)}</p>
                      <div className="rounded-3xl bg-hj-card border border-hj-line shadow-hj overflow-hidden">
                        {list.map(({ t: x, run }, i) => (
                          <button key={x.id} onClick={() => { setActionTxn(x); setSheet('txnActions') }} className={`w-full text-left flex items-center gap-3 px-4 py-3 active:bg-hj-card2 ${i ? 'border-t border-hj-line' : ''}`}>
                            <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${x.type === 'received' ? 'bg-hj-getsoft text-hj-get' : 'bg-hj-givesoft text-hj-give'}`}>{x.type === 'received' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-bold truncate">{x.type === 'received' ? t('youGot') : t('youGave')}{x.note ? <span className="font-medium text-hj-muted"> • {x.note}</span> : null}</p>
                              <p className="text-[12px] text-hj-muted">{x.method}{x.time ? ` • ${x.time}` : ''} • {t('bal')} <span className="tnum">{formatINR(run)}</span></p>
                            </div>
                            <p className={`font-display text-[16px] font-extrabold tnum ${x.type === 'received' ? 'text-hj-get' : 'text-hj-give'}`}>{formatINR(x.amount)}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {detailTab === 'details' && (
                <div className="px-5 mt-4 space-y-3">
                  <div className="rounded-3xl bg-hj-card border border-hj-line shadow-hj p-4 space-y-3 text-[14px]">
                    {([[t('name'), selected.name], [t('phone'), selected.phone], [t('village'), selected.village || '—'], [t('balance'), formatINR(selected.balance)], [t('entries'), String(ledger.length)]] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4"><span className="text-hj-muted">{k}</span><span className="font-bold text-right">{v}</span></div>
                    ))}
                  </div>
                  <PrimaryBtn tone="ghost" onClick={openEdit}><Pencil size={16} /> {t('editCustomer')}</PrimaryBtn>
                  <PrimaryBtn tone="danger" onClick={askDeleteCustomer}><Trash2 size={16} /> {t('deleteCustomer')}</PrimaryBtn>
                </div>
              )}
              {detailTab === 'notes' && (
                <div className="px-5 mt-4 space-y-3">
                  <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} placeholder={t('notesPh')} className="w-full h-40 rounded-3xl border border-hj-line bg-hj-card p-4 text-[14px] outline-none focus:border-hj-brand shadow-hj placeholder:text-hj-muted/70" />
                  <PrimaryBtn onClick={saveNotes}><Check size={18} /> {t('saveNotes')}</PrimaryBtn>
                </div>
              )}
            </div>
            {/* sticky give/got bar */}
            <div className="absolute bottom-0 inset-x-0 px-5 pt-3 pb-5 bg-gradient-to-t from-hj-bg via-hj-bg to-transparent grid grid-cols-2 gap-3">
              <PrimaryBtn tone="give" onClick={() => startEntry('give', selected.id)}><ArrowUpRight size={18} /> {t('youGave')} ₹</PrimaryBtn>
              <PrimaryBtn tone="get" onClick={() => startEntry('receive', selected.id)}><ArrowDownLeft size={18} /> {t('youGot')} ₹</PrimaryBtn>
            </div>
          </div>
        )}

        {/* ===================== ADD TRANSACTION ===================== */}
        {hydrated && view === 'add-transaction' && selected && (() => {
          const give = txnType === 'give'
          const v = Number.isFinite(amountVal) ? amountVal : 0
          const nb = give ? selected.balance + v : selected.balance - v
          return (
            <div className="page-enter flex-1 flex flex-col overflow-hidden">
              <Header title={t('newEntry')} onBack={goBack} />
              <div className="flex-1 overflow-auto scrollbar-hide px-5 pt-3">
                <button onClick={() => setSheet('changeCust')} className="press w-full flex items-center gap-3 rounded-2xl bg-hj-card border border-hj-line p-3 shadow-hj text-left">
                  <Avatar initials={selected.initials} color={selected.color} size={40} />
                  <div className="flex-1 min-w-0"><p className="text-[14px] font-bold truncate">{selected.name}</p><p className="text-[12px] text-hj-muted">{t('currentBal')}: <b className={selected.balance >= 0 ? 'text-hj-get' : 'text-hj-give'}>{formatINR(selected.balance)}</b></p></div>
                  <span className="text-[13px] font-bold text-hj-brand flex items-center">{t('change')}<ChevronDown size={14} /></span>
                </button>
                <div className="grid grid-cols-2 gap-2 mt-3 p-1 rounded-2xl bg-hj-card2 border border-hj-line">
                  <button onClick={() => setTxnType('give')} className={`press h-11 rounded-xl font-bold text-[14px] flex items-center justify-center gap-1.5 transition ${give ? 'bg-hj-give text-white shadow' : 'text-hj-muted'}`}><ArrowUpRight size={16} /> {t('youGave')}</button>
                  <button onClick={() => setTxnType('receive')} className={`press h-11 rounded-xl font-bold text-[14px] flex items-center justify-center gap-1.5 transition ${!give ? 'bg-hj-get text-white shadow' : 'text-hj-muted'}`}><ArrowDownLeft size={16} /> {t('youGot')}</button>
                </div>
                <div className={`mt-3 rounded-3xl px-5 py-4 flex items-center gap-3 ${give ? 'bg-hj-givesoft' : 'bg-hj-getsoft'}`}>
                  <Art name={give ? 'give' : 'receive'} className="w-16 h-16 shrink-0" />
                  <div className="flex-1 min-w-0 text-right">
                    <p className={`font-display font-extrabold tnum leading-none truncate ${give ? 'text-hj-give' : 'text-hj-get'} ${expr.length > 12 ? 'text-[26px]' : 'text-[40px]'}`}>
                      <span className="text-[0.7em] align-top mr-0.5">₹</span>{expr ? expr.replace(/-/g, '−') : <span className="opacity-30">0</span>}
                    </p>
                    <p className="text-[12px] text-hj-muted mt-1.5 truncate">{hasOp && Number.isFinite(amountVal) ? <b className="text-hj-ink">= {formatINR(amountVal)} • </b> : null}{t('newBal')}: <b className={nb >= 0 ? 'text-hj-get' : 'text-hj-give'}>{formatINR(nb)}</b></p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 overflow-auto scrollbar-hide">
                  {[100, 500, 1000, 2000, 5000].map(n => <button key={n} onClick={() => quickAdd(n)} className="press shrink-0 h-8 px-3 rounded-full bg-hj-card border border-hj-line text-[12px] font-bold text-hj-ink2">+{compactINR(n)}</button>)}
                </div>
                <div className="flex gap-2 mt-3 overflow-auto scrollbar-hide">
                  {METHODS.map(m => (
                    <button key={m.v} onClick={() => setMethod(m.v)} className={`press shrink-0 h-10 px-3.5 rounded-xl border text-[13px] font-bold flex items-center gap-1.5 ${method === m.v ? 'bg-hj-brandsoft border-hj-brand text-hj-brand' : 'bg-hj-card border-hj-line text-hj-muted'}`}><m.icon size={15} />{t(m.k)}</button>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
                  <div className="min-w-0 flex items-center gap-2 rounded-xl border border-hj-line bg-hj-card px-3 h-11 focus-within:border-hj-brand">
                    <StickyNote size={15} className="text-hj-muted" />
                    <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('notePh')} className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-hj-muted/70" />
                  </div>
                  <label className="relative flex items-center gap-1.5 rounded-xl border border-hj-line bg-hj-card px-3 h-11 text-[13px] font-bold cursor-pointer">
                    <Calendar size={15} className="text-hj-brand" />
                    <span>{txnDateISO === todayISO ? t('today') : shortDate(txnDateISO)}</span>
                    <input type="date" aria-label={t('date')} value={txnDateISO} max={localISO()} onChange={e => e.target.value && setTxnDateISO(e.target.value)} onClick={e => { try { (e.target as any).showPicker?.() } catch { } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </label>
                </div>
              </div>
              <div className="px-3 pt-3 pb-4 bg-hj-card2 border-t border-hj-line rounded-t-[28px] mt-2">
                <div className="grid grid-cols-4 gap-2">
                  {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '.', '0', 'del', '+'].map(k => {
                    const op = ['÷', '×', '-', '+'].includes(k)
                    return (
                      <button key={k} onClick={() => handleKey(k)} onContextMenu={e => { if (k === 'del') { e.preventDefault(); handleKey('C') } }}
                        className={`press h-[50px] rounded-2xl font-display text-[21px] font-bold flex items-center justify-center ${op ? 'bg-hj-brandsoft text-hj-brand' : 'bg-hj-card text-hj-ink shadow-hj'}`}>
                        {k === 'del' ? <Delete size={20} /> : k === '-' ? '−' : k}
                      </button>
                    )
                  })}
                </div>
                <PrimaryBtn className="mt-3" tone={give ? 'give' : 'get'} disabled={!(amountVal > 0)} onClick={saveTxn}>
                  <Check size={18} strokeWidth={3} /> {t('saveEntry')}{amountVal > 0 ? ` • ${formatINR(amountVal)}` : ''}
                </PrimaryBtn>
              </div>
            </div>
          )
        })()}

        {/* ===================== SUCCESS ===================== */}
        {hydrated && view === 'success' && lastTxn && (
          <div className="page-enter flex-1 flex flex-col px-6 pt-10 pb-7 bg-gradient-to-b from-hj-getsoft to-hj-bg relative overflow-hidden">
            <div className="confetti absolute left-1/2 top-[190px] pointer-events-none">
              {Array.from({ length: 22 }).map((_, i) => {
                const a = (i / 22) * Math.PI * 2, r = 110 + (i % 4) * 30
                return <i key={i} style={{ background: ['#0b7a43', '#f5a524', '#e5484d', '#2563eb', '#12a150'][i % 5], ['--dx' as any]: `${Math.cos(a) * r}px`, ['--dy' as any]: `${Math.sin(a) * r}px`, animationDelay: `${(i % 5) * 40}ms` }} />
              })}
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Art name="saved" className="w-48 h-48 pop-enter dark:bg-[#eef6f0] dark:rounded-full" />
              <h2 className="font-display text-[26px] font-extrabold mt-2">{t('saved')}</h2>
              <p className={`font-display text-[36px] font-extrabold tnum mt-1 ${lastTxn.type === 'received' ? 'text-hj-get' : 'text-hj-give'}`}>{formatINR(lastTxn.amount)}</p>
              <p className="text-[14px] text-hj-muted">{lang === 'English' ? `${lastTxn.type === 'received' ? t('receivedFrom') : t('addedTo')} ${lastTxn.name}` : `${lastTxn.name} — ${lastTxn.type === 'received' ? t('receivedFrom') : t('addedTo')}`}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-hj-card border border-hj-line px-4 h-9 text-[13px] shadow-hj">
                <span className="text-hj-muted">{t('newBal')}</span><b className={`tnum ${lastTxn.bal >= 0 ? 'text-hj-get' : 'text-hj-give'}`}>{formatINR(lastTxn.bal)}</b>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={() => shareReceipt(lastTxn)} className="press h-12 rounded-2xl bg-[#25D366] text-white font-bold text-[14px] flex items-center justify-center gap-2"><MessageCircle size={17} /> {t('whatsapp')}</button>
              <button onClick={() => navigateTo('receipt')} className="press h-12 rounded-2xl bg-hj-card border border-hj-line font-bold text-[14px] flex items-center justify-center gap-2"><ReceiptIcon size={17} /> {t('viewReceipt')}</button>
            </div>
            <PrimaryBtn onClick={() => { setExpr(''); setDesc(''); replaceView('add-transaction') }}><Plus size={18} /> {t('addAnother')}</PrimaryBtn>
            <PrimaryBtn tone="ghost" className="mt-3" onClick={() => { setSelectedId(lastTxn.customerId); setDetailTab('txns'); setViewHistory(['home']); setView('customer-detail') }}>{t('viewCustomer')}</PrimaryBtn>
          </div>
        )}

        {/* ===================== RECEIPT ===================== */}
        {hydrated && view === 'receipt' && (() => {
          const x = lastTxn || txns[0]
          if (!x) return null
          const prev = x.bal - effect(x)
          return (
            <div className="page-enter flex-1 flex flex-col overflow-hidden">
              <Header title={t('receipt')} onBack={goBack} right={<IconBtn label={t('shareWhatsApp')} tone="wa" onClick={() => shareReceipt(x)}><Share2 size={16} /></IconBtn>} />
              <div className="flex-1 overflow-auto scrollbar-hide p-5">
                <div className="relative rounded-[28px] bg-hj-card shadow-hjlg overflow-hidden">
                  <div className="bg-[radial-gradient(120%_120%_at_0%_0%,#14a05a,#0b7a43_50%,#064d2a)] text-white px-5 pt-5 pb-6 text-center">
                    <p className="font-display font-extrabold text-[18px]">Hisab<span className="text-[#fbbf24]">Jod</span></p>
                    <p className="text-[11px] tracking-[.2em] font-bold text-white/70 mt-0.5 uppercase">{t('txnReceipt')}</p>
                    <p className="font-display text-[36px] font-extrabold tnum mt-3">{formatINR(x.amount)}</p>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[12px] font-bold ${x.type === 'received' ? 'bg-[#4ade80]/25' : 'bg-[#fca5a5]/25'}`}>{x.type === 'received' ? t('youGot') : t('youGave')}</span>
                  </div>
                  <div className="px-5 py-4 space-y-3 text-[14px]">
                    {([[t('customer'), x.name], [t('date'), `${prettyDate(x.dateISO)}${x.time ? ', ' + x.time : ''}`], [t('txnId'), 'HJ-' + x.id.replace(/\D/g, '').slice(-8)], [t('method'), x.method], ...(x.note ? [[t('notes'), x.note]] : []), [t('prevBal'), formatINR(prev)], [t('remBal'), formatINR(x.bal)]] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4"><span className="text-hj-muted">{k}</span><span className="font-bold text-right tnum">{v}</span></div>
                    ))}
                  </div>
                  <div className="mx-5 border-t-2 border-dashed border-hj-line" />
                  <div className="px-5 py-4 text-center">
                    <p className="text-[13px] font-bold text-hj-brand">🌿 {t('thankYou')}</p>
                    <p className="text-[11px] text-hj-muted mt-0.5">{bizName}{bizPhone ? ` • ${bizPhone}` : ''}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 px-5 pb-6">
                <button onClick={() => shareReceipt(x)} className="press h-[52px] rounded-2xl bg-[#25D366] text-white font-bold text-[14px] flex items-center justify-center gap-2"><MessageCircle size={17} /> {t('whatsapp')}</button>
                <PrimaryBtn onClick={() => saveReceiptPdf(x)}><Download size={17} /> {t('savePdf')}</PrimaryBtn>
              </div>
            </div>
          )
        })()}

        {/* ===================== REPORTS ===================== */}
        {hydrated && view === 'reports' && (() => {
          const monthLabel = monthLabelOf(reportMonth)
          const monthTxns = txns.filter(x => x.dateISO.startsWith(reportMonth))
          const mg = monthTxns.filter(x => x.type === 'given').reduce((s, x) => s + x.amount, 0)
          const mr = monthTxns.filter(x => x.type === 'received').reduce((s, x) => s + x.amount, 0)
          const buckets = Array.from({ length: 6 }, (_, bi) => {
            const start = bi * 5 + 1, end = bi === 5 ? 31 : (bi + 1) * 5
            const inB = monthTxns.filter(x => { const d = Number(x.dateISO.slice(8, 10)); return d >= start && d <= end })
            return { label: `${start}–${end === 31 ? '31' : end}`, given: inB.filter(x => x.type === 'given').reduce((s, x) => s + x.amount, 0), received: inB.filter(x => x.type === 'received').reduce((s, x) => s + x.amount, 0) }
          })
          const maxB = Math.max(1, ...buckets.map(b => Math.max(b.given, b.received)))
          const rate = mg > 0 ? Math.min(1, mr / mg) : mr > 0 ? 1 : 0
          const modes = METHODS.map(m => ({ ...m, amt: monthTxns.filter(x => x.method === m.v).reduce((s, x) => s + x.amount, 0) })).filter(m => m.amt > 0)
          const modeMax = Math.max(1, ...modes.map(m => m.amt))
          const topDue = [...customers].filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 3)
          return (
            <div className={`page-enter flex-1 overflow-auto scrollbar-hide ${navPad}`}>
              <div className="px-5 pt-5 flex items-center justify-between">
                <h2 className="font-display text-[24px] font-extrabold">{t('reports')}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setSheet('month')} className="press h-10 px-3.5 rounded-full bg-hj-card border border-hj-line shadow-hj text-[13px] font-bold flex items-center gap-1">{monthLabel}<ChevronDown size={15} /></button>
                  <IconBtn label={t('shareReport')} tone="wa" onClick={() => shareTextViaWhatsApp('', `*${bizName} — ${monthLabel}*\nReceived: ${formatINR(mr)}\nGiven: ${formatINR(mg)}\nTo receive (all): ${formatINR(totalReceive)}\nTo pay (all): ${formatINR(totalPay)}\nCustomers: ${customers.length}\n\nSent via HisabJod`)}><Share2 size={16} /></IconBtn>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5 px-5 mt-4">
                {[
                  { l: t('monthReceived'), v: mr, c: 'text-hj-get', bg: 'bg-hj-getsoft', n: monthTxns.filter(x => x.type === 'received').length },
                  { l: t('monthGiven'), v: mg, c: 'text-hj-give', bg: 'bg-hj-givesoft', n: monthTxns.filter(x => x.type === 'given').length },
                  { l: t('outstanding'), v: totalReceive, c: 'text-[#b45309] dark:text-hj-gold', bg: 'bg-hj-goldsoft', n: -1 },
                ].map(k => (
                  <div key={k.l} className={`rounded-3xl ${k.bg} p-3`}>
                    <p className="text-[11px] font-semibold text-hj-muted truncate">{k.l}</p>
                    <p className={`font-display text-[16px] font-extrabold tnum mt-0.5 ${k.c}`}>{compactINR(k.v)}</p>
                    <p className="text-[10px] text-hj-muted">{k.n >= 0 ? t('txnsN', { n: k.n }) : t('allTime')}</p>
                  </div>
                ))}
              </div>
              <div className="mx-5 mt-4 rounded-3xl bg-hj-card border border-hj-line shadow-hj p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display font-extrabold text-[15px]">{t('cashflow')}</p>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-hj-muted">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-hj-get" />{t('received')}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-hj-give" />{t('given')}</span>
                  </div>
                </div>
                {monthTxns.length === 0 ? (
                  <EmptyState art="grow" title={t('noDataMonth', { m: monthLabel })} sub={t('noDataSub')} />
                ) : (
                  <div className="flex items-end gap-2 h-40 mt-4">
                    {buckets.map((b, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="w-full flex gap-1 justify-center items-end h-32">
                          <div className="w-1/2 max-w-[16px] rounded-t-md bg-hj-get transition-all" style={{ height: `${b.received ? Math.max(6, (b.received / maxB) * 128) : 3}px`, opacity: b.received ? 1 : .25 }} title={`${t('received')} ${formatINR(b.received)}`} />
                          <div className="w-1/2 max-w-[16px] rounded-t-md bg-hj-give transition-all" style={{ height: `${b.given ? Math.max(6, (b.given / maxB) * 128) : 3}px`, opacity: b.given ? 1 : .25 }} title={`${t('given')} ${formatINR(b.given)}`} />
                        </div>
                        <span className="text-[10px] text-hj-muted font-semibold">{b.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {monthTxns.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mx-5 mt-4">
                  <div className="rounded-3xl bg-hj-card border border-hj-line shadow-hj p-4 flex flex-col items-center">
                    <Ring value={rate} label={`${Math.round(rate * 100)}%`} size={76} />
                    <p className="text-[12px] font-bold mt-2 text-center">{t('collectionRate')}</p>
                  </div>
                  <div className="rounded-3xl bg-hj-card border border-hj-line shadow-hj p-4">
                    <p className="text-[12px] font-bold mb-2">{t('byMode')}</p>
                    <div className="space-y-2">
                      {modes.map(m => (
                        <div key={m.v}>
                          <div className="flex justify-between text-[11px]"><span className="text-hj-muted font-semibold">{t(m.k)}</span><b className="tnum">{compactINR(m.amt)}</b></div>
                          <div className="h-1.5 rounded-full bg-hj-card2 mt-1 overflow-hidden"><div className="h-full rounded-full bg-hj-brand" style={{ width: `${(m.amt / modeMax) * 100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {topDue.length > 0 && (
                <>
                  <h3 className="font-display text-[16px] font-extrabold px-5 mt-5 mb-2">{t('topDues')}</h3>
                  <div className="mx-5 rounded-3xl bg-hj-card border border-hj-line shadow-hj overflow-hidden">
                    {topDue.map((c, i) => (
                      <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-hj-line' : ''}`}>
                        <span className="w-6 text-center font-display font-extrabold text-hj-muted">{i + 1}</span>
                        <Avatar initials={c.initials} color={c.color} size={36} />
                        <p className="flex-1 min-w-0 text-[14px] font-bold truncate">{c.name}</p>
                        <p className="font-display font-extrabold text-hj-get tnum text-[14px]">{formatINR(c.balance)}</p>
                        <button aria-label={t('remind')} onClick={() => remindCustomer(c)} className="press w-9 h-9 rounded-full bg-[#25D366]/15 text-[#128c4a] flex items-center justify-center"><MessageCircle size={16} /></button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <h3 className="font-display text-[16px] font-extrabold px-5 mt-5 mb-2">{t('exports')}</h3>
              <div className="mx-5 rounded-3xl bg-hj-card border border-hj-line shadow-hj overflow-hidden">
                {[
                  { l: t('customerReport'), s: t('customersN', { n: customers.length }), icon: Users, c: 'bg-hj-bluesoft text-[#2563eb]', act: customerReportPdf, ad: true },
                  { l: t('monthReport'), s: monthLabel, icon: BarChart3, c: 'bg-hj-purplesoft text-[#7c3aed]', act: () => monthReportPdf(monthLabel, monthTxns), ad: true },
                  { l: t('exportCsv'), s: 'Excel / Google Sheets', icon: FileSpreadsheet, c: 'bg-hj-getsoft text-hj-get', act: exportCSV, ad: true },
                  { l: t('shareReport'), s: 'WhatsApp', icon: MessageCircle, c: 'bg-[#25D366]/15 text-[#128c4a]', act: () => shareTextViaWhatsApp('', `*${bizName} — ${monthLabel}*\nReceived: ${formatINR(mr)}\nGiven: ${formatINR(mg)}\nTo receive: ${formatINR(totalReceive)}\n\nSent via HisabJod`), ad: false },
                ].map((r, i) => (
                  <button key={r.l} onClick={r.act} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-hj-card2 ${i ? 'border-t border-hj-line' : ''}`}>
                    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${r.c}`}><r.icon size={18} /></span>
                    <div className="flex-1 min-w-0"><p className="text-[14px] font-bold">{r.l}</p><p className="text-[12px] text-hj-muted">{r.ad && native ? t('rewardHint') : r.s}</p></div>
                    <ChevronRight size={18} className="text-hj-muted" />
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ===================== BACKUP ===================== */}
        {hydrated && view === 'backup' && (
          <div className="page-enter flex-1 flex flex-col overflow-hidden">
            <Header title={t('backupRestore')} onBack={goBack} />
            <div className="flex-1 overflow-auto scrollbar-hide px-5 pb-8">
              <div className="flex flex-col items-center text-center pt-4">
                <Art name="data-safe" className="w-40 h-40 float-y dark:bg-[#eef6f0] dark:rounded-[40px]" />
                <h3 className="font-display text-[20px] font-extrabold mt-1">{t('keepSafe')}</h3>
                <p className="text-[13px] text-hj-muted mt-1 max-w-[280px]">{t('keepSafeSub')}</p>
              </div>
              <div className="mt-5 rounded-3xl bg-hj-card border border-hj-line shadow-hj p-4 flex items-center gap-3">
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${lastBackupAt ? 'bg-hj-getsoft text-hj-get' : 'bg-hj-goldsoft text-[#d97706]'}`}>{lastBackupAt ? <ShieldCheck size={20} /> : <Clock size={20} />}</span>
                <div className="flex-1"><p className="text-[14px] font-bold">{t('lastBackup')}</p><p className="text-[12px] text-hj-muted">{lastBackupAt ? new Date(lastBackupAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : t('never')} • {t('customersN', { n: customers.length })} • {txns.length} {t('entries')}</p></div>
              </div>
              <div className="mt-3 rounded-3xl bg-hj-card border border-hj-line shadow-hj overflow-hidden">
                {[
                  { l: t('createBackup'), s: t('createBackupSub'), icon: CloudUpload, c: 'bg-hj-getsoft text-hj-get', act: exportBackup },
                  { l: t('restoreBackup'), s: t('restoreBackupSub'), icon: Upload, c: 'bg-hj-bluesoft text-[#2563eb]', act: () => fileRef.current?.click() },
                  { l: t('importCsv'), s: t('importCsvSub'), icon: FileSpreadsheet, c: 'bg-hj-goldsoft text-[#d97706]', act: () => csvRef.current?.click() },
                ].map((r, i) => (
                  <button key={r.l} onClick={r.act} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-hj-card2 ${i ? 'border-t border-hj-line' : ''}`}>
                    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${r.c}`}><r.icon size={18} /></span>
                    <div className="flex-1"><p className="text-[14px] font-bold">{r.l}</p><p className="text-[12px] text-hj-muted">{r.s}</p></div>
                    <ChevronRight size={18} className="text-hj-muted" />
                  </button>
                ))}
              </div>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={importBackup} />
              <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} />
              <div className="mt-4 rounded-3xl bg-hj-bluesoft p-4 flex items-center gap-3">
                <Art name="devices" className="w-16 h-16 shrink-0" />
                <p className="text-[12px] leading-relaxed text-hj-ink2"><b className="block text-[14px] text-hj-ink">{t('newPhone')}</b>{t('createBackup')} → WhatsApp / Drive → {t('restoreBackup')}</p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== APP LOCK ===================== */}
        {hydrated && view === 'applock' && (
          <div className="page-enter flex-1 flex flex-col overflow-hidden">
            <Header title={t('appLock')} onBack={goBack} />
            <div className="flex-1 overflow-auto scrollbar-hide px-6 pt-4 pb-8 flex flex-col items-center text-center">
              <Art name="secure" className="w-36 h-36 dark:bg-[#eef6f0] dark:rounded-[36px]" />
              <h3 className="font-display text-[20px] font-extrabold mt-1">{t('lockTitle')}</h3>
              <p className="text-[13px] text-hj-muted mt-1">{t('lockSub')}</p>
              {lockEnabled && storedPin ? (
                <div className="w-full mt-6 space-y-3">
                  <div className="rounded-3xl bg-hj-getsoft p-4 flex items-center gap-3 text-left"><ShieldCheck className="text-hj-get" /><p className="font-bold">{t('lockOn')}</p></div>
                  <PrimaryBtn tone="danger" onClick={() => { setStoredPin(''); setLockEnabled(false); showToast(t('off')) }}>{t('disableLock')}</PrimaryBtn>
                </div>
              ) : (
                <>
                  <p className="text-[14px] font-bold mt-6">{pinFirst ? t('confirmPin') : t('enterPin')}</p>
                  <div key={shakeKey} className={`flex gap-4 mt-3 ${shakeKey ? 'shake' : ''}`}>{[0, 1, 2, 3].map(i => <span key={i} className={`w-4 h-4 rounded-full transition ${i < pinDraft.length ? 'bg-hj-brand scale-110' : 'bg-hj-line'}`} />)}</div>
                  <PinPad onKey={setupKey} />
                </>
              )}
              <p className="mt-5 text-[12px] text-hj-muted flex items-center gap-1.5"><Fingerprint size={14} /> {t('biometricSoon')}</p>
            </div>
          </div>
        )}

        {/* ===================== SETTINGS ===================== */}
        {hydrated && view === 'settings' && (
          <div className={`page-enter flex-1 overflow-auto scrollbar-hide ${navPad}`}>
            <div className="px-5 pt-5"><h2 className="font-display text-[24px] font-extrabold">{t('settings')}</h2></div>
            <button onClick={() => setSheet('biz')} className="press mx-5 mt-4 w-[calc(100%-40px)] text-left relative overflow-hidden rounded-[28px] p-4 bg-[radial-gradient(120%_120%_at_0%_0%,#14a05a,#0b7a43_50%,#064d2a)] text-white flex items-center gap-3 shadow-hjlg">
              <Art name="shop" className="absolute -right-3 -bottom-4 w-24 opacity-95" />
              <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center font-display text-[20px] font-extrabold">{bizInitials}</span>
              <div className="relative flex-1 min-w-0 pr-16"><p className="font-display text-[18px] font-extrabold truncate">{bizName}</p><p className="text-[12px] text-white/75 truncate">{ownerName || t('businessProfile')} {bizPhone && `• ${bizPhone}`}</p></div>
            </button>
            {([
              [t('general'), [
                { l: t('language'), icon: Globe, c: 'bg-hj-bluesoft text-[#2563eb]', v: lang, act: () => setSheet('lang') },
                { l: t('darkMode'), icon: Moon, c: 'bg-hj-purplesoft text-[#7c3aed]', toggle: true, on: dark, act: () => setDark(d => !d) },
                { l: t('reminders'), icon: Bell, c: 'bg-hj-goldsoft text-[#d97706]', v: String(reminders.filter(r => reminderStatus(r) !== 'Completed').length), act: () => navigateTo('reminders') },
              ]],
              [t('security'), [
                { l: t('appLock'), icon: Lock, c: 'bg-hj-getsoft text-hj-get', v: lockEnabled ? t('on') : t('off'), act: () => { setPinFirst(''); setPinDraft(''); navigateTo('applock') } },
                { l: t('backupRestore'), icon: CloudUpload, c: 'bg-hj-getsoft text-hj-get', v: lastBackupAt ? shortDate(localISO(new Date(lastBackupAt))) : t('never'), act: () => navigateTo('backup') },
              ]],
              [t('support'), [
                { l: t('inviteTitle'), icon: Gift, c: 'bg-hj-pinksoft text-[#db2777]', act: inviteFriends },
                { l: t('rateUs'), icon: Star, c: 'bg-hj-goldsoft text-[#d97706]', act: () => window.open('https://play.google.com/store/apps/details?id=com.hisabjod.digitalkhata', '_blank') },
                { l: t('help'), icon: HelpCircle, c: 'bg-hj-bluesoft text-[#2563eb]', act: () => { window.open('mailto:supportbreakouttrade@gmail.com?subject=HisabJod%20Support', '_blank') } },
                { l: t('about'), icon: Info, c: 'bg-hj-card2 text-hj-muted', act: () => setSheet('about') },
              ]],
            ] as [string, any[]][]).map(([sec, rows]) => (
              <div key={sec}>
                <p className="px-6 mt-6 mb-2 text-[12px] font-bold text-hj-muted uppercase tracking-wider">{sec}</p>
                <div className="mx-5 rounded-3xl bg-hj-card border border-hj-line shadow-hj overflow-hidden">
                  {rows.map((r: any, i: number) => (
                    <div key={r.l} role="button" tabIndex={0} onClick={r.act} className={`w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-hj-card2 ${i ? 'border-t border-hj-line' : ''}`}>
                      <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${r.c}`}><r.icon size={18} /></span>
                      <span className="flex-1 text-[14px] font-bold">{r.l}</span>
                      {r.toggle ? <Toggle on={r.on} onChange={() => { }} label={r.l} /> : <>{r.v && <span className="text-[13px] text-hj-muted font-semibold">{r.v}</span>}<ChevronRight size={18} className="text-hj-muted" /></>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setConfirm({ title: t('resetQ'), sub: t('resetSub'), cta: t('erase'), onYes: eraseAll })} className="press mx-5 mt-6 w-[calc(100%-40px)] h-12 rounded-2xl bg-hj-givesoft text-hj-give font-bold text-[14px] flex items-center justify-center gap-2"><Trash2 size={16} /> {t('resetData')}</button>
            <p className="text-center text-[12px] text-hj-muted mt-5">HisabJod • {t('version')} 2.0 • {t('simpleSecureOffline')}</p>
          </div>
        )}

        {/* ===================== REMINDERS ===================== */}
        {hydrated && view === 'reminders' && (() => {
          const counts = { Upcoming: 0, Overdue: 0, Completed: 0 } as Record<ReminderTab, number>
          reminders.forEach(r => counts[reminderStatus(r)]++)
          const list = reminders.filter(r => reminderStatus(r) === reminderTab).sort((a, b) => (a.dueISO || '').localeCompare(b.dueISO || ''))
          return (
            <div className="page-enter flex-1 flex flex-col overflow-hidden">
              <Header title={t('reminders')} onBack={goBack} />
              <div className="px-5 pt-3"><Segmented value={reminderTab} onChange={setReminderTab} options={(['Upcoming', 'Overdue', 'Completed'] as ReminderTab[]).map(v => ({ v, label: <>{t(v === 'Upcoming' ? 'upcoming' : v === 'Overdue' ? 'overdue' : 'completed')} <span className="opacity-50">{counts[v]}</span></> }))} /></div>
              <div className="flex-1 overflow-auto scrollbar-hide px-5 pt-4 pb-[110px] space-y-3">
                {list.map(r => {
                  const st = reminderStatus(r)
                  const c = customers.find(x => x.id === r.customerId) || customers.find(x => x.name === r.name)
                  return (
                    <div key={r.id} className="rounded-3xl bg-hj-card border border-hj-line shadow-hj p-4 flex items-center gap-3">
                      {c ? <Avatar initials={c.initials} color={c.color} size={44} /> : <span className="w-11 h-11 rounded-full bg-hj-bluesoft text-[#2563eb] flex items-center justify-center"><Calendar size={18} /></span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold truncate">{r.name}</p>
                        <p className="font-display text-[16px] font-extrabold tnum">{formatINR(r.amount)}</p>
                        <p className={`text-[12px] font-semibold ${st === 'Overdue' ? 'text-hj-give' : st === 'Completed' ? 'text-hj-get' : 'text-hj-muted'}`}>{st === 'Completed' ? '✓ ' + t('completed') : dueText(r)}</p>
                      </div>
                      {st !== 'Completed' ? (
                        <div className="flex flex-col gap-2">
                          {c && c.phone !== '-' && <button onClick={() => { remindCustomer(c, r.amount); setReminders(p => p.map(x => x.id === r.id ? { ...x, status: 'Completed' } : x)) }} className="press h-9 px-3.5 rounded-full bg-[#25D366] text-white text-[12px] font-bold flex items-center gap-1"><MessageCircle size={14} />{t('send')}</button>}
                          <button onClick={() => { setReminders(p => p.map(x => x.id === r.id ? { ...x, status: 'Completed' } : x)); showToast(t('completed')) }} className="press h-9 px-3.5 rounded-full bg-hj-card2 border border-hj-line text-[12px] font-bold">{t('markDone')}</button>
                        </div>
                      ) : (
                        <button aria-label={t('delete')} onClick={() => setReminders(p => p.filter(x => x.id !== r.id))} className="press w-9 h-9 rounded-full bg-hj-card2 text-hj-muted flex items-center justify-center"><Trash2 size={15} /></button>
                      )}
                    </div>
                  )
                })}
                {list.length === 0 && <EmptyState art="no-reminders" title={t('noReminders')} sub={t('noRemindersSub')} cta={t('addReminder')} onCta={() => openAddReminder()} />}
              </div>
              <button onClick={() => openAddReminder()} className="press absolute bottom-[92px] right-5 h-14 pl-4 pr-5 rounded-full bg-hj-brand text-white flex items-center gap-2 font-bold text-[14px] shadow-[0_12px_28px_rgba(11,122,67,.4)]"><Plus size={20} strokeWidth={2.6} /> {t('addReminder')}</button>
            </div>
          )
        })()}

        {/* ===================== BOTTOM NAV ===================== */}
        {showNav && (
          <nav className="absolute bottom-0 inset-x-0 z-30 px-3 pb-3 pt-2 bg-gradient-to-t from-hj-bg via-hj-bg/95 to-transparent">
            <div className="relative h-[66px] rounded-[24px] bg-hj-card border border-hj-line shadow-hjlg flex items-center justify-around px-1">
              {[
                { id: 'home', label: t('home'), icon: Home },
                { id: 'customers', label: t('customers'), icon: Users },
                { id: 'add', label: '', icon: Plus, fab: true },
                { id: 'reports', label: t('reports'), icon: BarChart3 },
                { id: 'settings', label: t('more'), icon: MoreHorizontal },
              ].map(item => {
                const active = view === item.id || (['reminders', 'backup'].includes(view) && item.id === 'settings')
                if (item.fab) return (
                  <button key="fab" aria-label={t('newEntry')} onClick={() => startEntry('give')} className="press -mt-8 w-[60px] h-[60px] rounded-[22px] bg-gradient-to-br from-[#14a05a] to-[#075a31] text-white flex items-center justify-center shadow-[0_12px_26px_rgba(11,122,67,.45)] ring-4 ring-hj-bg">
                    <Plus size={28} strokeWidth={2.6} />
                  </button>
                )
                return (
                  <button key={item.id} onClick={() => goTab(item.id as View)} className={`press relative flex flex-col items-center justify-center gap-1 w-[64px] h-full ${active ? 'text-hj-brand' : 'text-hj-muted'}`}>
                    <item.icon size={21} strokeWidth={active ? 2.5 : 1.9} />
                    <span className={`text-[11px] ${active ? 'font-extrabold' : 'font-semibold'}`}>{item.label}</span>
                    {active && <span className="absolute top-1 w-1 h-1 rounded-full bg-hj-brand" />}
                  </button>
                )
              })}
            </div>
          </nav>
        )}

        {/* ===================== SHEETS ===================== */}
        <Sheet open={sheet === 'addCust'} onClose={() => setSheet(null)} title={t('addCustomer')}>
          <div className="flex justify-center -mt-1 mb-2"><Art name="add-user" className="w-24 h-24" /></div>
          <div className="space-y-3">
            <Field label={t('name') + ' *'}><input autoFocus value={newCust.name} onChange={e => setNewCust(v => ({ ...v, name: e.target.value }))} placeholder="Ramesh Patil" className={inputCls} /></Field>
            <Field label={t('phone')}><input inputMode="tel" value={newCust.phone} onChange={e => setNewCust(v => ({ ...v, phone: e.target.value }))} placeholder="+91 98765 43210" className={inputCls} /></Field>
            <Field label={t('village')}><input value={newCust.village} onChange={e => setNewCust(v => ({ ...v, village: e.target.value }))} placeholder="Sangli" className={inputCls} /></Field>
            <Field label={t('openingBal')}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input inputMode="decimal" value={newCust.opening} onChange={e => setNewCust(v => ({ ...v, opening: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="₹ 0" className={inputCls} />
                <div className="flex p-1 rounded-2xl bg-hj-card2 border border-hj-line">
                  <button onClick={() => setNewCust(v => ({ ...v, dir: 'get' }))} className={`px-2.5 rounded-xl text-[12px] font-bold ${newCust.dir === 'get' ? 'bg-hj-get text-white' : 'text-hj-muted'}`}>{t('theyOweMe')}</button>
                  <button onClick={() => setNewCust(v => ({ ...v, dir: 'give' }))} className={`px-2.5 rounded-xl text-[12px] font-bold ${newCust.dir === 'give' ? 'bg-hj-give text-white' : 'text-hj-muted'}`}>{t('iOweThem')}</button>
                </div>
              </div>
            </Field>
            <PrimaryBtn onClick={addCustomer} className="mt-2"><Check size={18} strokeWidth={3} /> {t('saveCustomer')}</PrimaryBtn>
          </div>
        </Sheet>

        <Sheet open={sheet === 'editCust'} onClose={() => setSheet(null)} title={t('editCustomer')}>
          <div className="space-y-3">
            <Field label={t('name') + ' *'}><input value={editCust.name} onChange={e => setEditCust(v => ({ ...v, name: e.target.value }))} className={inputCls} /></Field>
            <Field label={t('phone')}><input inputMode="tel" value={editCust.phone} onChange={e => setEditCust(v => ({ ...v, phone: e.target.value }))} className={inputCls} /></Field>
            <Field label={t('village')}><input value={editCust.village} onChange={e => setEditCust(v => ({ ...v, village: e.target.value }))} className={inputCls} /></Field>
            <PrimaryBtn onClick={saveEditCustomer} className="mt-2">{t('update')}</PrimaryBtn>
          </div>
        </Sheet>

        <Sheet open={sheet === 'biz'} onClose={() => setSheet(null)} title={t('businessProfile')}>
          <div className="space-y-3">
            <Field label={t('businessName')}><input value={bizName} onChange={e => setBizName(e.target.value)} className={inputCls} /></Field>
            <Field label={t('ownerName')}><input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nivrutti" className={inputCls} /></Field>
            <Field label={t('phone')}><input inputMode="tel" value={bizPhone} onChange={e => setBizPhone(e.target.value)} className={inputCls} /></Field>
            <Field label={t('upiId')}><input value={bizUpi} onChange={e => setBizUpi(e.target.value.trim())} placeholder="shreekirana@upi" className={inputCls} /></Field>
            <PrimaryBtn onClick={() => { setSheet(null); showToast('✓') }} className="mt-2">{t('save')}</PrimaryBtn>
          </div>
        </Sheet>

        <Sheet open={sheet === 'lang'} onClose={() => setSheet(null)} title={t('chooseLanguage')}>
          <div className="space-y-2">
            {LANGS.map(l => (
              <button key={l} onClick={() => { setLang(l); setSheet(null) }} className={`press w-full flex justify-between items-center h-14 px-4 rounded-2xl border-2 ${lang === l ? 'border-hj-brand bg-hj-brandsoft' : 'border-hj-line bg-hj-card'}`}>
                <span className="font-bold text-[16px]">{l}</span>{lang === l && <span className="w-6 h-6 rounded-full bg-hj-brand text-white flex items-center justify-center"><Check size={14} strokeWidth={3} /></span>}
              </button>
            ))}
          </div>
        </Sheet>

        <Sheet open={sheet === 'changeCust'} onClose={() => setSheet(null)} title={t('selectCustomer')} tall>
          <div className="space-y-2">
            {customers.map(c => (
              <button key={c.id} onClick={() => { setSelectedId(c.id); setSheet(null) }} className={`press w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left ${selectedId === c.id ? 'border-hj-brand bg-hj-brandsoft' : 'border-hj-line bg-hj-card'}`}>
                <Avatar initials={c.initials} color={c.color} size={40} />
                <div className="flex-1 min-w-0"><p className="text-[14px] font-bold truncate">{c.name}</p><p className="text-[12px] text-hj-muted">{c.phone}</p></div>
                <span className={`font-display font-extrabold tnum text-[14px] ${c.balance >= 0 ? 'text-hj-get' : 'text-hj-give'}`}>{formatINR(c.balance)}</span>
              </button>
            ))}
            <button onClick={() => setSheet('addCust')} className="press w-full h-12 rounded-2xl border-2 border-dashed border-hj-line text-hj-brand font-bold text-[14px] flex items-center justify-center gap-2"><Plus size={16} /> {t('addCustomer')}</button>
          </div>
        </Sheet>

        <Sheet open={sheet === 'addReminder'} onClose={() => setSheet(null)} title={t('addReminder')}>
          <div className="flex justify-center -mt-1 mb-2"><Art name="calendar" className="w-24 h-24" /></div>
          <div className="space-y-3">
            <Field label={t('customer')}>
              <div className="flex gap-2 overflow-auto scrollbar-hide pb-1">
                {customers.filter(c => c.balance > 0).concat(customers.filter(c => c.balance <= 0)).slice(0, 12).map(c => (
                  <button key={c.id} onClick={() => setNewReminder(v => ({ ...v, customerId: c.id, name: c.name, amount: v.amount || (c.balance > 0 ? String(c.balance) : '') }))} className={`press shrink-0 flex flex-col items-center gap-1 w-16 p-1.5 rounded-2xl border-2 ${newReminder.customerId === c.id ? 'border-hj-brand bg-hj-brandsoft' : 'border-transparent'}`}>
                    <Avatar initials={c.initials} color={c.color} size={38} /><span className="text-[10px] font-bold truncate w-full text-center">{c.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('titleOrCustomer')}><input value={newReminder.name} onChange={e => setNewReminder(v => ({ ...v, name: e.target.value, customerId: '' }))} className={inputCls} /></Field>
            <Field label={t('amount')}><input inputMode="decimal" value={newReminder.amount} onChange={e => setNewReminder(v => ({ ...v, amount: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="₹" className={inputCls} /></Field>
            <Field label={t('dueDate')}>
              <div className="flex gap-2 mb-2">
                {[[0, t('today')], [1, t('tomorrow')], [7, '+7'], [30, '+30']].map(([n, l]) => (
                  <Chip key={String(n)} active={newReminder.dueISO === addDays(localISO(), Number(n))} onClick={() => setNewReminder(v => ({ ...v, dueISO: addDays(localISO(), Number(n)) }))}>{String(l)}</Chip>
                ))}
              </div>
              <input type="date" value={newReminder.dueISO} onChange={e => e.target.value && setNewReminder(v => ({ ...v, dueISO: e.target.value }))} className={inputCls} />
            </Field>
            <PrimaryBtn onClick={handleAddReminder} className="mt-2"><Bell size={17} /> {t('addReminder')}</PrimaryBtn>
          </div>
        </Sheet>

        <Sheet open={sheet === 'sort'} onClose={() => setSheet(null)} title={t('sortBy')}>
          <div className="space-y-2">
            {([['amount', 'sortAmount'], ['recent', 'sortRecent'], ['name', 'sortName']] as [SortKey, TKey][]).map(([k, l]) => (
              <button key={k} onClick={() => { setSortKey(k); setSheet(null) }} className={`press w-full flex justify-between items-center h-14 px-4 rounded-2xl border-2 ${sortKey === k ? 'border-hj-brand bg-hj-brandsoft' : 'border-hj-line bg-hj-card'}`}>
                <span className="font-bold text-[15px]">{t(l)}</span>{sortKey === k && <Check size={18} className="text-hj-brand" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </Sheet>

        <Sheet open={sheet === 'month'} onClose={() => setSheet(null)} title={t('date')}>
          <div className="grid grid-cols-2 gap-2">
            {monthOptions.map(m => (
              <button key={m} onClick={() => { setReportMonth(m); setSheet(null) }} className={`press h-12 rounded-2xl border-2 font-bold text-[14px] ${reportMonth === m ? 'border-hj-brand bg-hj-brandsoft text-hj-brand' : 'border-hj-line bg-hj-card'}`}>{monthLabelOf(m)}</button>
            ))}
          </div>
        </Sheet>

        <Sheet open={sheet === 'txnActions' && !!actionTxn} onClose={() => setSheet(null)}>
          {actionTxn && (
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-4">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${actionTxn.type === 'received' ? 'bg-hj-getsoft text-hj-get' : 'bg-hj-givesoft text-hj-give'}`}>{actionTxn.type === 'received' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span>
                <div className="flex-1"><p className={`font-display text-[22px] font-extrabold tnum ${actionTxn.type === 'received' ? 'text-hj-get' : 'text-hj-give'}`}>{formatINR(actionTxn.amount)}</p><p className="text-[12px] text-hj-muted">{actionTxn.type === 'received' ? t('youGot') : t('youGave')} • {prettyDate(actionTxn.dateISO)} {actionTxn.time}{actionTxn.note ? ` • ${actionTxn.note}` : ''}</p></div>
              </div>
              <div className="rounded-3xl border border-hj-line overflow-hidden">
                {[
                  { l: t('viewReceipt'), icon: ReceiptIcon, act: () => { setLastTxn(actionTxn); setSheet(null); navigateTo('receipt') } },
                  { l: t('shareWhatsApp'), icon: MessageCircle, act: () => { setSheet(null); shareReceipt(actionTxn) } },
                  { l: t('deleteEntry'), icon: Trash2, danger: true, act: () => { const x = actionTxn; setSheet(null); setConfirm({ title: t('deleteEntryQ'), sub: t('deleteEntrySub'), cta: t('delete'), onYes: () => deleteTxn(x) }) } },
                ].map((r, i) => (
                  <button key={r.l} onClick={r.act} className={`w-full h-14 px-4 flex items-center gap-3 text-[15px] font-bold active:bg-hj-card2 ${i ? 'border-t border-hj-line' : ''} ${r.danger ? 'text-hj-give' : ''}`}><r.icon size={18} />{r.l}</button>
                ))}
              </div>
            </div>
          )}
        </Sheet>

        <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} title={t('about')}>
          <div className="text-center">
            <Art name="private" className="w-32 h-32 mx-auto" />
            <p className="font-display text-[22px] font-extrabold text-hj-brand">Hisab<span className="text-hj-gold">Jod</span></p>
            <p className="text-[13px] text-hj-muted">{t('tagline')} • v2.0</p>
            <p className="text-[14px] leading-relaxed mt-4 text-hj-ink2">{t('aboutBody')}</p>
            <a href="/privacy/" className="inline-block mt-4 text-[14px] font-bold text-hj-brand underline underline-offset-4">{t('privacyPolicy')}</a>
          </div>
        </Sheet>

        <Sheet open={sheet === 'rate'} onClose={() => { setSheet(null); localStorage.setItem('hisabjod-rated', 'later') }}>
          <div className="text-center pt-2">
            <div className="flex justify-center gap-1 text-hj-gold">{[0, 1, 2, 3, 4].map(i => <Star key={i} size={30} className="fill-current pop-enter" style={{ animationDelay: `${i * 70}ms` }} />)}</div>
            <h3 className="font-display font-extrabold text-[20px] mt-3">{t('enjoying')}</h3>
            <p className="text-[14px] text-hj-muted mt-1">{t('rateSub')}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <PrimaryBtn tone="ghost" onClick={() => { setSheet(null); localStorage.setItem('hisabjod-rated', 'later') }}>{t('later')}</PrimaryBtn>
              <PrimaryBtn onClick={() => { setSheet(null); localStorage.setItem('hisabjod-rated', 'yes'); window.open('https://play.google.com/store/apps/details?id=com.hisabjod.digitalkhata', '_blank') }}>{t('rateNow')}</PrimaryBtn>
            </div>
          </div>
        </Sheet>

        <Sheet open={sheet === 'forgot'} onClose={() => setSheet(null)} title={t('forgotPin')}>
          <p className="text-[14px] text-hj-ink2 leading-relaxed">{t('forgotPinSub')}</p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <PrimaryBtn tone="ghost" onClick={() => setSheet(null)}>{t('cancel')}</PrimaryBtn>
            <PrimaryBtn tone="give" onClick={() => { setSheet(null); setConfirm({ title: t('resetQ'), sub: t('resetSub'), cta: t('erase'), onYes: eraseAll }) }}>{t('erase')}</PrimaryBtn>
          </div>
        </Sheet>

        {/* confirm dialog */}
        {confirm && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center p-6">
            <div className="fade-enter absolute inset-0 bg-[#06140d]/55" onClick={() => setConfirm(null)} />
            <div role="alertdialog" className="pop-enter relative w-full max-w-[340px] rounded-[28px] bg-hj-card p-6 text-center shadow-hjlg">
              <span className="w-14 h-14 mx-auto rounded-full bg-hj-givesoft text-hj-give flex items-center justify-center"><Trash2 size={24} /></span>
              <h3 className="font-display font-extrabold text-[18px] mt-3">{confirm.title}</h3>
              <p className="text-[13px] text-hj-muted mt-1 leading-relaxed">{confirm.sub}</p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <PrimaryBtn tone="ghost" onClick={() => setConfirm(null)}>{t('cancel')}</PrimaryBtn>
                <PrimaryBtn tone="give" onClick={() => { const c = confirm; setConfirm(null); c.onYes() }}>{confirm.cta}</PrimaryBtn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- small local components ----------
function PinPad({ onKey, dark }: { onKey: (k: string) => void; dark?: boolean }) {
  const cls = dark ? 'bg-white/12 text-white active:bg-white/25' : 'bg-hj-card text-hj-ink border border-hj-line shadow-hj'
  return (
    <div className="grid grid-cols-3 gap-3 mt-8 w-[252px]">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => <button key={n} onClick={() => onKey(n)} className={`press h-16 rounded-3xl font-display text-[24px] font-bold ${cls}`}>{n}</button>)}
      <span />
      <button onClick={() => onKey('0')} className={`press h-16 rounded-3xl font-display text-[24px] font-bold ${cls}`}>0</button>
      <button aria-label="Delete" onClick={() => onKey('del')} className={`press h-16 rounded-3xl flex items-center justify-center ${dark ? 'text-white' : 'text-hj-ink'}`}><Delete size={24} /></button>
    </div>
  )
}

function Ring({ value, label, size = 52 }: { value: number; label: string; size?: number }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hj-line)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hj-brand)" strokeWidth={6} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-[13px]">{label}</span>
    </div>
  )
}
