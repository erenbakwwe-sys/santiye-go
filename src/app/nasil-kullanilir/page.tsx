import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Nasıl kullanılır? | ŞantiyeGO',
  description:
    'ŞantiyeGO adım adım kullanım rehberi: ilan arama, ücretsiz teklif alma, firmayla iletişim ve firma olarak ilan verme.',
};

const buyerSteps = [
  {
    title: 'Ne aradığınızı yazın',
    text: 'Ana sayfanın üstündeki arama kutusuna aradığınız şeyi yazın. Örneğin "ekskavatör", "hazır beton" veya "lowbed". Yanındaki kutuya ilinizi ya da ilçenizi yazıp listeden seçin, ardından turuncu "İlan ara" düğmesine basın.',
    tip: 'Ne arayacağınızdan emin değilseniz ana sayfadaki "Ne yapmak istiyorsunuz?" kutularından size uyana dokunmanız yeterli.',
  },
  {
    title: 'İlanları inceleyin',
    text: 'Çıkan listede her ilanın fotoğrafını, fiyatını, yerini ve firmanın adını görürsünüz. Bir ilanın ayrıntısını görmek için üzerine dokunun. Beğendiğiniz ilanı daha sonra bulmak için kalp işaretine basarak favorilerinize ekleyebilirsiniz.',
  },
  {
    title: 'Ücretsiz fiyat teklifi isteyin',
    text: 'Tek bir firmaya değil, birden fazla firmaya sormak isterseniz "Ücretsiz teklif al" sayfasını kullanın. Neye, ne zaman ve nerede ihtiyacınız olduğunu yazın. Talebiniz bölgenizdeki uygun firmalara iletilir.',
    tip: 'Teklif istemek ücretsizdir ve sizi hiçbir firmayla anlaşmaya zorlamaz.',
  },
  {
    title: 'Teklifleri karşılaştırın',
    text: 'Gelen teklifleri "Hesabım → Taleplerim" sayfasında yan yana görürsünüz. Size uygun olanı "Kabul et" düğmesiyle seçin; uymayanları reddedebilirsiniz.',
  },
  {
    title: 'Firmayla anlaşın',
    text: 'Teklifi kabul ettiğinizde ya da firma rezervasyonunuzu onayladığında, firmanın telefon numarası size açılır. Ondan önce de site üzerinden "Mesajlar" bölümünden firmaya yazabilirsiniz.',
  },
];

const companySteps = [
  {
    title: 'Firma hesabı açın',
    text: '"Firmayım, ilan vermek istiyorum" bölümünden ya da sayfanın üstündeki "Üye ol" bağlantısından firma hesabı açın. Firma adınızı, vergi numaranızı ve telefonunuzu girmeniz yeterlidir. Hesap açmak ücretsizdir.',
  },
  {
    title: 'İlanınızı verin',
    text: 'Turuncu "İlan Ver" düğmesine basın. Makinenizin ya da ürününüzün türünü seçin, fotoğrafını ekleyin, fiyatını ve bulunduğu yeri yazın.',
    tip: 'Net fotoğraf ve açık fiyat yazılan ilanlar çok daha fazla ilgi görür.',
  },
  {
    title: 'Gelen talepleri yanıtlayın',
    text: 'Bölgenizde sizin işinize uyan bir teklif talebi açıldığında size bildirim gelir. "Firma Paneli → Talepler" sayfasından talebi okuyup fiyatınızı gönderin.',
  },
  {
    title: 'Rezervasyonları ve takviminizi yönetin',
    text: 'Gelen kiralama rezervasyonlarını "Firma Paneli → Rezervasyonlar" sayfasından onaylayın veya reddedin. Onayladığınız günler takviminize otomatik işlenir; böylece aynı güne ikinci kez kiralanmazsınız.',
  },
];

const faqs = [
  {
    q: 'Siteyi kullanmak ücretli mi?',
    a: 'İlanlara bakmak, teklif istemek ve firmalarla mesajlaşmak ücretsizdir. Firmaların hesap açması ve ilan vermesi de ücretsizdir.',
  },
  {
    q: 'Üye olmadan kullanabilir miyim?',
    a: 'İlanlara üye olmadan bakabilirsiniz. Teklif istemek, mesaj yazmak, rezervasyon yapmak ve favori eklemek için ücretsiz bir hesap açmanız gerekir.',
  },
  {
    q: 'Firmanın telefon numarasını neden hemen göremiyorum?',
    a: 'Firmaları ve sizi istenmeyen aramalardan korumak için telefon numaraları, teklif kabul edildiğinde veya rezervasyon onaylandığında açılır. O zamana kadar site üzerinden mesajlaşabilirsiniz.',
  },
  {
    q: 'Teklif istedim, ne kadar sürede yanıt gelir?',
    a: 'Bu, bölgenizdeki firmaların yoğunluğuna bağlıdır. Yeni bir teklif geldiğinde size bildirim gönderilir; tekliflerinizi "Hesabım → Taleplerim" sayfasından takip edebilirsiniz.',
  },
  {
    q: 'Şifremi unuttum, ne yapmalıyım?',
    a: 'Giriş sayfasındaki "Şifremi Unuttum?" bağlantısına basın ve e-posta adresinizi yazın. Size şifre yenileme bağlantısı gönderilir.',
  },
  {
    q: 'Yazılar çok küçük geliyor, büyütebilir miyim?',
    a: 'Evet. Bilgisayarda Ctrl tuşuna basılı tutup + tuşuna (Mac\'te Cmd ve +) basarak sayfayı büyütebilirsiniz. Telefonda ise iki parmağınızla ekranı açarak yakınlaştırabilirsiniz.',
  },
];

function StepList({ steps }: { steps: { title: string; text: string; tip?: string }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={s.title} className="bg-white border border-slate-200 rounded-md p-5 sm:p-6 flex gap-4 sm:gap-5">
          <span
            className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500 text-white text-lg sm:text-xl font-semibold flex items-center justify-center"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-navy-900">
              <span className="sr-only">Adım {i + 1}: </span>
              {s.title}
            </h3>
            <p className="mt-2 text-base text-slate-700 leading-relaxed">{s.text}</p>
            {s.tip && (
              <p className="mt-3 text-base text-navy-900 bg-orange-50 border-l-4 border-orange-500 px-4 py-2.5">
                <strong className="font-semibold">İpucu:</strong> {s.tip}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowToUsePage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'destek@santiyego.com';
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-semibold text-navy-900 tracking-tight">Nasıl kullanılır?</h1>
      <p className="mt-3 text-lg text-slate-700 leading-relaxed">
        ŞantiyeGO&apos;yu kullanmak için teknik bilgiye ihtiyacınız yok. Aşağıda adım adım anlattık. Takıldığınız
        yerde sağ alttaki <strong>Yardım</strong> düğmesine basabilirsiniz.
      </p>

      <nav aria-label="Bu sayfada" className="mt-8 grid sm:grid-cols-3 gap-3">
        {[
          ['#alicilar', 'Makine, malzeme veya nakliye arıyorum'],
          ['#firmalar', 'Firmayım, ilan vermek istiyorum'],
          ['#sorular', 'Sık sorulan sorular'],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="flex items-center justify-between gap-3 bg-white border-2 border-slate-200 hover:border-orange-500 rounded-md px-4 py-4 text-base font-medium text-navy-900 transition-colors"
          >
            {label}
            <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
          </a>
        ))}
      </nav>

      <section id="alicilar" className="mt-14 scroll-mt-28">
        <h2 className="text-2xl sm:text-3xl font-semibold text-navy-900">Makine, malzeme veya nakliye arıyorsanız</h2>
        <p className="mt-2 mb-6 text-base text-slate-700">Aradığınızı bulup firmayla anlaşmanız 5 adımda olur.</p>
        <StepList steps={buyerSteps} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/ilanlar" className="btn-primary">
            İlanlara bak <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/teklif-iste" className="btn-secondary">
            Ücretsiz teklif al
          </Link>
        </div>
      </section>

      <section id="firmalar" className="mt-16 scroll-mt-28">
        <h2 className="text-2xl sm:text-3xl font-semibold text-navy-900">Firmaysanız ve ilan vermek istiyorsanız</h2>
        <p className="mt-2 mb-6 text-base text-slate-700">
          Makinenizi, ürününüzü veya aracınızı şantiyelere 4 adımda ulaştırın.
        </p>
        <StepList steps={companySteps} />
        <div className="mt-6">
          <Link href="/kayit?role=company" className="btn-dark">
            Ücretsiz firma hesabı aç <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <section id="sorular" className="mt-16 scroll-mt-28">
        <h2 className="text-2xl sm:text-3xl font-semibold text-navy-900">Sık sorulan sorular</h2>
        <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-4 sm:px-5 py-5 text-lg font-medium text-navy-900 hover:bg-slate-50">
                {f.q}
                <ChevronDown className="w-5 h-5 text-slate-500 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 sm:px-5 pb-5 text-base text-slate-700 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-16 bg-navy-900 text-white rounded-md p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Hâlâ yardıma mı ihtiyacınız var?</h2>
        <p className="mt-2 text-base text-slate-200 leading-relaxed">
          Bize yazın ya da arayın, size adım adım yardımcı olalım.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {supportPhone && (
            <a href={`tel:${supportPhone.replace(/\s/g, '')}`} className="btn-primary">
              Ara: {supportPhone}
            </a>
          )}
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-md border-2 border-white/40 hover:border-white text-white font-semibold transition-colors"
          >
            {supportEmail}
          </a>
        </div>
      </section>
    </div>
  );
}
