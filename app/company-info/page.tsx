import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "事業者情報 | 株式会社竹谷商事",
  description:
    "株式会社竹谷商事の事業者情報・販売条件・送料・納期に関するご案内。",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-2 md:gap-8 py-5 border-b border-gray-200">
      <dt className="text-xs tracking-widest uppercase text-gray-500 pt-1">
        {label}
      </dt>
      <dd className="text-sm text-[#1C3557] leading-relaxed">{children}</dd>
    </div>
  );
}

export default function CompanyInfoPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-xs tracking-[0.4em] uppercase text-[#E07B2A] mb-3">
          Company Info
        </p>
        <h1 className="text-3xl font-light tracking-wide text-[#1C3557]">
          事業者情報
        </h1>
        <p className="text-gray-500 text-sm mt-3">
          本サイトは事業者（法人・個人事業主）向けの識別テープ販売サイトです。
          一般消費者への通信販売は行っておりません。
        </p>
      </div>

      <dl className="mt-4">
        <Row label="販売事業者">株式会社 竹谷商事</Row>
        <Row label="代表者">代表取締役 土井 康裕</Row>
        <Row label="所在地">
          〒545-0032
          <br />
          大阪府大阪市阿倍野区晴明通2-20
        </Row>
        <Row label="電話番号">
          TEL: 06-6661-6946
          <br />
          FAX: 06-6661-7416
          <br />
          （受付時間: 平日 9:00〜17:00）
        </Row>
        <Row label="メール">s_miyamoto@greensprout0315.com</Row>
        <Row label="事業内容">
          識別テープ・ナンバーテープ・斜線入り識別テープ等の製造・販売、
          測量機器および関連機器の販売
        </Row>
        <Row label="取扱商品">
          識別テープ（厚み0.08〜0.2mm、幅15〜50mm、長さ50m/100m）
          <br />
          ナンバーテープ（ミシン目入り、1〜1000・A〜J）
          <br />
          斜線入り識別テープ（お取引先様向け特別ライン）
        </Row>
        <Row label="販売価格">
          各商品ページに税抜価格を表示しております。価格は予告なく改定する場合がございます。
          <br />
          正式な金額は発注時に自動発行される見積書にてご確認ください。
        </Row>
        <Row label="商品代金以外の料金">
          消費税（10%）、送料、決済手数料（銀行振込手数料はお客様ご負担）。
        </Row>
        <Row label="送料・配送">
          全国発送対応。
          <br />
          <strong className="text-[#E07B2A]">ご注文金額 30,000円（税抜）以上で送料無料</strong>。
          <br />
          30,000円未満の場合の送料は、配送先・重量・数量により異なります。詳細は見積書にてご案内いたします。
        </Row>
        <Row label="納期">
          在庫状況により通常2〜7営業日以内に発送いたします。
          <br />
          特殊仕様・大量発注の場合は別途ご相談ください。
        </Row>
        <Row label="お支払方法">
          銀行振込（請求書発行後、指定日までにお振込みください）。
          <br />
          既存お取引先様には従来の取引条件を適用いたします。
        </Row>
        <Row label="支払時期">商品発送後に請求書を発行いたします。</Row>
        <Row label="返品・交換">
          商品の性質上、お客様都合による返品・交換はお受けできません。
          <br />
          商品に不良・誤送品がある場合は、商品到着後7日以内にご連絡ください。
          良品と交換、または代金を返金いたします。
        </Row>
        <Row label="お問い合わせ">
          <a
            href="/contact"
            className="text-[#E07B2A] hover:underline"
          >
            お問い合わせフォーム
          </a>
          よりご連絡ください。
        </Row>
      </dl>

      <p className="text-xs text-gray-400 mt-10 leading-relaxed">
        ※ 本サイトは事業者間取引（BtoB）を目的としており、特定商取引法に基づく通信販売には該当いたしませんが、
        同法が定める情報を参考として掲載しております。
      </p>
    </div>
  );
}
