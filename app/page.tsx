'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import {
  ArrowDownLeft, ArrowUpRight, Bell, BookOpen, Search, Plus, ChevronRight, Home, Users, BarChart3, FileText, MoreHorizontal,
  ArrowLeft, Phone, MapPin, HandCoins, Clock, Pencil, CreditCard, Wallet, StickyNote, Calendar, Share2,
  Download, Shield, Fingerprint, Globe, Sun, Moon, Lock, CloudDownload, Upload, Briefcase, HelpCircle, Info,
  Leaf, Store, ChevronDown, X, Check, Trash2, Landmark, Smartphone, Grid3X3, Repeat, Building2, Save
} from 'lucide-react'

type View = 'splash'|'home'|'customers'|'customer-detail'|'add-transaction'|'receipt'|'reports'|'backup'|'applock'|'settings'|'reminders'
type Lang = 'English'|'मराठी'|'हिंदी'
type TxnType = 'give'|'receive'
type Filter = 'All'|'Receivable'|'Payable'|'Overdue'
type ReminderTab = 'Upcoming'|'Overdue'|'Completed'
type Reminder = { id:string; name:string; amount:number; due:string; status: ReminderTab; type?:string }
type Customer = { id:string; name:string; phone:string; village?:string; initials:string; color:string; balance:number; totalGiven:number; totalReceived:number; notes?:string }
type Txn = { id:string; customerId:string; name:string; initials:string; color:string; type:'given'|'received'; amount:number; method:string; time:string; dateLabel:string; bal:number; note?:string; dateISO:string }

const customersInit: Customer[] = [
  { id:'1', name:'Ramesh Patil', phone:'+91 98765 43210', village:'Sangli, Maharashtra', initials:'RP', color:'#2563eb', balance:12500, totalGiven:45000, totalReceived:32500, notes:'' },
  { id:'2', name:'Suresh Jadhav', phone:'+91 87654 32109', initials:'SJ', color:'#ec4899', balance:-8000, totalGiven:18000, totalReceived:26000 },
  { id:'3', name:'Mangal Stores', phone:'+91 91234 56789', initials:'M', color:'#0e8a5a', balance:25300, totalGiven:32000, totalReceived:6700 },
  { id:'4', name:'Sunita Tai', phone:'+91 99887 77665', initials:'R', color:'#16a34a', balance:0, totalGiven:15000, totalReceived:15000 },
  { id:'5', name:'Vijay Shetkari', phone:'+91 98989 11223', initials:'B', color:'#f59e0b', balance:-5500, totalGiven:5000, totalReceived:10500 },
  { id:'6', name:'Shinde Hardware', phone:'+91 91122 33445', initials:'S', color:'#f59e0b', balance:18700, totalGiven:25000, totalReceived:6300 },
]
const txnsInit: Txn[] = [
  { id:'t1', customerId:'1', name:'Ramesh Patil', initials:'RP', color:'#2563eb', type:'received', amount:2000, method:'Cash', time:'10:30 AM', dateLabel:'Today', bal:12500, dateISO:new Date().toISOString().slice(0,10) },
  { id:'t2', customerId:'1', name:'Ramesh Patil', initials:'RP', color:'#2563eb', type:'given', amount:5000, method:'Cash', time:'09:15 AM', dateLabel:'Today', bal:14500, dateISO:new Date().toISOString().slice(0,10) },
  { id:'t3', customerId:'6', name:'Shinde Hardware', initials:'S', color:'#f59e0b', type:'given', amount:3500, method:'Cash', time:'04:20 PM', dateLabel:'Yesterday', bal:9500, dateISO:new Date(Date.now()-86400000).toISOString().slice(0,10) },
  { id:'t4', customerId:'2', name:'Suresh Jadhav', initials:'SJ', color:'#ec4899', type:'given', amount:5000, method:'UPI', time:'09:15 AM', dateLabel:'Today', bal:8000, note:'Given', dateISO:new Date().toISOString().slice(0,10) },
]
const remindersInit: Reminder[] = [
  { id:'r1', name:'Ramesh Patil', amount:5000, due:'Due Today', status:'Upcoming' },
  { id:'r2', name:'Suresh Jadhav', amount:3500, due:'Due Tomorrow', status:'Upcoming' },
  { id:'r3', name:'Monthly Rent', amount:10000, due:'Repeats: 1st every month', status:'Upcoming', type:'rent' },
  { id:'r4', name:'Vijay Shetkari', amount:7000, due:'Overdue - 3 days', status:'Overdue' },
]

function formatINR(n:number){ return '₹'+n.toLocaleString('en-IN') }

export default function Page(){
  const [view,setView]=useState<View>('splash')
  const [dark,setDark]=useState(false)
  const [lang,setLang]=useState<Lang>('English')
  const [customers,setCustomers]=useState<Customer[]>(customersInit)
  const [txns,setTxns]=useState<Txn[]>(txnsInit)
  const [reminders,setReminders]=useState<Reminder[]>(remindersInit)
  const [selectedId,setSelectedId]=useState('1')
  const [filter,setFilter]=useState<Filter>('All')
  const [search,setSearch]=useState('')
  const [txnType,setTxnType]=useState<TxnType>('receive')
  const [amount,setAmount]=useState('')
  const [method,setMethod]=useState('Cash')
  const [desc,setDesc]=useState('')
  const [txnDate,setTxnDate]=useState('22 Sep 2026')
  const [txnDateISO,setTxnDateISO]=useState(new Date().toISOString().slice(0,10))
  const [lastTxn,setLastTxn]=useState<Txn|null>(null)
  const [pin,setPin]=useState('')
  const [storedPin,setStoredPin]=useState('')
  const [pinMode,setPinMode]=useState<'pin'|'bio'>('pin')
  const [reminderTab,setReminderTab]=useState<ReminderTab>('Upcoming')
  const [lockEnabled,setLockEnabled]=useState(false)
  const [isLocked,setIsLocked]=useState(false)
  const [detailTab,setDetailTab]=useState<'txns'|'details'|'notes'>('txns')
  const [notesDraft,setNotesDraft]=useState('')
  const [toast,setToast]=useState<string|null>(null)
  const [showAddCust,setShowAddCust]=useState(false)
  const [showEditCust,setShowEditCust]=useState(false)
  const [showBiz,setShowBiz]=useState(false)
  const [showLang,setShowLang]=useState(false)
  const [showChangeCust,setShowChangeCust]=useState(false)
  const [showAddReminder,setShowAddReminder]=useState(false)
  const [newCust,setNewCust]=useState({name:'',phone:'',village:''})
  const [editCust,setEditCust]=useState({name:'',phone:'',village:''})
  const [bizName,setBizName]=useState('Shree Kirana')
  const [bizPhone,setBizPhone]=useState('+91 98765 43210')
  const [newReminder,setNewReminder]=useState({name:'',amount:''})
  const [unlockPin,setUnlockPin]=useState('')
  const fileRef=useRef<HTMLInputElement>(null)
  const [viewHistory,setViewHistory]=useState<View[]>([])
  const touchStartX=useRef<number|null>(null)
  const [referralCode,setReferralCode]=useState('')
  const [showRatePrompt,setShowRatePrompt]=useState(false)
  const [installPrompt,setInstallPrompt]=useState<any>(null)
  const [showReferral,setShowReferral]=useState(false)
  const [reportMonth,setReportMonth]=useState('2026-09')
  const [showMonthPicker,setShowMonthPicker]=useState(false)

  // smooth flexible navigation
  function navigateTo(v:View){
    if(v===view) return
    setViewHistory(h=> [...h, view])
    setView(v)
    try{ if('vibrate' in navigator) (navigator as any).vibrate(10) }catch{}
    if(typeof window!=='undefined') try{ window.history.pushState({view:v},'') }catch{}
  }
  function goBack(){
    setViewHistory(h=>{
      const prev=h[h.length-1]
      if(prev){ setView(prev); return h.slice(0,-1) }
      if(view!=='home' && view!=='splash') setView('home')
      return h
    })
    try{ if('vibrate' in navigator) (navigator as any).vibrate(8) }catch{}
  }
  function handleTouchStart(e:React.TouchEvent){ touchStartX.current=e.touches[0].clientX }
  function handleTouchEnd(e:React.TouchEvent){
    if(touchStartX.current==null) return
    const dx=e.changedTouches[0].clientX - touchStartX.current
    if(dx>80 && view!=='splash' && view!=='home'){ goBack() }
    touchStartX.current=null
  }

  // hardware back / browser back
  useEffect(()=>{
    const onPop=()=>{ if(view!=='splash' && view!=='home' && !isLocked){ goBack() } }
    window.addEventListener('popstate', onPop)
    return ()=> window.removeEventListener('popstate', onPop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view, isLocked])

  // persistence
  useEffect(()=>{
    try{
      const raw=localStorage.getItem('hisabjod-v2')
      if(raw){
        const d=JSON.parse(raw)
        if(d.customers) setCustomers(d.customers)
        if(d.txns) setTxns(d.txns)
        if(d.reminders) setReminders(d.reminders)
        if(d.storedPin) setStoredPin(d.storedPin)
        if(typeof d.lockEnabled==='boolean') setLockEnabled(d.lockEnabled)
        if(d.bizName) setBizName(d.bizName)
        if(typeof d.dark==='boolean') setDark(d.dark)
        if(d.lang) setLang(d.lang)
      }
    }catch{}
  },[])
  useEffect(()=>{
    try{ localStorage.setItem('hisabjod-v2', JSON.stringify({customers,txns,reminders,storedPin,lockEnabled,bizName,dark,lang})) }catch{}
  },[customers,txns,reminders,storedPin,lockEnabled,bizName,dark,lang])

  useEffect(()=>{ if(lockEnabled && storedPin) setIsLocked(view!=='splash') },[lockEnabled,storedPin,view])

  // referral ?ref= + PWA install + retention hooks
  useEffect(()=>{
    try{
      const params=new URLSearchParams(window.location.search)
      const ref=params.get('ref')
      if(ref){ localStorage.setItem('hisabjod-ref', ref); showToast(`Referral: ${ref}`) }
      let code=localStorage.getItem('hisabjod-my-ref')
      if(!code){ code='HJ'+Math.random().toString(36).slice(2,6).toUpperCase(); localStorage.setItem('hisabjod-my-ref', code) }
      setReferralCode(code)
      const onBeforeInstall=(e:any)=>{ e.preventDefault(); setInstallPrompt(e) }
      window.addEventListener('beforeinstallprompt', onBeforeInstall)
      return ()=> window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }catch{}
  },[])
  const selected = customers.find(c=>c.id===selectedId) || customers[0]
  useEffect(()=>{ setNotesDraft(selected?.notes||'') },[selectedId, selected?.notes])

  const filtered = useMemo(()=>{
    return customers.filter(c=>{
      if(filter==='Receivable' && c.balance<=0) return false
      if(filter==='Payable' && c.balance>=0) return false
      if(filter==='Overdue' && c.balance<=5000) return false
      if(search && ! (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || (c.village||'').toLowerCase().includes(search.toLowerCase()))) return false
      return true
    })
  },[filter,search,customers])

  const totalReceive = customers.reduce((s,c)=> s + (c.balance>0?c.balance:0),0)
  const totalPay = customers.reduce((s,c)=> s + (c.balance<0? -c.balance:0),0)
  const overdueCount = customers.filter(c=>c.balance>10000).length
  const todayTxns = txns.filter(t=>t.dateLabel==='Today')
  const todaySum = todayTxns.reduce((s,t)=>s+(t.type==='given'? t.amount : 0)+(t.type==='received'? t.amount : 0),0)
  // reports derived
  const totalGivenAll = customers.reduce((s,c)=>s+c.totalGiven,0)
  const totalReceivedAll = customers.reduce((s,c)=>s+c.totalReceived,0)
  const outstandingAll = totalReceive
  // streak: consecutive days with txns up to today
  const streak = useMemo(()=>{
    const dates=new Set(txns.map(t=>t.dateISO))
    dates.add(new Date().toISOString().slice(0,10))
    let s=0; const d=new Date()
    for(let i=0;i<30;i++){
      const iso=d.toISOString().slice(0,10)
      if(dates.has(iso)) s++
      else if(i>0) break
      d.setDate(d.getDate()-1)
    }
    return Math.min(s, txns.length? s : 1)
  },[txns])
  const checklist = useMemo(()=>({
    cust: customers.length>0,
    txn: txns.length>0,
    backup: typeof window!=='undefined' ? !!localStorage.getItem('hisabjod-last-backup') : false
  }),[customers.length, txns.length])
  const checklistProgress = (checklist.cust?1:0)+(checklist.txn?1:0)+(checklist.backup?1:0)

  // local notifications daily 9am + auto-backup weekly (after streak defined)
  useEffect(()=>{
    const isNative=(window as any).Capacitor?.isNativePlatform?.()
    if(isNative){
      (async()=>{
        try{
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          const perm=await LocalNotifications.requestPermissions()
          if(perm.display==='granted'){
            await LocalNotifications.schedule({
              notifications:[
                { title:'HisabJod - Yaad dilaye?', body: overdueCount? `${overdueCount} customers overdue ${formatINR(totalReceive)}` : `Add today's entry - keep streak ${streak}🔥`, id:1, schedule:{ on:{hour:9, minute:0}, allowWhileIdle:true } }
              ]
            })
          }
        }catch{}
      })()
    }
    try{
      const last=localStorage.getItem('hisabjod-last-backup')
      if(!last || (Date.now()-new Date(last).getTime()>7*24*60*60*1000)){
        if(customers.length>0) setTimeout(()=>showToast('Weekly backup due — Backup & Restore'),2000)
      }
    }catch{}
  },[overdueCount, totalReceive, streak, customers.length])
  // rate prompt after 3 txns
  useEffect(()=>{
    if(txns.length===3 && !localStorage.getItem('hisabjod-rated')){
      setTimeout(()=>setShowRatePrompt(true),1200)
    }
  },[txns.length])

  // AdMob - high revenue smart (free SDK, no backend)
  const interstitialCountRef=useRef(0)
  const lastInterstitialRef=useRef(0)
  useEffect(()=>{
    const isNative=(window as any).Capacitor?.isNativePlatform?.()
    if(!isNative) return
    ;(async()=>{
      try{
        const { AdMob } = await import('@capacitor-community/admob')
        await AdMob.initialize({ requestTrackingAuthorization:true, initializeForTesting:false })
        // App Open High eCPM - prepare
        try{ await (AdMob as any).prepareAppOpenAd?.({ adId:'ca-app-pub-1607968585289432/6998555510' }) }catch{}
      }catch(e){ console.log('AdMob init',e) }
    })()
  },[])
  // Banner - ONE proper place at bottom above nav (high viewability, no overlap)
  useEffect(()=>{
    const isNative=(window as any).Capacitor?.isNativePlatform?.()
    if(!isNative) return
    if(view!=='home') {
      ;(async()=>{ try{ const {AdMob}=await import('@capacitor-community/admob'); await AdMob.removeBanner().catch(()=>{}) }catch{} })()
      return
    }
    ;(async()=>{
      try{
        const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob')
        await AdMob.removeBanner().catch(()=>{})
        // margin 90 = 64 nav + 26 safe area, ensures banner sits ABOVE bottom nav, not overlapping
        const opts:any={ adId:'ca-app-pub-1607968585289432/3656322283', adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin:90, isTesting:false }
        await AdMob.showBanner(opts)
      }catch{}
    })()
    return ()=>{ (async()=>{ try{ const {AdMob}=await import('@capacitor-community/admob'); await AdMob.removeBanner().catch(()=>{}) }catch{} })() }
  },[view])
  async function showAppOpenAd(){
    try{
      const { AdMob } = await import('@capacitor-community/admob')
      const isNative=(window as any).Capacitor?.isNativePlatform?.()
      if(!isNative) return
      try{ await (AdMob as any).showAppOpenAd?.() }catch{ // fallback try prepare then show
        try{ await (AdMob as any).prepareAppOpenAd?.({ adId:'ca-app-pub-1607968585289432/6998555510' }); await (AdMob as any).showAppOpenAd?.() }catch{}
      }
    }catch{}
  }
  async function showInterstitialSmart(){
    const now=Date.now()
    if(now - lastInterstitialRef.current < 120000) return // 2 min cap - policy safe
    interstitialCountRef.current++
    if(interstitialCountRef.current % 3 !== 0) return // every 3rd save - high revenue without annoy
    lastInterstitialRef.current=now
    try{
      const { AdMob } = await import('@capacitor-community/admob')
      const opts:any={ adId:'ca-app-pub-1607968585289432/2091959177', isTesting:false }
      await AdMob.prepareInterstitial(opts)
      await AdMob.showInterstitial()
    }catch{}
  }
  async function showRewardedAd(onReward:()=>void){
    try{
      const { AdMob } = await import('@capacitor-community/admob')
      const isNative=(window as any).Capacitor?.isNativePlatform?.()
      if(!isNative){ onReward(); return }
      const opts:any={ adId:'ca-app-pub-1607968585289432/8717077271', isTesting:false }
      await AdMob.prepareRewardVideoAd(opts)
      const handler = async (reward:any)=>{ onReward(); showToast('Reward unlocked!') }
      // @ts-ignore
      AdMob.addListener('onRewardedVideoAdReward' as any, handler)
      await AdMob.showRewardVideoAd()
      setTimeout(()=>{ try{ (AdMob as any).removeAllListeners?.() }catch{} }, 30000)
    }catch{ onReward() }
  }

  function showToast(msg:string){ setToast(msg); setTimeout(()=>setToast(null),2200) }

  function handleKey(v:string){
    if(v==='del'){ setAmount(a=>a.slice(0,-1)); return }
    if(v==='.' && amount.includes('.')) return
    if(v==='.' && amount==='') { setAmount('0.'); return }
    if(amount.includes('.') && amount.split('.')[1]?.length>=2) return
    if(!amount.includes('.') && amount.length>=7) return
    setAmount(a=>a+v)
  }
  function saveTxn(){
    const amt = Number(amount)
    if(!amt || isNaN(amt)) return showToast('Enter amount')
    if(amt>1000000) return showToast('Amount too large')
    const isGive = txnType==='give'
    const newBal = isGive ? selected.balance + amt : selected.balance - amt
    const now = new Date()
    const time = now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
    const newTxn: Txn = { id:'t'+Date.now(), customerId:selected.id, name:selected.name, initials:selected.initials, color:selected.color, type: isGive?'given':'received', amount:amt, method, time, dateLabel:'Today', bal:newBal, note:desc, dateISO:txnDateISO }
    setCustomers(prev=> prev.map(c=> c.id===selected.id ? { ...c, balance:newBal, totalGiven: isGive ? c.totalGiven+amt : c.totalGiven, totalReceived: !isGive ? c.totalReceived+amt : c.totalReceived } : c))
    setTxns(prev=>[newTxn,...prev])
    setLastTxn(newTxn)
    setAmount(''); setDesc('')
    navigateTo('receipt')
    showToast(isGive? 'Given recorded':'Received recorded')
    setTimeout(()=>showInterstitialSmart(), 800)
  }

  async function saveBlobNative(blob:Blob, fileName:string){
    const isNative = (window as any).Capacitor?.isNativePlatform?.()
    if(isNative){
      try{
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const base64 = await new Promise<string>((res,rej)=>{
          const r=new FileReader(); r.onload=()=> res((r.result as string).split(',')[1]); r.onerror=rej; r.readAsDataURL(blob)
        })
        await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Documents })
        try{
          const { Share } = await import('@capacitor/share')
          const uri = await Filesystem.getUri({ path: fileName, directory: Directory.Documents })
          await Share.share({ title: fileName, text:`Saved to Documents/${fileName}`, url: uri.uri })
        }catch{}
        showToast(`Saved to Documents/${fileName}`)
        return true
      }catch(e){ console.error(e) }
    }
    return false
  }
  async function downloadBlob(blob:Blob, fileName:string){
    if(await saveBlobNative(blob,fileName)) return
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=fileName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000)
    // fallback open
    setTimeout(()=>{ try{ window.open(url,'_blank')}catch{} },300)
  }
  async function exportBackup(){
    const data = JSON.stringify({customers,txns,reminders,bizName,date:new Date().toISOString()},null,2)
    const blob = new Blob([data],{type:'application/json'})
    const fileName=`HisabJod-backup-${new Date().toISOString().slice(0,10)}.json`
    await downloadBlob(blob,fileName)
    showToast('Backup saved to Documents')
    localStorage.setItem('hisabjod-last-backup', new Date().toLocaleString())
  }
  function importBackup(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]; if(!f) return
    const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(String(r.result)); if(d.customers) setCustomers(d.customers); if(d.txns) setTxns(d.txns); if(d.reminders) setReminders(d.reminders); showToast('Restore successful!'); localStorage.setItem('hisabjod-last-backup', new Date().toLocaleString())}catch{showToast('Invalid file')} }; r.readAsText(f)
    e.target.value=''
  }
  async function makePdf(){
    const t = lastTxn || txns[0]; if(!t) return showToast('No transaction')
    const pdf=new jsPDF({unit:'mm',format:'a4'})
    pdf.setFillColor(14,138,90); pdf.rect(0,0,210,36,'F')
    pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(20); pdf.text('HisabJod',15,18)
    pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.text('Digital Khata  •  TRANSACTION RECEIPT',15,26)
    pdf.setTextColor(30,30,30); pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text('Transaction Receipt',15,50)
    const rows=[
      ['Customer', t.name], ['Date', txnDate+' 10:30 AM'], ['Transaction ID','TXN00'+t.id.slice(-3)],
      ['Type', t.type==='received'?'Received':'Given'], ['Amount', formatINR(t.amount)], ['Payment Method', t.method],
      ['Previous Balance', formatINR((t.bal + (t.type==='given'?-t.amount:t.amount)))], ['Remaining Balance', formatINR(t.bal)]
    ]
    let y=62; pdf.setFontSize(9); rows.forEach(([k,v])=>{
      pdf.setFont('helvetica','normal'); pdf.setTextColor(110,110,110); pdf.text(k,15,y)
      pdf.setFont('helvetica','bold'); pdf.setTextColor(30,30,30); pdf.text(v,70,y)
      pdf.setDrawColor(230,230,230); pdf.line(15,y+2,195,y+2); y+=9
    })
    pdf.setFont('helvetica','italic'); pdf.setTextColor(14,138,90); pdf.text('Thank you!  आपल्या विश्वासाबद्दल धन्यवाद!',15, y+12)
    const blob = pdf.output('blob') as Blob
    if(await saveBlobNative(blob,'HisabJod-receipt.pdf')) return
    pdf.save('HisabJod-receipt.pdf')
    showToast('PDF saved')
  }
  function shareTextViaWhatsApp(phone:string, text:string){
    const clean=phone.replace(/\D/g,'')
    const url = clean ? `https://wa.me/${clean}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url,'_blank','noopener,noreferrer')
  }
  function shareKhataViaWhatsApp(){
    const c=selected; const txt=`*${bizName} - Khata*\nCustomer: ${c.name} (${c.phone})\nOutstanding: ${c.balance>0?`You will receive ${formatINR(c.balance)}` : c.balance<0?`You will pay ${formatINR(-c.balance)}`:'Settled'}\nTotal Given: ${formatINR(c.totalGiven)}\nTotal Received: ${formatINR(c.totalReceived)}\n\nSent via HisabJod`
    shareTextViaWhatsApp(c.phone, txt); showToast('Khata shared on WhatsApp')
  }
  function shareReportViaWhatsApp(){
    const txt=`*${bizName} - Report - Sep 2026*\nTo Receive: ${formatINR(totalReceive)}\nTo Pay: ${formatINR(totalPay)}\nOutstanding: ${formatINR(outstandingAll)}\nTotal Given: ${formatINR(totalGivenAll)}\nTotal Received: ${formatINR(totalReceivedAll)}\nCustomers: ${customers.length}\n\nSent via HisabJod`
    shareTextViaWhatsApp('', txt); showToast('Report shared on WhatsApp')
  }
  async function shareReceiptViaWhatsApp(){
    const t = lastTxn || txns[0]; if(!t) return showToast('No transaction')
    const pdf=new jsPDF({unit:'mm',format:'a4'})
    pdf.setFillColor(14,138,90); pdf.rect(0,0,210,36,'F')
    pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(20); pdf.text('HisabJod',15,18)
    pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.text('Digital Khata  •  TRANSACTION RECEIPT',15,26)
    pdf.setTextColor(30,30,30); pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text('Transaction Receipt',15,50)
    const rows=[
      ['Customer', t.name], ['Date', txnDate+' 10:30 AM'], ['Transaction ID','TXN00'+t.id.slice(-3)],
      ['Type', t.type==='received'?'Received':'Given'], ['Amount', formatINR(t.amount)], ['Payment Method', t.method],
      ['Previous Balance', formatINR((t.bal + (t.type==='given'?-t.amount:t.amount)))], ['Remaining Balance', formatINR(t.bal)]
    ]
    let y=62; pdf.setFontSize(9); rows.forEach(([k,v])=>{
      pdf.setFont('helvetica','normal'); pdf.setTextColor(110,110,110); pdf.text(k,15,y)
      pdf.setFont('helvetica','bold'); pdf.setTextColor(30,30,30); pdf.text(v,70,y)
      pdf.setDrawColor(230,230,230); pdf.line(15,y+2,195,y+2); y+=9
    })
    pdf.setFont('helvetica','italic'); pdf.setTextColor(14,138,90); pdf.text('Thank you!  आपल्या विश्वासाबद्दल धन्यवाद!',15, y+12)
    const blob = pdf.output('blob') as Blob
    const fileName=`HisabJod-${t.name.replace(/\s+/g,'_')}-${t.amount}.pdf`
    const file = new File([blob], fileName, {type:'application/pdf'})
    const txt = `*HisabJod Receipt*\nCustomer: ${t.name}\nAmount: ${formatINR(t.amount)} (${t.type})\nDate: ${txnDate} 10:30 AM\nBalance: ${formatINR(t.bal)}\n\nThank you!`
    // 1) Web Share API with files (free, picks WhatsApp directly)
    try{
      if((navigator as any).canShare && (navigator as any).canShare({files:[file]})){
        await (navigator as any).share({title:'HisabJod Receipt', text:txt, files:[file]})
        showToast('Shared via WhatsApp')
        return
      }
    }catch{}
    // 2) Capacitor native share (free, shows WhatsApp in sheet)
    const isNative = (window as any).Capacitor?.isNativePlatform?.()
    if(isNative){
      try{
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const { Share } = await import('@capacitor/share')
        const base64 = await new Promise<string>((res,rej)=>{
          const r=new FileReader(); r.onload=()=> res((r.result as string).split(',')[1]); r.onerror=rej; r.readAsDataURL(blob)
        })
        await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
        const uri = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
        await Share.share({ title:'HisabJod Receipt', text: txt, url: uri.uri, dialogTitle:'Share via WhatsApp' })
        showToast('Choose WhatsApp to share PDF')
        return
      }catch{}
    }
    // 3) Fallback: WhatsApp text + download PDF (free wa.me API)
    window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank')
    // also trigger download so user can attach manually if needed
    pdf.save(fileName)
    showToast('PDF downloaded — attach in WhatsApp')
  }
  async function customerReportPdf(){
    const doExport=async()=>{
      const pdf=new jsPDF({unit:'mm',format:'a4'})
      pdf.setFillColor(14,138,90); pdf.rect(0,0,210,28,'F'); pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(16); pdf.text('HisabJod - Customer Report',15,18)
      pdf.setTextColor(30,30,30); pdf.setFontSize(10); let y=40; customers.forEach(c=>{ pdf.text(`${c.name} - ${c.phone} - ${c.balance>0?'Receivable '+formatINR(c.balance): c.balance<0?'Payable '+formatINR(-c.balance):'Settled'}`,15,y); y+=7; if(y>280){ pdf.addPage(); y=20 } })
      const blob = pdf.output('blob') as Blob
      if(await saveBlobNative(blob,'customer-report.pdf')) return
      pdf.save('customer-report.pdf'); showToast('Customer report PDF saved')
    }
    // Rewarded high eCPM - watch ad to unlock report
    await showRewardedAd(doExport)
  }
  async function exportCSV(){
    const doExport=async()=>{
      const header='Name,Phone,Balance,Given,Received\n'
      const rows=customers.map(c=>`"${c.name}","${c.phone}",${c.balance},${c.totalGiven},${c.totalReceived}`).join('\n')
      const blob=new Blob([header+rows],{type:'text/csv'})
      await downloadBlob(blob,'HisabJod-customers.csv')
      showToast('CSV exported')
    }
    await showRewardedAd(doExport)
  }

  function addCustomer(){
    if(!newCust.name.trim()) return showToast('Enter name')
    if(newCust.phone && !/^\+?[\d\s-]{7,15}$/.test(newCust.phone)) return showToast('Invalid phone')
    const id=String(Date.now())
    const initials=newCust.name.trim().slice(0,2).toUpperCase()
    setCustomers(p=>[...p,{id, name:newCust.name.trim(), phone:newCust.phone||'-', village:newCust.village||'', initials, color:'#0e8a5a', balance:0, totalGiven:0, totalReceived:0, notes:''}])
    setNewCust({name:'',phone:'',village:''}); setShowAddCust(false); showToast('Customer added')
  }
  function saveEditCustomer(){
    if(!editCust.name.trim()) return showToast('Name required')
    setCustomers(prev=>prev.map(c=>c.id===selectedId? {...c, name:editCust.name.trim(), phone:editCust.phone||c.phone, village:editCust.village||c.village, initials:editCust.name.trim().slice(0,2).toUpperCase() }:c))
    setShowEditCust(false); showToast('Customer updated')
  }
  function openEdit(){
    setEditCust({name:selected.name, phone:selected.phone, village:selected.village||''})
    setShowEditCust(true)
  }
  function saveNotes(){
    setCustomers(prev=>prev.map(c=>c.id===selectedId? {...c, notes:notesDraft}:c)); showToast('Notes saved')
  }
  function handleAddReminder(){
    if(!newReminder.name.trim() || !newReminder.amount) return showToast('Enter name & amount')
    setReminders(p=>[...p,{id:'r'+Date.now(), name:newReminder.name.trim(), amount:Number(newReminder.amount), due:'Due Today', status:'Upcoming'}])
    setNewReminder({name:'',amount:''}); setShowAddReminder(false); showToast('Reminder added')
  }
  function handleSavePin(){
    if(pin.length!==4) return showToast('Enter 4-digit PIN')
    if(!/^\d{4}$/.test(pin)) return showToast('PIN must be 4 digits')
    setStoredPin(pin); setLockEnabled(true); setPin(''); showToast('PIN saved & lock enabled'); navigateTo('settings')
  }

  const lastBackup = typeof window!=='undefined' ? localStorage.getItem('hisabjod-last-backup') || '22 Sep 2026, 08:30 PM' : '22 Sep 2026, 08:30 PM'

  const bg = dark ? 'bg-[#0b1411] text-white' : 'bg-[#f2f7f4] text-[#14201c]'
  const card = dark ? 'bg-[#18251f] border-white/10' : 'bg-white border-[#e0ece6]'
  const muted = dark ? 'text-white/60' : 'text-[#6b7c77]'
  const inputBg = dark ? 'bg-[#0f1e18] border-white/10 text-white placeholder:text-white/40' : 'bg-[#f2f7f4] border-[#dce8e0] text-[#14201c]'

  return (
    <div className={`min-h-screen flex justify-center p-0 sm:p-6 ${bg} font-[Inter]`}>
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={`w-full max-w-[420px] min-h-screen sm:min-h-[860px] sm:rounded-[28px] overflow-hidden relative flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.18)] border ${dark?'border-white/10 bg-[#111d18]':'border-[#cfe3d9] bg-[#f8faf9]'} smooth-scroll`}>

        {/* TOAST */}
        {toast && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-[#14201c] text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-lg border border-white/10">{toast}</div>}
        {/* LOCK OVERLAY */}
        {isLocked && view!=='splash' && (
          <div className="absolute inset-0 z-40 bg-[#0b1411]/95 backdrop-blur flex flex-col items-center justify-center p-6">
            <div className="w-14 h-14 rounded-[16px] bg-emerald-600 flex items-center justify-center text-white"><Lock size={22}/></div>
            <h3 className="text-white font-extrabold mt-3">App Locked</h3>
            <p className="text-white/60 text-[11px] mt-1">Enter PIN to unlock</p>
            <div className="flex gap-2 mt-4">{[0,1,2,3].map(i=><div key={i} className={`w-3 h-3 rounded-full ${i < unlockPin.length?'bg-emerald-500':'bg-white/20'}`} />)}</div>
            <div className="grid grid-cols-3 gap-3 mt-6 w-[180px]">
              {['1','2','3','4','5','6','7','8','9'].map(n=><button key={n} onClick={()=>unlockPin.length<4 && setUnlockPin(p=>p+n)} className="h-11 rounded-[10px] bg-white/10 text-white border border-white/10 font-bold">{n}</button>)}
              <button onClick={()=>setUnlockPin('')} className="h-11 rounded-[10px] bg-white/10 text-white border border-white/10 flex items-center justify-center"><X size={16}/></button>
              <button onClick={()=>unlockPin.length<4 && setUnlockPin(p=>p+'0')} className="h-11 rounded-[10px] bg-white/10 text-white border border-white/10 font-bold">0</button>
              <button onClick={()=>setUnlockPin(p=>p.slice(0,-1))} className="h-11 rounded-[10px] bg-white/10 text-white border border-white/10 flex items-center justify-center"><Trash2 size={16}/></button>
            </div>
            <button onClick={()=>{
              if(unlockPin===storedPin){ setIsLocked(false); setUnlockPin(''); showToast('Unlocked') } else { showToast('Wrong PIN'); setUnlockPin('') }
            }} className="mt-6 w-full max-w-[180px] bg-emerald-600 text-white rounded-full py-2.5 font-bold text-[12px]">Unlock</button>
            <button onClick={()=>{ setLockEnabled(false); setIsLocked(false); showToast('Lock disabled') }} className="mt-2 text-white/60 text-[11px] underline">Disable lock</button>
          </div>
        )}

        {/* ===== SPLASH ===== */}
        {view==='splash' && (
          <div className={`page-enter flex-1 flex flex-col px-6 pt-10 pb-6 ${dark?'bg-[#0f1e18]':'bg-gradient-to-b from-[#eaf5ee] via-[#f6fbf7] to-white'}`}>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full flex justify-between items-center text-[10px] font-medium opacity-60"><span>9:41</span><span className="flex gap-1"><span>●●●</span> <span>▮</span></span></div>
              <div className="mt-6 w-[170px] h-[170px] bg-white rounded-[24px] border border-[#cfe3d9] flex items-center justify-center shadow-[0_8px_24px_rgba(14,138,90,.12)] overflow-hidden p-3">
                <img src="/hisabjod-logo-original.png" alt="HisabJod Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="mt-7 text-[30px] font-extrabold tracking-tight text-[#0a3d2b] dark:text-white">HisabJod</h1>
              <p className="text-[13px] font-semibold text-[#0e8a5a] -mt-1">Your Digital Khata</p>
              <p className="text-[11px] mt-1 text-[#6b7c77] dark:text-white/60">Simple. Secure. Offline.</p>
              <div className="grid grid-cols-3 gap-3 mt-7 w-full">
                {[
                  {icon:Users, title:'Track\nCustomers'},
                  {icon:HandCoins, title:'Manage\nPayments'},
                  {icon:Bell, title:'Never Miss\nDue Amount'},
                ].map((f,i)=>(
                  <div key={i} className={`rounded-[12px] border ${card} p-3 flex flex-col items-center gap-2 text-center`}>
                    <div className="w-9 h-9 rounded-full bg-[#e6f3ec] dark:bg-[#1e3a2b] flex items-center justify-center text-[#0e8a5a]"><f.icon size={16} /></div>
                    <span className="text-[10px] font-semibold leading-tight whitespace-pre">{f.title}</span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[11px] font-semibold text-[#0e8a5a] text-center leading-tight">व्यवसाय वाढे<br/>हिशोब आपल्या हातात</p>
            </div>
            <button onClick={()=>{
              if(lockEnabled && storedPin){ navigateTo('home'); setIsLocked(true); } else navigateTo('home')
              setTimeout(()=>showAppOpenAd(), 900)
            }} className="w-full mt-6 bg-[#0e8a5a] hover:bg-[#0a6b44] text-white rounded-full py-[14px] font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(14,138,90,.3)] btn-press">
              Get Started <ArrowUpRight size={16} />
            </button>
            <div className="mt-3 flex justify-center">
              <div className={`flex rounded-full p-1 gap-1 border ${dark?'bg-white/10 border-white/10':'bg-white border-[#dce8e0]'}`}>
                {(['English','मराठी','हिंदी'] as Lang[]).map(l=>(
                  <button key={l} onClick={()=>{setLang(l); showToast(`Language: ${l}`)}} className={`px-3 py-1 rounded-full text-[11px] font-bold ${lang===l?'bg-[#0e8a5a] text-white':'text-[#6b7c77]'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="mt-4 mx-auto w-24 h-1 rounded-full bg-black/15 dark:bg-white/20" />
          </div>
        )}

        {/* ===== HOME ===== */}
        {view==='home' && (
          <>
            <div className={`${dark?'bg-gradient-to-br from-[#0e8a5a] to-[#083d2b] text-white':'bg-gradient-to-br from-[#dcf0e3] via-[#eef7f2] to-[#f8faf9]'} px-4 pt-3 pb-3 relative overflow-hidden`}>
              <img src="/illustrations/01-khata.png" alt="" className="absolute -top-2 -right-2 w-20 h-20 opacity-[0.07] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <div className="flex justify-between items-start relative">
                <div>
                  <p className={`text-[11px] font-semibold ${dark?'text-white/80':'text-[#6b7c77]'}`}>Good {new Date().getHours()<12?'Morning':new Date().getHours()<18?'Afternoon':'Evening'}</p>
                  <h2 className="text-[18px] font-extrabold leading-none flex items-center gap-1">{bizName.split(' ')[0]||'Nivrutti'} <span className="text-[14px]">👋</span></h2>
                  <p className={`text-[10px] ${dark?'text-white/70':'text-[#6b7c77]'}`}>Let&apos;s keep your business growing</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>showToast('No new notifications')} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark?'bg-white/15':'bg-white shadow-sm border border-black/5'}`}><Bell size={16} className={dark?'text-white':'text-[#0e8a5a]'} /></button>
                  <button onClick={()=>goBack()} className="w-8 h-8 rounded-full bg-[#e0e7ff] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#3730a3]">NA</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className={`${dark?'bg-white/10 backdrop-blur border-white/15 text-white':'bg-white border-[#e0ece6]'} border rounded-[14px] p-3 relative overflow-hidden`}>
                  <img src="/illustrations/01-khata.png" alt="" className="absolute -bottom-1 -right-1 w-12 h-12 opacity-[0.08] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                  <p className={`text-[10px] font-semibold ${dark?'text-white/70':'text-[#6b7c77]'} relative`}>To Receive</p>
                  <p className="text-[16px] font-extrabold relative">{formatINR(totalReceive)}</p>
                  <p className={`text-[9px] flex items-center gap-1 ${dark?'text-emerald-200':'text-emerald-600'} relative`}><ArrowUpRight size={10}/> 8% this month</p>
                </div>
                <div className={`${dark?'bg-[#ffefe5]/10 border-white/15 text-white':'bg-[#fff1e8] border-[#f5d9c0]'} border rounded-[14px] p-3 relative overflow-hidden`}>
                  <img src="/illustrations/04-give.png" alt="" className="absolute -bottom-1 -right-1 w-12 h-12 opacity-[0.08] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                  <p className={`text-[10px] font-semibold ${dark?'text-white/70':'text-[#8a5a2b]'} relative`}>To Pay</p>
                  <p className="text-[16px] font-extrabold relative">{formatINR(totalPay)}</p>
                  <p className={`text-[9px] flex items-center gap-1 ${dark?'text-orange-200':'text-orange-600'} relative`}><ArrowUpRight size={10}/> 2% this month</p>
                </div>
                <div className={`${card} rounded-[14px] p-3 flex items-center gap-2 relative overflow-hidden`}>
                  <img src="/illustrations/06-reminders.png" alt="" className="absolute -bottom-1 -right-1 w-10 h-10 opacity-[0.07] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 relative"><Clock size={14}/></div>
                  <div className="relative"><p className={`text-[11px] font-extrabold ${dark?'text-white':''}`}>Overdue</p><p className={`text-[10px] font-bold ${dark?'text-white':'text-[#6b7c77]'}`}>{overdueCount} Customers</p></div>
                </div>
                <div className={`${card} rounded-[14px] p-3 flex items-center gap-2 relative overflow-hidden`}>
                  <img src="/illustrations/02-analytics.png" alt="" className="absolute -bottom-1 -right-1 w-10 h-10 opacity-[0.07] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 relative"><BarChart3 size={14}/></div>
                  <div className="relative"><p className="text-[10px] font-semibold text-[#6b7c77]">Today&apos;s Activity</p><p className={`text-[13px] font-extrabold ${dark?'text-white':'text-[#14201c]'}`}>{formatINR(todaySum)}</p><p className="text-[9px] text-[#6b7c77]">{todayTxns.length} transactions</p></div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  {label:'Add Customer', icon:Users, bg:'bg-[#3b82f6]', action:()=>setShowAddCust(true)},
                  {label:'Give', icon:ArrowUpRight, bg:'bg-[#0e8a5a]', action:()=>{setTxnType('give'); if(customers.length===0) showToast('Add customer first'); else navigateTo('add-transaction')}},
                  {label:'Receive', icon:ArrowDownLeft, bg:'bg-[#f97316]', action:()=>{setTxnType('receive'); if(customers.length===0) showToast('Add customer first'); else navigateTo('add-transaction')}},
                  {label:'View Report', icon:FileText, bg:'bg-[#8b5cf6]', action:()=>navigateTo('reports')},
                ].map(b=>(
                  <button key={b.label} onClick={b.action} className="flex flex-col items-center gap-1.5">
                    <div className={`w-11 h-11 rounded-[12px] ${b.bg} text-white flex items-center justify-center shadow-md`}><b.icon size={18}/></div>
                    <span className={`text-[9px] font-semibold leading-tight text-center ${dark?'text-white':'text-[#14201c]'}`}>{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* RETENTION BANNERS */}
            <div className="px-3 pt-2 space-y-2">
              {installPrompt && (
                <div className="flex items-center gap-3 p-3 rounded-[12px] border bg-[#0e8a5a] text-white border-[#0a6b44]">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Download size={14}/></div>
                  <div className="flex-1"><p className="text-[11px] font-bold">Install HisabJod</p><p className="text-[9px] opacity-80">Add to home screen — works offline</p></div>
                  <button onClick={async()=>{ installPrompt.prompt(); const r=await installPrompt.userChoice; if(r.outcome==='accepted') showToast('Installed!'); setInstallPrompt(null) }} className="px-3 py-1.5 rounded-full bg-white text-[#0e8a5a] text-[10px] font-bold">Install</button>
                  <button onClick={()=>setInstallPrompt(null)} className="text-white/70"><X size={14}/></button>
                </div>
              )}
              {checklistProgress<3 && (
                <div className={`${card} border rounded-[12px] p-3`}>
                  <div className="flex justify-between items-center"><p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Complete setup {checklistProgress}/3</p><span className="text-[9px] font-bold text-[#0e8a5a]">{Math.round(checklistProgress/3*100)}%</span></div>
                  <div className="mt-2 h-1.5 bg-[#e0ece6] rounded-full overflow-hidden"><div className="h-full bg-[#0e8a5a] transition-all" style={{width:`${checklistProgress/3*100}%`}} /></div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[9px] font-semibold">
                    <span className={`flex items-center gap-1 ${checklist.cust?'text-emerald-600':'text-[#6b7c77]'}`}>{checklist.cust? <Check size={10}/>:<span className="w-3 h-3 rounded-full border border-[#6b7c77]"/>} Customer</span>
                    <span className={`flex items-center gap-1 ${checklist.txn?'text-emerald-600':'text-[#6b7c77]'}`}>{checklist.txn? <Check size={10}/>:<span className="w-3 h-3 rounded-full border border-[#6b7c77]"/>} Transaction</span>
                    <span className={`flex items-center gap-1 ${checklist.backup?'text-emerald-600':'text-[#6b7c77]'}`}>{checklist.backup? <Check size={10}/>:<span className="w-3 h-3 rounded-full border border-[#6b7c77]"/>} Backup</span>
                  </div>
                  {!checklist.cust && <button onClick={()=>setShowAddCust(true)} className="mt-2 text-[10px] font-bold text-[#0e8a5a]">Add first customer →</button>}
                  {checklist.cust && !checklist.txn && <button onClick={()=>navigateTo('add-transaction')} className="mt-2 text-[10px] font-bold text-[#0e8a5a]">Add first transaction →</button>}
                  {checklist.cust && checklist.txn && !checklist.backup && <button onClick={()=>navigateTo('backup')} className="mt-2 text-[10px] font-bold text-[#0e8a5a]">Create backup →</button>}
                </div>
              )}
              {overdueCount>0 && (
                <div className="flex items-center gap-3 p-3 rounded-[12px] border bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center"><Clock size={14}/></div>
                  <div className="flex-1"><p className="text-[11px] font-bold text-orange-900 dark:text-orange-200">{overdueCount} customers overdue {formatINR(totalReceive)}</p><p className="text-[9px] text-orange-700 dark:text-orange-300">Send WhatsApp reminders now</p></div>
                  <button onClick={()=>navigateTo('reminders')} className="px-3 py-1.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">Remind</button>
                </div>
              )}
              {streak>=2 && (
                <div className="flex items-center gap-3 p-3 rounded-[12px] border bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">🔥</div>
                  <div className="flex-1"><p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">{streak}-day streak!</p><p className="text-[9px] text-amber-700 dark:text-amber-300">Keep it up — add today&apos;s entry</p></div>
                  <span className="text-[11px] font-extrabold text-amber-600">{streak} 🔥</span>
                </div>
              )}
              <div className={`${card} border rounded-[12px] p-3 flex items-center gap-3`}>
                <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center"><Share2 size={14}/></div>
                <div className="flex-1"><p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Invite & Earn</p><p className="text-[9px] text-[#6b7c77]">Code: <span className="font-bold text-[#0e8a5a]">{referralCode}</span> • Share & get Pro</p></div>
                <button onClick={()=>{
                  const url=typeof window!=='undefined'? window.location.origin+'/?ref='+referralCode : referralCode
                  const txt=`Try HisabJod - Digital Khata! *Simple. Secure. Offline.*\nJoin with my code *${referralCode}*:\n${url}\n\nMarathi • Hindi • English`
                  shareTextViaWhatsApp('', txt)
                }} className="px-3 py-1.5 rounded-full bg-[#0e8a5a] text-white text-[10px] font-bold">Invite</button>
              </div>
            </div>
            {/* 12 Split Illustrations - Gallery (where they are used) */}
            <div className="mx-3 mt-2 p-3 rounded-[12px] border bg-white">
              <p className="text-[11px] font-bold">HisabJod Illustrations</p>
              <p className="text-[9px] text-[#6b7c77]">12 split images — smartly used in empty states</p>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  {s:'/illustrations/01-khata.png', l:'Khata'},
                  {s:'/illustrations/02-analytics.png', l:'Analytics'},
                  {s:'/illustrations/03-customers.png', l:'Customers'},
                  {s:'/illustrations/04-give.png', l:'Give'},
                  {s:'/illustrations/05-receive.png', l:'Receive'},
                  {s:'/illustrations/06-reminders.png', l:'Reminders'},
                  {s:'/illustrations/07-receipt.png', l:'Receipt'},
                  {s:'/illustrations/08-no-customers.png', l:'No Cust'},
                  {s:'/illustrations/09-no-transactions.png', l:'No Txn'},
                  {s:'/illustrations/10-backup.png', l:'Backup'},
                  {s:'/illustrations/11-reports.png', l:'Reports'},
                  {s:'/illustrations/12-secure-offline.png', l:'Secure'},
                ].map(it=>(
                  <div key={it.l} className="flex flex-col items-center gap-1">
                    <img src={it.s} alt={it.l} className="w-14 h-14 object-contain rounded-[8px] bg-[#f8faf9] border border-[#e0ece6] p-1" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                    <span className="text-[7px] font-bold text-[#6b7c77] text-center leading-tight">{it.l}</span>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-[#6b7c77] mt-2 text-center">Tap any empty state to see — Customers empty → 08, Transactions → 09, Backup → 10, Reports empty → 11, App Lock → 12, Give/Receive → 04/05</p>
            </div>
            <div className="page-enter flex-1 px-4 pt-3 pb-32 overflow-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-2">
                <h3 className={`text-[13px] font-bold ${dark?'text-white':''}`}>Recent Transactions</h3>
                <button onClick={()=>navigateTo('reports')} className="text-[11px] font-bold text-[#0e8a5a]">See All</button>
              </div>
              <div className="space-y-2">
                {txns.slice(0,5).map(t=>(
                  <button key={t.id} onClick={()=>{setSelectedId(t.customerId); navigateTo('customer-detail')}} className={`w-full text-left flex items-center gap-3 ${card} border rounded-[12px] p-3`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{background:t.color}}>{t.initials}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-[12px] font-bold truncate ${dark?'text-white':''}`}>{t.name}</p>
                      <p className="text-[10px] text-[#6b7c77]">{t.type==='received'?'Received':'Given'} {formatINR(t.amount)} • {t.dateLabel}, {t.time}</p>
                    </div>
                    <span className={`text-[11px] font-extrabold ${t.type==='received'?'text-emerald-600':'text-red-500'}`}>{t.type==='received'?'+': '-'}{formatINR(t.amount)}</span>
                  </button>
                ))}
                {txns.length===0 && (
                  <div className="flex flex-col items-center py-6">
                    <img src="/illustrations/09-no-transactions.png" alt="No Transactions" className="w-36 h-36 object-contain" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                    <p className="text-[13px] font-bold mt-2">No Transactions Yet</p>
                    <p className="text-[11px] text-[#6b7c77] text-center">Your transactions will<br/>appear here</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===== CUSTOMERS ===== */}
        {view==='customers' && (
          <div className="page-enter flex-1 flex flex-col overflow-hidden">
            <div className={`px-4 pt-3 pb-2 border-b ${dark?'border-white/10 bg-[#111d18]':'bg-white border-[#e0ece6]'} sticky top-0 z-10 relative overflow-hidden`}>
              <img src="/illustrations/03-customers.png" alt="" className="absolute -top-1 -right-2 w-16 h-16 opacity-[0.06] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <div className="flex items-center justify-between relative">
                <h2 className={`text-[16px] font-extrabold ${dark?'text-white':''}`}>Customers</h2>
                <button onClick={()=>showToast(`${customers.length} customers`)} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark?'bg-white/10':'bg-[#f2f7f4]'}`}><Search size={16} className={muted}/></button>
              </div>
              <div className={`mt-2 flex items-center gap-2 rounded-full border px-3 py-2 ${inputBg}`}>
                <Search size={14} className={muted} />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, mobile, village..." className="flex-1 bg-transparent outline-none text-[11px]" />
                {search && <button onClick={()=>setSearch('')}><X size={14} className={muted}/></button>}
              </div>
              <div className="flex gap-2 mt-2 overflow-auto scrollbar-hide pb-1">
                {(['All','Receivable','Payable','Overdue'] as Filter[]).map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border ${filter===f?'bg-[#0e8a5a] text-white border-[#0e8a5a]': dark?'bg-white/10 text-white/70 border-white/10':'bg-[#f2f7f4] text-[#6b7c77] border-[#e0ece6]'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-auto px-3 py-2 space-y-2 pb-20 scrollbar-hide">
              {filtered.map((c,i)=>(
                <div key={c.id}>
                  <button onClick={()=>{setSelectedId(c.id);setDetailTab('txns');navigateTo('customer-detail')}} className={`w-full text-left flex items-center gap-3 p-3 rounded-[14px] border ${card} hover:shadow-md transition card-press`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[11px]" style={{background:c.color}}>{c.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-bold truncate ${dark?'text-white':''}`}>{c.name}</p>
                      <p className="text-[10px] text-[#6b7c77]">{c.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[12px] font-extrabold ${c.balance>0?'text-emerald-600':c.balance<0?'text-red-500':'text-[#6b7c77]'}`}>{c.balance===0?'₹0':formatINR(Math.abs(c.balance))}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${c.balance>0?'bg-emerald-100 text-emerald-700':c.balance<0?'bg-red-100 text-red-600':'bg-gray-100 text-gray-600'}`}>{c.balance>0?'Receivable':c.balance<0?'Payable':'Settled'}</span>
                    </div>
                    <ChevronRight size={14} className="text-[#6b7c77] shrink-0" />
                  </button>
                  {i===2 && (
                    <div className={`${card} border rounded-[12px] p-3 mt-2 flex flex-col items-center justify-center bg-gradient-to-r from-[#e6f3ec] via-white to-[#e6f3ec] text-center`}>
                      <p className="text-[8px] font-bold tracking-widest text-[#6b7c77]">NATIVE AD</p>
                      <p className="text-[9px] text-[#0e8a5a] font-mono">Native_hisabjob • 7712871386</p>
                      <p className="text-[10px] font-bold mt-1">HisabJod Pro — Unlock premium</p>
                      <button onClick={()=>showRewardedAd(()=>showToast('Pro unlocked!'))} className="mt-2 px-3 py-1 rounded-full bg-[#0e8a5a] text-white text-[9px] font-bold">Watch Rewarded Ad</button>
                    </div>
                  )}
                </div>
              ))}
              {filtered.length===0 && (
                <div className="flex flex-col items-center py-8">
                  <img src="/illustrations/08-no-customers.png" alt="No Customers" className="w-40 h-40 object-contain" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                  <p className="text-[13px] font-bold mt-3">No Customers Yet</p>
                  <p className="text-[11px] text-[#6b7c77] text-center">Add your first customer<br/>to start your khata</p>
                  <button onClick={()=>setShowAddCust(true)} className="mt-3 px-4 py-2 rounded-full bg-[#0e8a5a] text-white text-[11px] font-bold">Add Customer</button>
                  <p className="text-[9px] text-[#6b7c77] mt-2">Illustration 08 • Save as 08-no-customers.png</p>
                </div>
              )}
            </div>
            <button onClick={()=>setShowAddCust(true)} className="absolute bottom-20 right-4 w-12 h-12 rounded-full bg-[#0e8a5a] text-white flex items-center justify-center shadow-lg">
              <Plus size={22} />
            </button>
          </div>
        )}

        {/* ===== CUSTOMER DETAIL ===== */}
        {view==='customer-detail' && (
          <div className="page-enter flex-1 overflow-auto scrollbar-hide pb-6">
            <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b ${dark?'bg-[#111d18] border-white/10':'bg-white border-[#e0ece6]'}`}>
              <button onClick={()=>goBack()} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark?'bg-white/10':'bg-[#f2f7f4]'}`}><ArrowLeft size={16}/></button>
              <div className="flex items-center gap-2">
                <button onClick={shareKhataViaWhatsApp} className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center" title="Share Khata on WhatsApp"><Share2 size={14}/></button>
                <button onClick={()=>showToast('More options coming soon')} className={muted}><MoreHorizontal size={18}/></button>
              </div>
            </div>
            <div className="flex flex-col items-center pt-4 px-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-[18px]" style={{background:selected.color}}>{selected.initials}</div>
              <h3 className={`text-[16px] font-extrabold mt-2 ${dark?'text-white':''}`}>{selected.name}</h3>
              <p className="text-[11px] text-[#6b7c77] flex items-center gap-1"><Phone size={12}/>{selected.phone}</p>
              {selected.village && <p className="text-[11px] text-[#6b7c77] flex items-center gap-1"><MapPin size={12}/>{selected.village}</p>}
              <span className="mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">{selected.balance>0?'Receivable':selected.balance<0?'Payable':'Settled'}</span>
              <button onClick={()=>{ if(navigator.share) navigator.share({title:selected.name, text:`Contact ${selected.name} ${selected.phone}`}).catch(()=>{}) ; else { navigator.clipboard.writeText(selected.phone); showToast('Phone copied')}}} className="mt-2 text-[11px] font-bold text-[#0e8a5a] flex items-center gap-1"><Phone size={12}/> Call / Share</button>
            </div>
            <div className="grid grid-cols-4 gap-2 px-4 mt-4">
              {[
                {label:'Give', icon:ArrowUpRight, bg:'bg-[#0e8a5a]', c:'text-white', act:()=>{setTxnType('give');navigateTo('add-transaction')}},
                {label:'Receive', icon:ArrowDownLeft, bg:'bg-[#ef4444]', c:'text-white', act:()=>{setTxnType('receive');navigateTo('add-transaction')}},
                {label:'Remind', icon:Bell, bg: dark?'bg-white/10':'bg-[#e0f2fe]', c: dark?'text-white':'text-[#0284c7]', act:()=>{
                  setReminders(r=>[...r,{id:'r'+Date.now(), name:selected.name, amount:Math.abs(selected.balance)||1000, due:'Due Today', status:'Upcoming'}]); showToast('Reminder set for '+selected.name); navigateTo('reminders')
                }},
                {label:'Edit', icon:Pencil, bg: dark?'bg-white/10':'bg-[#f2f7f4]', c: dark?'text-white':'text-[#6b7c77]', act:()=>openEdit()},
              ].map(b=>(
                <button key={b.label} onClick={b.act} className="flex flex-col items-center gap-1">
                  <div className={`w-12 h-12 rounded-[12px] ${b.bg} ${b.c} flex items-center justify-center`}><b.icon size={16}/></div>
                  <span className={`text-[10px] font-semibold ${dark?'text-white':''}`}>{b.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 mt-4">
              <div className={`${card} border rounded-[12px] p-2 text-center`}>
                <p className="text-[9px] text-[#6b7c77] font-semibold">Total Given</p>
                <p className="text-[12px] font-extrabold text-red-500">{formatINR(selected.totalGiven)}</p>
              </div>
              <div className={`${card} border rounded-[12px] p-2 text-center`}>
                <p className="text-[9px] text-[#6b7c77] font-semibold">Total Received</p>
                <p className="text-[12px] font-extrabold text-emerald-600">{formatINR(selected.totalReceived)}</p>
              </div>
              <div className="bg-[#0e8a5a] rounded-[12px] p-2 text-center text-white">
                <p className="text-[9px] font-semibold opacity-80">Outstanding</p>
                <p className="text-[12px] font-extrabold">{formatINR(Math.abs(selected.balance))}</p>
              </div>
            </div>
            <div className={`flex gap-6 px-4 mt-5 border-b text-[11px] font-bold ${dark?'border-white/10':'border-[#e0ece6]'}`}>
              <button onClick={()=>setDetailTab('txns')} className={`pb-2 border-b-2 ${detailTab==='txns'?'border-[#0e8a5a] text-[#0e8a5a]':'border-transparent '+muted}`}>Transactions</button>
              <button onClick={()=>setDetailTab('details')} className={`pb-2 border-b-2 ${detailTab==='details'?'border-[#0e8a5a] text-[#0e8a5a]':'border-transparent '+muted}`}>Details</button>
              <button onClick={()=>setDetailTab('notes')} className={`pb-2 border-b-2 ${detailTab==='notes'?'border-[#0e8a5a] text-[#0e8a5a]':'border-transparent '+muted}`}>Notes</button>
            </div>
            {detailTab==='txns' && (
              <div className="px-4 mt-3 space-y-3">
                {['Today','Yesterday'].map(group=>{
                  const list = txns.filter(t=>t.customerId===selected.id && t.dateLabel===group)
                  return (
                    <div key={group}>
                      <p className={`text-[10px] font-bold ${muted} flex items-center gap-1`}><span className="w-1.5 h-1.5 rounded-full bg-[#0e8a5a]" />{group} {list.length?`(${list.length})`:''}</p>
                      <div className="mt-2 space-y-2">
                        {list.map(t=>(
                          <div key={t.id} className={`${card} border rounded-[12px] p-3 flex items-center gap-3`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type==='received'?'bg-emerald-100 text-emerald-600':'bg-red-100 text-red-500'}`}>
                              {t.type==='received'?<ArrowDownLeft size={14}/>:<ArrowUpRight size={14}/>}
                            </div>
                            <div className="flex-1">
                              <p className={`text-[11px] font-bold ${dark?'text-white':''}`}>{t.type==='received'?'Received':'Given'} {t.note?`• ${t.note}`:''}</p>
                              <p className="text-[10px] text-[#6b7c77]">{t.method} • {t.time}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-[11px] font-extrabold ${t.type==='received'?'text-emerald-600':'text-red-500'}`}>{formatINR(t.amount)}</p>
                              <p className="text-[9px] text-[#6b7c77]">Bal: {formatINR(t.bal)}</p>
                            </div>
                          </div>
                        ))}
                        {list.length===0 && <p className="text-[10px] text-[#6b7c77] py-1">No transactions</p>}
                      </div>
                    </div>
                  )
                })}
                {txns.filter(t=>t.customerId===selected.id).length===0 && (
                  <div className="flex flex-col items-center py-6">
                    <img src="/illustrations/09-no-transactions.png" alt="No Transactions" className="w-32 h-32 object-contain" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                    <p className="text-[11px] font-bold mt-2">No Transactions Yet</p>
                    <p className="text-[10px] text-[#6b7c77]">Tap Give or Receive to add</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={()=>{setTxnType('give'); navigateTo('add-transaction')}} className="px-4 py-2 rounded-full bg-[#0e8a5a] text-white text-[10px] font-bold">Give</button>
                      <button onClick={()=>{setTxnType('receive'); navigateTo('add-transaction')}} className="px-4 py-2 rounded-full bg-[#f97316] text-white text-[10px] font-bold">Receive</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {detailTab==='details' && (
              <div className="px-4 mt-4 space-y-3">
                <div className={`${card} border rounded-[12px] p-3`}>
                  <p className="text-[11px] font-bold">Customer Info</p>
                  <div className="mt-2 space-y-2 text-[11px]">
                    <div className="flex justify-between"><span className={muted}>Name</span><span className="font-bold">{selected.name}</span></div>
                    <div className="flex justify-between"><span className={muted}>Phone</span><span className="font-bold">{selected.phone}</span></div>
                    <div className="flex justify-between"><span className={muted}>Village</span><span className="font-bold">{selected.village||'-'}</span></div>
                    <div className="flex justify-between"><span className={muted}>Balance</span><span className={`font-bold ${selected.balance>=0?'text-emerald-600':'text-red-500'}`}>{formatINR(selected.balance)}</span></div>
                  </div>
                  <button onClick={openEdit} className="mt-3 w-full py-2 rounded-full bg-[#0e8a5a] text-white font-bold text-[11px]">Edit Details</button>
                  <button onClick={()=>{
                    if(confirm(`Delete ${selected.name}?`)){ setCustomers(p=>p.filter(c=>c.id!==selectedId)); setTxns(p=>p.filter(t=>t.customerId!==selectedId)); navigateTo('customers'); showToast('Customer deleted')}
                  }} className="mt-2 w-full py-2 rounded-full border border-red-200 text-red-600 font-bold text-[11px] flex items-center justify-center gap-1"><Trash2 size={12}/> Delete Customer</button>
                </div>
              </div>
            )}
            {detailTab==='notes' && (
              <div className="px-4 mt-4">
                <div className={`${card} border rounded-[12px] p-3`}>
                  <p className="text-[11px] font-bold">Notes for {selected.name}</p>
                  <textarea value={notesDraft} onChange={e=>setNotesDraft(e.target.value)} placeholder="Add notes..." className={`mt-2 w-full h-24 rounded-[10px] border p-2 text-[11px] outline-none ${inputBg}`} />
                  <button onClick={saveNotes} className="mt-2 w-full py-2 rounded-full bg-[#0e8a5a] text-white font-bold text-[11px] flex items-center justify-center gap-1"><Save size={12}/> Save Notes</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ADD TRANSACTION ===== */}
        {view==='add-transaction' && (
          <div className="page-enter flex-1 flex flex-col overflow-hidden">
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${dark?'bg-[#111d18] border-white/10':'bg-white border-[#e0ece6]'}`}>
              <button onClick={()=>goBack()} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark?'bg-white/10':'bg-[#f2f7f4]'}`}><ArrowLeft size={16}/></button>
              <h2 className={`text-[14px] font-bold ${dark?'text-white':''}`}>Add Transaction</h2>
            </div>
            <div className="flex-1 overflow-auto scrollbar-hide">
              <div className={`${card} border mx-3 mt-3 rounded-[12px] p-3 flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[11px]" style={{background:selected.color}}>{selected.initials}</div>
                <div className="flex-1">
                  <p className={`text-[12px] font-bold ${dark?'text-white':''}`}>{selected.name}</p>
                  <p className="text-[10px] text-[#6b7c77]">{selected.phone}</p>
                  <p className="text-[10px] text-[#6b7c77]">Current Due: <span className="font-bold text-[#0e8a5a]">{formatINR(Math.abs(selected.balance))}</span></p>
                </div>
                <button onClick={()=>setShowChangeCust(true)} className="text-[11px] font-bold text-[#0e8a5a]">Change</button>
              </div>
              <div className="grid grid-cols-2 gap-2 px-3 mt-3">
                <button onClick={()=>setTxnType('give')} className={`py-2.5 rounded-full font-bold text-[12px] flex items-center justify-center gap-1.5 border ${txnType==='give'?'bg-[#0e8a5a] text-white border-[#0e8a5a]':'bg-white text-[#6b7c77] border-[#e0ece6] dark:bg-white/10 dark:text-white/70 dark:border-white/10'}`}>
                  <ArrowUpRight size={14}/> Give
                </button>
                <button onClick={()=>setTxnType('receive')} className={`py-2.5 rounded-full font-bold text-[12px] flex items-center justify-center gap-1.5 border ${txnType==='receive'?'bg-[#0e8a5a] text-white border-[#0e8a5a]':'bg-white text-[#6b7c77] border-[#e0ece6] dark:bg-white/10 dark:text-white/70 dark:border-white/10'}`}>
                  <ArrowDownLeft size={14}/> Receive
                </button>
              </div>
              <div className="flex justify-center mt-2">
                <img src={txnType==='give' ? "/illustrations/04-give.png" : "/illustrations/05-receive.png"} alt={txnType} className="w-28 h-28 object-contain" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              </div>
              <div className="px-4 mt-4 flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className={`text-[28px] font-extrabold ${dark?'text-white':''}`}>₹</span>
                  <span className={`text-[28px] font-extrabold ${amount?'':'opacity-30'} ${dark?'text-white':''}`}>{amount||'0'}</span>
                </div>
                <button onClick={()=>showToast('Calculator coming soon')} className={`w-8 h-8 rounded border flex items-center justify-center ${dark?'border-white/10':'border-[#e0ece6] bg-white'}`}><Grid3X3 size={14} className={muted}/></button>
              </div>
              {amount && <p className="px-4 text-[10px] text-[#6b7c77]">New balance: <span className="font-bold text-[#0e8a5a]">{formatINR(txnType==='give'? selected.balance+Number(amount||0) : selected.balance-Number(amount||0))}</span> {txnType==='give'?'(you gave)':'(you received)'}</p>}
              <div className="grid grid-cols-3 gap-2 px-3 mt-3">
                {['1','2','3','4','5','6','7','8','9','.','0','del'].map(k=>(
                  <button key={k} onClick={()=>handleKey(k)} className={`${dark?'bg-white/10 text-white border-white/10':'bg-white border-[#e0ece6]'} border rounded-[10px] py-3 font-bold text-[16px] flex items-center justify-center active:bg-[#0e8a5a] active:text-white`}>
                    {k==='del'? <X size={16}/>: k}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1.5 px-3 mt-4">
                {[
                  {label:'Cash', icon:Wallet},
                  {label:'UPI', icon:Smartphone},
                  {label:'Bank', icon:Landmark},
                  {label:'Card', icon:CreditCard},
                  {label:'Other', icon:MoreHorizontal},
                ].map(m=>(
                  <button key={m.label} onClick={()=>setMethod(m.label)} className={`flex flex-col items-center gap-1 py-2 rounded-[10px] border text-[10px] font-bold ${method===m.label? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : dark?'bg-white/5 border-white/10 text-white/70':'bg-white border-[#e0ece6] text-[#6b7c77]'}`}>
                    <m.icon size={16} />{m.label}
                  </button>
                ))}
              </div>
              <div className="px-3 mt-3 space-y-2">
                <div className={`flex items-center gap-2 rounded-[10px] border px-3 py-2.5 ${inputBg}`}>
                  <StickyNote size={14} className={muted}/>
                  <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (Optional)" className="flex-1 bg-transparent outline-none text-[11px]" />
                </div>
                <label className={`flex items-center gap-2 rounded-[10px] border px-3 py-2.5 ${inputBg}`}>
                  <Calendar size={14} className={muted}/>
                  <span className="flex-1 text-[11px] font-medium">Date</span>
                  <input type="date" value={txnDateISO} onChange={e=>{setTxnDateISO(e.target.value); const d=new Date(e.target.value); setTxnDate(d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}))}} className="bg-transparent outline-none text-[11px] font-bold" />
                </label>
              </div>
              <div className="p-3">
                <button onClick={saveTxn} disabled={!amount} className="w-full bg-[#0e8a5a] disabled:opacity-40 text-white rounded-full py-3 font-bold text-[13px] shadow-md">Save Transaction</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== RECEIPT ===== */}
        {view==='receipt' && (
          <div className="flex-1 overflow-auto scrollbar-hide bg-[#f2f7f4] dark:bg-[#0b1411]">
            <div className={`flex items-center justify-between px-4 py-3 border-b ${dark?'bg-[#111d18] border-white/10 text-white':'bg-white border-[#e0ece6]'}`}>
              <button onClick={()=>goBack()} className={`flex items-center gap-2 text-[14px] font-bold`}><ArrowLeft size={16}/> Receipt</button>
              <button onClick={shareReceiptViaWhatsApp} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark?'bg-white/10':'bg-[#f2f7f4]'}`}><Share2 size={14}/></button>
            </div>
            <div className="p-4">
              <div className={`rounded-[16px] border p-5 ${dark?'bg-[#18251f] border-white/10':'bg-white border-[#e0ece6]'} shadow-sm`}>
                <div className="flex flex-col items-center">
                  <img src="/hisabjod-logo-original.png" alt="HisabJod" className="w-16 h-16 object-contain rounded-[12px] bg-white p-1 border border-[#e0ece6]" />
                  <h3 className={`text-[14px] font-extrabold mt-2 ${dark?'text-white':''}`}>HisabJod</h3>
                  <p className="text-[10px] text-[#6b7c77]">Digital Khata</p>
                  <p className={`mt-2 text-[11px] font-extrabold tracking-widest ${dark?'text-white':''}`}>TRANSACTION RECEIPT</p>
                  <div className="w-full h-px border-t border-dashed border-[#cfe3d9] my-3" />
                </div>
                {(() => {
                  const t = lastTxn || txns[0]; if(!t) return <p className="text-center text-[11px] text-[#6b7c77]">No transaction</p>
                  const prevBal = t.bal + (t.type==='given'? -t.amount : t.amount)
                  const rows:[string,string][] = [
                    ['Customer', t.name],
                    ['Date', txnDate+' , 10:30 AM'],
                    ['Transaction ID','TXN00'+t.id.slice(-3)],
                    ['Type', t.type==='received'?'Received':'Given'],
                    ['Amount', formatINR(t.amount)],
                    ['Payment Method', t.method],
                    ['Previous Balance', formatINR(prevBal)],
                    ['Remaining Balance', formatINR(t.bal)],
                  ]
                  return (
                    <div className="space-y-2.5">
                      {rows.map(([k,v])=>(
                        <div key={k} className="flex justify-between text-[11px]">
                          <span className="text-[#6b7c77]">{k}</span>
                          <span className={`font-bold ${k==='Type' ? (t.type==='received'?'text-emerald-600':'text-red-500') : dark?'text-white':'text-[#14201c]'} ${k==='Type'?'px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px]':''}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                <div className="flex flex-col items-center mt-6">
                  <Leaf size={22} className="text-[#0e8a5a]" />
                  <p className={`text-[12px] font-bold mt-1 ${dark?'text-white':''}`}>Thank you!</p>
                  <p className="text-[10px] text-[#0e8a5a] font-semibold">आपल्या विश्वासाबद्दल धन्यवाद!</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={shareReceiptViaWhatsApp} className="py-3 rounded-full border bg-white dark:bg-white/10 dark:text-white dark:border-white/10 font-bold text-[12px] flex items-center justify-center gap-1.5 border-[#0e8a5a] text-[#0e8a5a]"><Share2 size={14}/> Share on WhatsApp</button>
                <button onClick={makePdf} className="py-3 rounded-full bg-[#0e8a5a] text-white font-bold text-[12px] flex items-center justify-center gap-1.5"><Download size={14}/> Save PDF</button>
              </div>
              <p className="text-[9px] text-center text-[#6b7c77] mt-2">Free: uses Web Share API + `wa.me` — no backend, no cost. On phone pick WhatsApp from share sheet to send PDF.</p>
            </div>
          </div>
        )}

        {/* ===== REPORTS ===== */}
        {view==='reports' && (()=> {
          const monthLabel = new Date(reportMonth+'-01').toLocaleDateString('en-IN',{month:'long', year:'numeric'})
          const monthTxns = txns.filter(t=> t.dateISO.startsWith(reportMonth))
          const monthGiven = monthTxns.filter(t=>t.type==='given').reduce((s,t)=>s+t.amount,0)
          const monthReceived = monthTxns.filter(t=>t.type==='received').reduce((s,t)=>s+t.amount,0)
          const buckets = Array.from({length:6},(_,bi)=>{
            const start=bi*5+1, end=bi===5?31: (bi+1)*5
            const inBucket=monthTxns.filter(t=>{
              const d=new Date(t.dateISO).getDate()
              return d>=start && d<=end
            })
            return {
              label: bi===5? `${start}-31` : `${start}-${end}`,
              given: inBucket.filter(t=>t.type==='given').reduce((s,t)=>s+t.amount,0),
              received: inBucket.filter(t=>t.type==='received').reduce((s,t)=>s+t.amount,0),
            }
          })
          const maxBucket = Math.max(1, ...buckets.map(b=> Math.max(b.given,b.received)))
          return (
          <div className="page-enter flex-1 overflow-auto scrollbar-hide pb-20">
            <div className={`sticky top-0 z-10 px-4 py-3 border-b flex items-center justify-between ${dark?'bg-[#111d18] border-white/10':'bg-white border-[#e0ece6]'} relative overflow-hidden`}>
              <img src="/illustrations/02-analytics.png" alt="" className="absolute -top-1 -right-2 w-16 h-16 opacity-[0.06] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <h2 className={`text-[14px] font-extrabold ${dark?'text-white':''} relative`}>Reports</h2>
              <div className="flex items-center gap-2 relative">
                <button onClick={shareReportViaWhatsApp} className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center" title="Share Report on WhatsApp"><Share2 size={14}/></button>
                <button onClick={()=>setShowMonthPicker(true)} className={`px-2 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 ${dark?'bg-white/10 border-white/10 text-white':'bg-[#f2f7f4] border-[#e0ece6]'}`}>{monthLabel} <ChevronDown size={12}/></button>
              </div>
            </div>
            <div className="px-4 pt-3">
              <div className="grid grid-cols-3 gap-2">
                <div className={`${card} border rounded-[12px] p-2 text-center`}>
                  <p className="text-[9px] font-semibold text-[#6b7c77]">Given ({monthLabel.split(' ')[0]})</p>
                  <p className="text-[13px] font-extrabold text-[#3b82f6]">{formatINR(monthGiven)}</p>
                  <p className="text-[8px] text-[#6b7c77]">{monthTxns.filter(t=>t.type==='given').length} txns</p>
                </div>
                <div className={`${card} border rounded-[12px] p-2 text-center`}>
                  <p className="text-[9px] font-semibold text-[#6b7c77]">Received ({monthLabel.split(' ')[0]})</p>
                  <p className="text-[13px] font-extrabold text-emerald-600">{formatINR(monthReceived)}</p>
                  <p className="text-[8px] text-[#6b7c77]">{monthTxns.filter(t=>t.type==='received').length} txns</p>
                </div>
                <div className={`${card} border rounded-[12px] p-2 text-center`}>
                  <p className="text-[9px] font-semibold text-[#6b7c77]">Outstanding</p>
                  <p className="text-[13px] font-extrabold text-orange-600">{formatINR(outstandingAll)}</p>
                  <p className="text-[8px] text-[#6b7c77]">All time</p>
                </div>
              </div>
              <div className={`${card} border rounded-[14px] p-3 mt-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[9px] font-bold">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Given</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"/> Received</span>
                  </div>
                  <span className="text-[9px] text-[#6b7c77]">{monthLabel} • {monthTxns.length} txns</span>
                </div>
                {monthTxns.length===0 ? (
                  <div className="flex flex-col items-center py-6">
                    <img src="/illustrations/11-reports.png" alt="No Reports" className="w-32 h-32 object-contain" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                    <p className="text-[11px] font-bold mt-2">No data for {monthLabel}</p>
                    <p className="text-[10px] text-[#6b7c77]">Add transactions in this month</p>
                  </div>
                ) : (
                <div className="flex items-end gap-1 h-24 mt-3">
                  {buckets.map((b,i)=>(
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-0.5 justify-center items-end h-20">
                        <div className="flex-1 bg-emerald-500 rounded-t transition-all" style={{height: `${Math.max(4, (b.given/maxBucket)*72)}px`}} title={`Given ${formatINR(b.given)}`} />
                        <div className="flex-1 bg-red-400 rounded-t transition-all" style={{height: `${Math.max(4, (b.received/maxBucket)*72)}px`}} title={`Received ${formatINR(b.received)}`} />
                      </div>
                      <span className="text-[7px] text-[#6b7c77] font-medium">{b.label}</span>
                    </div>
                  ))}
                </div>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <button onClick={customerReportPdf} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-blue-600 bg-blue-50"><Users size={14}/></div>
                  <div className="flex-1"><p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Customer Report</p><p className="text-[10px] text-[#6b7c77]">{customers.length} customers</p></div>
                  <ChevronRight size={14} className="text-[#6b7c77]" />
                </button>
                <button onClick={()=>{ customerReportPdf(); showToast('Monthly report same as customer report')}} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-purple-600 bg-purple-50"><BarChart3 size={14}/></div>
                  <div className="flex-1"><p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Monthly Report</p><p className="text-[10px] text-[#6b7c77]">Income, expense and balance</p></div>
                  <ChevronRight size={14} className="text-[#6b7c77]" />
                </button>
                <button onClick={()=>{
                  const methods=['Cash','UPI','Bank','Card','Other']
                  let msg='Payment modes:\n'+methods.map(m=> `${m}: ${formatINR(txns.filter(t=>t.method===m).reduce((s,t)=>s+t.amount,0))}`).join('\n')
                  alert(msg)
                }} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-orange-600 bg-orange-50"><Wallet size={14}/></div>
                  <div className="flex-1"><p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Payment Mode Report</p><p className="text-[10px] text-[#6b7c77]">Cash, UPI, Bank, Card</p></div>
                  <ChevronRight size={14} className="text-[#6b7c77]" />
                </button>
                <button onClick={exportCSV} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-emerald-600 bg-emerald-50"><Download size={14}/></div>
                  <div className="flex-1"><p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Export Reports</p><p className="text-[10px] text-[#6b7c77]">PDF / CSV / Excel</p></div>
                  <ChevronRight size={14} className="text-[#6b7c77]" />
                </button>
              </div>
            </div>
          </div>
        ) })()}

        {/* ===== BACKUP ===== */}
        {view==='backup' && (
          <div className="page-enter flex-1 overflow-auto scrollbar-hide pb-6">
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${dark?'bg-[#111d18] border-white/10':'bg-white border-[#e0ece6]'} relative overflow-hidden`}>
              <img src="/illustrations/10-backup.png" alt="" className="absolute -top-1 -right-2 w-14 h-14 opacity-[0.07] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <button onClick={()=>goBack()} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark?'bg-white/10':'bg-[#f2f7f4]'} relative`}><ArrowLeft size={16}/></button>
              <h2 className={`text-[14px] font-bold ${dark?'text-white':''} relative`}>Backup & Restore</h2>
            </div>
            <div className="px-4 pt-6 flex flex-col items-center">
              <img src="/illustrations/10-backup.png" alt="Backup" className="w-32 h-32 object-contain" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <div className="w-12 h-12 rounded-[14px] bg-emerald-100 flex items-center justify-center text-emerald-700 mt-2"><Shield size={20}/></div>
              <h3 className={`text-[13px] font-extrabold mt-2 ${dark?'text-white':''}`}>Keep your data safe</h3>
              <p className="text-[10px] text-[#6b7c77] text-center mt-1">All your data stays on your device.<br/>No cloud, no login, no server.</p>
            </div>
            <div className="px-4 mt-5 space-y-2">
              <button onClick={exportBackup} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><CloudDownload size={14}/></div>
                <div className="flex-1"><p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Create Backup</p><p className="text-[10px] text-[#6b7c77]">Export all data to a JSON file</p></div>
                <ChevronRight size={14} className="text-[#6b7c77]"/>
              </button>
              <button onClick={()=>fileRef.current?.click()} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Upload size={14}/></div>
                <div className="flex-1"><p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Restore Backup</p><p className="text-[10px] text-[#6b7c77]">Import data from a backup file</p></div>
                <ChevronRight size={14} className="text-[#6b7c77]"/>
              </button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importBackup} />
              <div className={`${card} border rounded-[12px] p-3 flex items-center gap-3`}>
                <div className="flex-1">
                  <p className={`text-[11px] font-bold ${dark?'text-white':''}`}>Last Backup</p>
                  <p className="text-[10px] text-[#6b7c77]">{lastBackup}</p>
                  <p className="text-[10px] text-[#6b7c77]">{customers.length} customers • {txns.length} transactions</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Check size={12}/></div>
              </div>
              <div className="flex gap-2 items-center p-3 rounded-[12px] bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0"><Info size={12}/></div>
                <p className="text-[10px] leading-tight text-blue-900 dark:text-blue-200"><span className="font-bold">Your data is 100% local</span><br/>Keep regular backups for safety.</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== APP LOCK ===== */}
        {view==='applock' && (
          <div className="page-enter flex-1 flex flex-col overflow-hidden">
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${dark?'bg-[#111d18] border-white/10':'bg-white border-[#e0ece6]'} relative overflow-hidden`}>
              <img src="/illustrations/12-secure-offline.png" alt="" className="absolute -top-1 -right-2 w-14 h-14 opacity-[0.07] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <button onClick={()=>goBack()} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark?'bg-white/10':'bg-[#f2f7f4]'} relative`}><ArrowLeft size={16}/></button>
              <h2 className={`text-[14px] font-bold ${dark?'text-white':''} relative`}>App Lock</h2>
            </div>
            <div className="flex-1 overflow-auto scrollbar-hide px-6 pt-6 flex flex-col items-center">
              <img src="/illustrations/12-secure-offline.png" alt="Secure Offline" className="w-28 h-28 object-contain" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg mt-2"><Lock size={22}/></div>
              <h3 className={`text-[13px] font-extrabold mt-3 ${dark?'text-white':''}`}>Keep Your Data Private</h3>
              <p className="text-[10px] text-[#6b7c77]">Set a PIN or use biometric lock</p>
              <div className={`flex p-1 rounded-full border mt-4 ${dark?'bg-white/10 border-white/10':'bg-[#f2f7f4] border-[#e0ece6]'}`}>
                <button onClick={()=>setPinMode('pin')} className={`px-6 py-1.5 rounded-full text-[11px] font-bold ${pinMode==='pin'?'bg-[#0e8a5a] text-white':'text-[#6b7c77]'}`}>PIN Lock</button>
                <button onClick={()=>setPinMode('bio')} className={`px-6 py-1.5 rounded-full text-[11px] font-bold ${pinMode==='bio'?'bg-[#0e8a5a] text-white':'text-[#6b7c77]'}`}>Biometric</button>
              </div>
              {pinMode==='pin' ? (
                <>
                  <p className="text-[10px] font-bold text-[#6b7c77] mt-6">Enter 4-digit PIN {storedPin && `(current: ••••)`}</p>
                  <div className="flex gap-2 mt-2">
                    {[0,1,2,3].map(i=>(
                      <div key={i} className={`w-3 h-3 rounded-full ${i < pin.length ? 'bg-[#0e8a5a]' : 'bg-[#dce8e0] dark:bg-white/20'}`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-6 w-[180px]">
                    {['1','2','3','4','5','6','7','8','9'].map(n=>(
                      <button key={n} onClick={()=> pin.length<4 && setPin(p=>p+n)} className={`h-11 rounded-[10px] border font-bold ${dark?'bg-white/10 border-white/10 text-white':'bg-white border-[#e0ece6]'}`}>{n}</button>
                    ))}
                    <button onClick={()=>{
                      if(storedPin){ setStoredPin(''); setLockEnabled(false); showToast('Lock disabled'); setPin('') } else showToast('Use PIN keypad')
                    }} className={`h-11 rounded-[10px] border flex items-center justify-center ${dark?'bg-white/10 border-white/10':'bg-white border-[#e0ece6]'} text-[#6b7c77]`}><Fingerprint size={16}/></button>
                    <button onClick={()=> pin.length<4 && setPin(p=>p+'0')} className={`h-11 rounded-[10px] border font-bold ${dark?'bg-white/10 border-white/10 text-white':'bg-white border-[#e0ece6]'}`}>0</button>
                    <button onClick={()=>setPin(p=>p.slice(0,-1))} className={`h-11 rounded-[10px] border flex items-center justify-center ${dark?'bg-white/10 border-white/10':'bg-white border-[#e0ece6]'}`}><Trash2 size={16} className={muted}/></button>
                  </div>
                  <div className="flex gap-2 mt-4 w-full">
                    <button onClick={()=>{ setPin(''); setStoredPin(''); setLockEnabled(false); showToast('Lock disabled') }} className={`flex-1 py-2 rounded-full border font-bold text-[11px] ${dark?'border-white/10 text-white':'border-[#e0ece6] text-[#6b7c77]'}`}>Disable</button>
                    <button onClick={handleSavePin} className="flex-1 bg-[#0e8a5a] text-white rounded-full py-2 font-bold text-[11px]">Save PIN</button>
                  </div>
                  <p className="text-[10px] text-[#6b7c77] mt-2 text-center">App will ask PIN on next launch if enabled</p>
                </>
              ) : (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-white/10 flex items-center justify-center text-emerald-600"><Fingerprint size={36}/></div>
                  <p className="text-[11px] text-[#6b7c77] text-center">Place your finger on the sensor to enable biometric unlock</p>
                  <button onClick={()=>{setStoredPin('bio'); setLockEnabled(true); showToast('Biometric enabled')}} className="px-6 py-2 rounded-full bg-[#0e8a5a] text-white font-bold text-[11px]">Enable Biometric</button>
                  <p className="text-[10px] text-[#6b7c77]">Stored as biometric flag • no PIN needed</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== SETTINGS ===== */}
        {view==='settings' && (
          <div className="page-enter flex-1 overflow-auto scrollbar-hide pb-20">
            <div className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b ${dark?'bg-[#111d18] border-white/10':'bg-white border-[#e0ece6]'} relative overflow-hidden`}>
              <img src="/illustrations/12-secure-offline.png" alt="" className="absolute -top-1 -right-2 w-14 h-14 opacity-[0.06] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <h2 className={`text-[14px] font-extrabold ${dark?'text-white':''} relative`}>Settings</h2>
            </div>
            <div className="px-3 pt-3 space-y-1.5">
              <button onClick={()=>setShowBiz(true)} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-emerald-600 bg-emerald-50"><Building2 size={14}/></div>
                <span className={`flex-1 text-[11px] font-bold ${dark?'text-white':''}`}>Business Profile</span>
                <span className="text-[10px] text-[#6b7c77] truncate max-w-[90px]">{bizName}</span>
                <ChevronRight size={14} className="text-[#6b7c77]" />
              </button>
              <button onClick={()=>setShowLang(true)} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-blue-600 bg-blue-50"><Globe size={14}/></div>
                <span className={`flex-1 text-[11px] font-bold ${dark?'text-white':''}`}>Language</span>
                <span className="text-[10px] text-[#6b7c77] font-semibold">{lang}</span>
                <ChevronRight size={14} className="text-[#6b7c77]" />
              </button>
              <button onClick={()=>{setDark(v=>!v); showToast(dark?'Light mode':'Dark mode')}} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-orange-500 bg-orange-50">{dark?<Moon size={14}/>:<Sun size={14}/>}</div>
                <span className={`flex-1 text-[11px] font-bold ${dark?'text-white':''}`}>Theme</span>
                <span className="text-[10px] text-[#6b7c77] font-semibold">{dark?'Dark':'System (Light)'}</span>
                <ChevronRight size={14} className="text-[#6b7c77]" />
              </button>
              {[
                {label:'Notifications', icon:Bell, color:'text-red-500 bg-red-50', action:()=>navigateTo('reminders')},
                {label:'App Lock', icon:Lock, color:'text-emerald-700 bg-emerald-50', action:()=>navigateTo('applock')},
                {label:'Backup & Restore', icon:CloudDownload, color:'text-emerald-600 bg-emerald-50', action:()=>navigateTo('backup')},
                {label:'Import / Export', icon:Repeat, color:'text-teal-600 bg-teal-50', action:()=>navigateTo('backup')},
                {label:'Manage Businesses', icon:Briefcase, color:'text-amber-600 bg-amber-50', action:()=>showToast('Manage Businesses: multiple khata coming soon')},
                {label:'Help & Support', icon:HelpCircle, color:'text-blue-500 bg-blue-50',
                action:()=>{ window.open('mailto:supportbreakouttrade@gmail.com?subject=HisabJod%20Support','_blank'); showToast('supportbreakouttrade@gmail.com') }},
                {label:'About - Privacy', icon:Info, color:'text-slate-600 bg-slate-100', action:()=>alert('HisabJod v1.0\nOffline • Secure • No cloud\nMade for small businesses in India.')},
              ].map(r=>(
                <button key={r.label} onClick={r.action} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border ${card} text-left`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${r.color}`}><r.icon size={14}/></div>
                  <span className={`flex-1 text-[11px] font-bold ${dark?'text-white':''}`}>{r.label}</span>
                  <ChevronRight size={14} className="text-[#6b7c77]" />
                </button>
              ))}
              <div className="flex items-center justify-between py-3 px-1">
                <span className="text-[10px] text-[#6b7c77]">Dark mode</span>
                <button onClick={()=>{setDark(v=>!v); showToast(dark?'Light mode':'Dark mode')}} className={`w-11 h-6 rounded-full p-0.5 flex transition ${dark?'bg-[#0e8a5a] justify-end':'bg-[#dce8e0] justify-start'}`}>
                  <span className="w-5 h-5 rounded-full bg-white shadow flex items-center justify-center">{dark?<Moon size={12}/>:<Sun size={12}/>}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== REMINDERS ===== */}
        {view==='reminders' && (
          <div className="page-enter flex-1 flex flex-col overflow-hidden">
            <div className={`flex items-center justify-between px-4 py-3 border-b ${dark?'bg-[#111d18] border-white/10':'bg-white border-[#e0ece6]'} relative overflow-hidden`}>
              <img src="/illustrations/06-reminders.png" alt="" className="absolute -top-1 -right-10 w-16 h-16 opacity-[0.07] pointer-events-none" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
              <div className="flex items-center gap-2 relative">
                <button onClick={()=>goBack()} className={`w-8 h-8 rounded-full flex items-center justify-center ${dark?'bg-white/10':'bg-[#f2f7f4]'}`}><ArrowLeft size={16}/></button>
                <h2 className={`text-[14px] font-bold ${dark?'text-white':''}`}>Reminders</h2>
              </div>
              <button onClick={()=>showToast('Reminders: tap Remind to send WhatsApp')} className="relative"><Bell size={16} className={muted} /></button>
            </div>
            <div className="flex gap-2 px-4 py-2">
              {(['Upcoming','Overdue','Completed'] as ReminderTab[]).map(t=>(
                <button key={t} onClick={()=>setReminderTab(t)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${reminderTab===t?'bg-[#0e8a5a] text-white border-[#0e8a5a]': dark?'bg-white/10 text-white/70 border-white/10':'bg-[#f2f7f4] text-[#6b7c77] border-[#e0ece6]'}`}>{t}</button>
              ))}
            </div>
            <div className="flex-1 overflow-auto px-3 space-y-2 pb-20 scrollbar-hide">
              {reminders.filter(r=>r.status===reminderTab).map(r=>(
                <div key={r.id} className={`${card} border rounded-[12px] p-3 flex items-center gap-3`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.status==='Overdue'?'bg-red-100 text-red-600': r.type==='rent'?'bg-blue-100 text-blue-600':'bg-orange-100 text-orange-500'}`}><Bell size={14}/></div>
                  <div className="flex-1">
                    <p className={`text-[11px] font-bold ${dark?'text-white':''}`}>{r.name}</p>
                    <p className={`text-[11px] font-extrabold ${r.type==='rent'?'text-[#6b7c77]':'text-[#0e8a5a]'}`}>{formatINR(r.amount)}</p>
                    <p className="text-[10px] text-[#6b7c77]">{r.due}</p>
                  </div>
                  {r.status!=='Completed' ? (
                    <button onClick={()=>{
                      if(r.type==='rent'){ showToast('Rent reminder added'); return }
                      const c=customers.find(x=>x.name===r.name); const phone=c?.phone||''; const msg=`Hi ${r.name}, reminder: ${formatINR(r.amount)} due. - HisabJod`
                      if(phone) window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank')
                      setReminders(prev=>prev.map(x=>x.id===r.id? {...x, status:'Completed' as const}:x)); showToast('Reminder sent & completed')
                    }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${r.type==='rent'?'bg-white text-[#0e8a5a] border-[#0e8a5a]':'bg-[#0e8a5a] text-white border-[#0e8a5a]'}`}>{r.type==='rent'?'Add':'Remind'}</button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Done</span>
                  )}
                </div>
              ))}
              {reminders.filter(r=>r.status===reminderTab).length===0 && (
                <div className="flex flex-col items-center py-8">
                  <img src="/illustrations/06-reminders.png" alt="No Reminders" className="w-36 h-36 object-contain" onError={e=>{ (e.target as HTMLImageElement).style.display='none' }} />
                  <p className="text-[11px] font-bold mt-2">No {reminderTab} reminders</p>
                  <p className="text-[10px] text-[#6b7c77]">You&apos;re all caught up!</p>
                </div>
              )}
            </div>
            <button onClick={()=>setShowAddReminder(true)} className="absolute bottom-20 right-4 w-11 h-11 rounded-full bg-[#0e8a5a] text-white flex items-center justify-center shadow-lg"><Plus size={18}/></button>
          </div>
        )}

        {/* ===== BOTTOM NAV ===== */}
        {view!=='splash' && view!=='applock' && view!=='add-transaction' && view!=='receipt' && (
          <nav className={`absolute bottom-0 left-0 right-0 h-[64px] border-t flex items-center justify-around px-2 ${dark?'bg-[#111d18] border-white/10':'bg-white border-[#dce8e0]'}`}>
            {[
              {id:'home', label:'Home', icon:Home},
              {id:'customers', label:'Customers', icon:Users},
              {id:'add', label:'', icon:Plus, fab:true},
              {id:'reports', label:'Reports', icon:BarChart3},
              {id:'settings', label:'More', icon:MoreHorizontal},
            ].map(item=>{
              const active = view===item.id || (view==='customer-detail' && item.id==='customers') || (view==='reminders' && item.id==='settings') || (view==='backup' && item.id==='settings')
              if((item as any).fab) return (
                <button key={item.id} onClick={()=>{if(customers.length===0) setShowAddCust(true); else navigateTo('add-transaction')}} className="w-11 h-11 rounded-full bg-[#0e8a5a] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(14,138,90,.4)] -mt-2">
                  <Plus size={20} />
                </button>
              )
              return (
                <button key={item.id} onClick={()=>navigateTo(item.id as View)} className={`flex flex-col items-center gap-0.5 min-w-[52px] ${active?'text-[#0e8a5a]':'text-[#6b7c77]'}`}>
                  <item.icon size={18} strokeWidth={active?2.4:1.8} />
                  <span className={`text-[9px] ${active?'font-extrabold':'font-medium'}`}>{item.label}</span>
                </button>
              )
            })}
          </nav>
        )}

        {/* ===== MODALS ===== */}
        {showAddCust && (
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setShowAddCust(false)}>
            <div onClick={e=>e.stopPropagation()} className={`w-full sm:max-w-[380px] rounded-t-[18px] sm:rounded-[18px] p-5 ${dark?'bg-[#18251f] text-white':'bg-white'}`}>
              <div className="flex justify-between items-center"><h3 className="font-extrabold text-[14px]">Add Customer</h3><button onClick={()=>setShowAddCust(false)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"><X size={14}/></button></div>
              <div className="mt-4 space-y-3">
                <input value={newCust.name} onChange={e=>setNewCust(v=>({...v,name:e.target.value}))} placeholder="Name *" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <input value={newCust.phone} onChange={e=>setNewCust(v=>({...v,phone:e.target.value}))} placeholder="Mobile (+91...)" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <input value={newCust.village} onChange={e=>setNewCust(v=>({...v,village:e.target.value}))} placeholder="Village / City (optional)" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <button onClick={addCustomer} className="w-full bg-[#0e8a5a] text-white rounded-full py-2.5 font-bold text-[13px]">Save Customer</button>
              </div>
            </div>
          </div>
        )}
        {showEditCust && (
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setShowEditCust(false)}>
            <div onClick={e=>e.stopPropagation()} className={`w-full sm:max-w-[380px] rounded-t-[18px] sm:rounded-[18px] p-5 ${dark?'bg-[#18251f] text-white':'bg-white'}`}>
              <div className="flex justify-between items-center"><h3 className="font-extrabold text-[14px]">Edit Customer</h3><button onClick={()=>setShowEditCust(false)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"><X size={14}/></button></div>
              <div className="mt-4 space-y-3">
                <input value={editCust.name} onChange={e=>setEditCust(v=>({...v,name:e.target.value}))} placeholder="Name *" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <input value={editCust.phone} onChange={e=>setEditCust(v=>({...v,phone:e.target.value}))} placeholder="Mobile" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <input value={editCust.village} onChange={e=>setEditCust(v=>({...v,village:e.target.value}))} placeholder="Village / City" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <button onClick={saveEditCustomer} className="w-full bg-[#0e8a5a] text-white rounded-full py-2.5 font-bold text-[13px]">Update</button>
              </div>
            </div>
          </div>
        )}
        {showBiz && (
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setShowBiz(false)}>
            <div onClick={e=>e.stopPropagation()} className={`w-full sm:max-w-[380px] rounded-t-[18px] sm:rounded-[18px] p-5 ${dark?'bg-[#18251f] text-white':'bg-white'}`}>
              <div className="flex justify-between items-center"><h3 className="font-extrabold text-[14px]">Business Profile</h3><button onClick={()=>setShowBiz(false)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"><X size={14}/></button></div>
              <div className="mt-4 space-y-3">
                <input value={bizName} onChange={e=>setBizName(e.target.value)} placeholder="Business name" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <input value={bizPhone} onChange={e=>setBizPhone(e.target.value)} placeholder="Phone" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <button onClick={()=>{setShowBiz(false); showToast('Business profile saved')}} className="w-full bg-[#0e8a5a] text-white rounded-full py-2.5 font-bold text-[13px]">Save</button>
              </div>
            </div>
          </div>
        )}
        {showLang && (
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setShowLang(false)}>
            <div onClick={e=>e.stopPropagation()} className={`w-full sm:max-w-[380px] rounded-t-[18px] sm:rounded-[18px] p-5 ${dark?'bg-[#18251f] text-white':'bg-white'}`}>
              <h3 className="font-extrabold text-[14px]">Choose Language</h3>
              <div className="mt-3 space-y-2">
                {(['English','मराठी','हिंदी'] as Lang[]).map(l=>(
                  <button key={l} onClick={()=>{setLang(l); setShowLang(false); showToast(`Language: ${l}`)}} className={`w-full flex justify-between items-center p-3 rounded-[12px] border ${lang===l?'bg-[#0e8a5a] text-white border-[#0e8a5a]':'bg-[#f2f7f4] border-[#e0ece6] text-[#6b7c77] dark:bg-white/5 dark:text-white/70 dark:border-white/10'}`}>
                    <span className="font-bold text-[13px]">{l}</span>{lang===l && <Check size={14}/>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {showChangeCust && (
          <div className="absolute inset-0 z-50 bg-black/40 flex flex-col justify-end sm:justify-center p-0 sm:p-4" onClick={()=>setShowChangeCust(false)}>
            <div onClick={e=>e.stopPropagation()} className={`w-full sm:max-w-[380px] max-h-[70vh] overflow-auto rounded-t-[18px] sm:rounded-[18px] p-4 ${dark?'bg-[#18251f] text-white':'bg-white'}`}>
              <div className="flex justify-between items-center"><h3 className="font-extrabold text-[14px]">Select Customer</h3><button onClick={()=>setShowChangeCust(false)}><X size={16}/></button></div>
              <div className="mt-3 space-y-2">
                {customers.map(c=>(
                  <button key={c.id} onClick={()=>{setSelectedId(c.id); setShowChangeCust(false); showToast(`Selected ${c.name}`)}} className={`w-full flex items-center gap-3 p-3 rounded-[12px] border text-left ${selectedId===c.id?'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800':'bg-[#f2f7f4] border-[#e0ece6] dark:bg-white/5 dark:border-white/10'}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[11px]" style={{background:c.color}}>{c.initials}</div>
                    <div><p className="text-[12px] font-bold">{c.name}</p><p className="text-[10px] text-[#6b7c77]">{c.phone}</p></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {showAddReminder && (
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setShowAddReminder(false)}>
            <div onClick={e=>e.stopPropagation()} className={`w-full sm:max-w-[380px] rounded-t-[18px] sm:rounded-[18px] p-5 ${dark?'bg-[#18251f] text-white':'bg-white'}`}>
              <div className="flex justify-between items-center"><h3 className="font-extrabold text-[14px]">Add Reminder</h3><button onClick={()=>setShowAddReminder(false)} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"><X size={14}/></button></div>
              <div className="mt-4 space-y-3">
                <input value={newReminder.name} onChange={e=>setNewReminder(v=>({...v,name:e.target.value}))} placeholder="Customer / Title" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <input value={newReminder.amount} onChange={e=>setNewReminder(v=>({...v,amount:e.target.value.replace(/\D/g,'')}))} placeholder="Amount" type="text" className={`w-full rounded-[10px] border px-3 py-2.5 text-[12px] outline-none ${inputBg}`} />
                <button onClick={handleAddReminder} className="w-full bg-[#0e8a5a] text-white rounded-full py-2.5 font-bold text-[13px]">Add Reminder</button>
              </div>
            </div>
          </div>
        )}
        {showRatePrompt && (
          <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className={`w-full max-w-[320px] rounded-[18px] p-5 text-center ${dark?'bg-[#18251f] text-white':'bg-white'}`}>
              <p className="text-[18px]">⭐⭐⭐⭐⭐</p>
              <h3 className="font-extrabold text-[14px] mt-2">Enjoying HisabJod?</h3>
              <p className="text-[11px] text-[#6b7c77] mt-1">Rate us on Play Store — helps dukandars like you find us</p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={()=>{setShowRatePrompt(false); localStorage.setItem('hisabjod-rated','later'); showToast('Thanks!')}} className={`py-2 rounded-full border font-bold text-[11px] ${dark?'border-white/10 text-white':'border-[#e0ece6] text-[#6b7c77]'}`}>Later</button>
                <button onClick={()=>{setShowRatePrompt(false); localStorage.setItem('hisabjod-rated','yes'); window.open('https://play.google.com/store/apps/details?id=com.hisabjod.digitalkhata','_blank'); showToast('Thanks for rating!')}} className="py-2 rounded-full bg-[#0e8a5a] text-white font-bold text-[11px]">Rate Now</button>
              </div>
            </div>
          </div>
        )}

        <div className="h-1" />
      </div>
    </div>
  )
}
