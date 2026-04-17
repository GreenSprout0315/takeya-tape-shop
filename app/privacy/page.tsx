import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | 株式会社竹谷商事",
  description:
    "株式会社竹谷商事における個人情報の取扱いに関する基本方針。",
};

function Section({
  no,
  title,
  children,
}: {
  no: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-sm tracking-widest uppercase text-[#E07B2A] mb-3">
        {String(no).padStart(2, "0")}
      </h2>
      <h3 className="text-xl font-light text-[#1C3557] mb-4">{title}</h3>
      <div className="text-sm text-gray-700 leading-loose space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">
          Privacy Policy
        </p>
        <h1 className="text-3xl font-light tracking-wide text-[#1C3557]">
          プライバシーポリシー
        </h1>
        <p className="text-gray-500 text-sm mt-3">
          株式会社竹谷商事（以下「当社」といいます）は、お客様の個人情報の保護を重要な責務と認識し、
          個人情報の保護に関する法律その他関係法令を遵守し、以下のとおり適切に取り扱います。
        </p>
      </div>

      <Section no={1} title="取得する個人情報">
        当社は、本サイトのご利用、お問い合わせ、発注、お見積依頼等に際し、
        以下の個人情報を取得する場合があります。
        <ul className="list-disc pl-6 space-y-1">
          <li>会社名、ご担当者氏名</li>
          <li>メールアドレス、電話番号</li>
          <li>配送先郵便番号・住所</li>
          <li>発注内容・希望納期・備考</li>
          <li>ログイン情報（認証に用いる情報のみ）</li>
        </ul>
      </Section>

      <Section no={2} title="個人情報の利用目的">
        取得した個人情報は、以下の目的のためにのみ利用いたします。
        <ul className="list-disc pl-6 space-y-1">
          <li>ご注文いただいた商品の発送・見積書および請求書の発行</li>
          <li>お問い合わせへの回答・商品案内</li>
          <li>アフターサービス、不具合時のご連絡</li>
          <li>新商品・サービスに関するお知らせ</li>
          <li>法令に基づく対応</li>
        </ul>
      </Section>

      <Section no={3} title="個人情報の第三者提供">
        当社は、以下のいずれかに該当する場合を除き、
        お客様の同意なく第三者に個人情報を提供することはありません。
        <ul className="list-disc pl-6 space-y-1">
          <li>法令に基づく場合</li>
          <li>人の生命・身体または財産の保護のために必要であって、本人の同意を得ることが困難である場合</li>
          <li>国または地方公共団体等が法令の定める事務を遂行することに協力する必要がある場合</li>
          <li>配送業務、請求書発行等の業務遂行に必要な範囲で委託先に提供する場合（この場合、適切な監督を行います）</li>
        </ul>
      </Section>

      <Section no={4} title="個人情報の安全管理">
        当社は、お客様からお預かりした個人情報の漏洩、滅失、毀損等の防止のため、
        合理的な安全管理措置を講じます。
        また、個人情報を取り扱う従業者に対して、適切な教育を実施します。
      </Section>

      <Section no={5} title="開示・訂正・削除等のご請求">
        お客様ご本人から、個人情報の開示・訂正・追加・削除・利用停止等のご請求があった場合は、
        ご本人であることを確認のうえ、法令の定めるところにより、速やかに対応いたします。
        ご請求は下記お問い合わせ窓口までご連絡ください。
      </Section>

      <Section no={6} title="Cookieおよびアクセス解析">
        本サイトではサービス向上のため、Cookieおよびサーバーログによるアクセス解析を行う場合があります。
        これらには個人を特定する情報は含まれておりません。
      </Section>

      <Section no={7} title="お問い合わせ窓口">
        個人情報の取扱いに関するお問い合わせは、以下までご連絡ください。
        <div className="mt-3 p-5 bg-gray-50 border border-gray-200 text-sm text-[#1C3557] leading-relaxed">
          株式会社 竹谷商事
          <br />
          〒545-0032 大阪府大阪市阿倍野区晴明通2-20
          <br />
          TEL: 06-6661-6946（平日 9:00〜17:00）
          <br />
          Email: s_miyamoto@greensprout0315.com
        </div>
      </Section>

      <Section no={8} title="プライバシーポリシーの変更">
        本ポリシーの内容は、法令等の改正その他の理由により、
        予告なく変更されることがあります。変更後の内容は本ページに掲載した時点から有効となります。
      </Section>

      <p className="text-xs text-gray-400 mt-12 text-right">
        制定日: 2026年4月17日
      </p>
    </div>
  );
}
