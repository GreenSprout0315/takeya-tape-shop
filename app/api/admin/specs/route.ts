import { NextResponse } from "next/server";
import { ALL_SPECS, CATEGORY_META } from "@/lib/product-master";

/** GET /api/admin/specs — 全商品スペック一覧（価格設定UI用） */
export async function GET() {
  const specs = ALL_SPECS.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    categoryLabel: CATEGORY_META[s.category].label,
    wholesalePrice: s.wholesalePrice,
  }));
  return NextResponse.json(specs);
}
