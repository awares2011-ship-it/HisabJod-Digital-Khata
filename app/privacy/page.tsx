import Link from 'next/link'

export const metadata = { title: 'Privacy Policy - HisabJod', description: 'HisabJod Privacy Policy - Offline, no data collection' }

export default function Privacy(){
  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#14201c] p-6 max-w-[800px] mx-auto">
      <Link href="/" className="text-[11px] font-bold text-[#0e8a5a]">← Back to HisabJod</Link>
      <h1 className="text-[22px] font-extrabold mt-3 text-[#0e8a5a]">HisabJod: Digital Khata - Privacy Policy</h1>
      <p className="text-[11px] text-[#6b7c77] mt-1">Effective 23 Sep 2026 • com.hisabjod.digitalkhata • supportbreakouttrade@gmail.com</p>
      <div className="mt-6 space-y-4 text-[12px] leading-relaxed">
        <p><strong>Offline-first:</strong> All data stays on device via localStorage. No cloud, no login.</p>
        <h2 className="font-bold text-[13px] mt-4">Permissions</h2>
        <ul className="list-disc ml-5">
          <li>Storage — save backup/PDF to Documents</li>
          <li>Notifications — daily 9 AM overdue (optional)</li>
          <li>Share — wa.me WhatsApp, system share</li>
        </ul>
        <h2 className="font-bold text-[13px]">Ads</h2>
        <p>AdMob may use device ID. ads.txt: google.com, pub-1607968585289432, DIRECT, f08c47fec0942fa0</p>
        <h2 className="font-bold text-[13px]">Contact</h2>
        <p><a href="mailto:supportbreakouttrade@gmail.com" className="text-[#0e8a5a] font-bold">supportbreakouttrade@gmail.com</a></p>
      </div>
      <p className="mt-8 text-[10px] text-[#6b7c77]">© 2026 HisabJod. Made for small businesses in India.</p>
    </div>
  )
}
