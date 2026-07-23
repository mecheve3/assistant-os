import { supabase } from "@/lib/supabase";
import { GroceriesWidget } from "@/components/life/GroceriesWidget";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const { data: groceryItems } = await supabase
    .from("grocery_items")
    .select("*")
    .order("category")
    .order("sort_order");

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">
          Home &amp; Daily Life
        </p>
        <h1 className="text-xl font-semibold text-bright">Groceries</h1>
      </div>

      <GroceriesWidget
        initialItems={
          (groceryItems ?? []) as {
            id: number;
            name: string;
            category: string;
            category_emoji: string | null;
            sort_order: number;
            is_permanent: boolean;
            is_default: boolean;
            checked: boolean;
          }[]
        }
      />
    </div>
  );
}
