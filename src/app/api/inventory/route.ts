import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Missing date." },
      { status: 400 }
    );
  }

  const { data: inventory, error } = await supabase
    .from("daily_inventory")
    .select("id, inventory_date")
    .eq("inventory_date", date)
    .single();

  if (error || !inventory) {
    return NextResponse.json({ data: null });
  }

  const { data: items, error: itemsError } = await supabase
    .from("inventory_items")
    .select(
      "id, decision, notes, opportunity:opportunity_id (id, title, company, location, url, source, status)"
    )
    .eq("inventory_id", inventory.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { inventory, items: items ?? [] } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const limit = Number(url.searchParams.get("limit") ?? 20);

  if (!date) {
    return NextResponse.json(
      { error: "Missing date." },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("daily_inventory")
    .select("id")
    .eq("inventory_date", date)
    .single();

  if (existing?.id) {
    return NextResponse.json({ data: existing, alreadyExists: true });
  }

  const { data: inventory, error: inventoryError } = await supabase
    .from("daily_inventory")
    .insert({ inventory_date: date })
    .select("id, inventory_date")
    .single();

  if (inventoryError || !inventory) {
    return NextResponse.json(
      { error: inventoryError?.message ?? "Failed to create inventory." },
      { status: 500 }
    );
  }

  const { data: opportunities, error: opportunitiesError } = await supabase
    .from("opportunities")
    .select("id")
    .eq("status", "New")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opportunitiesError) {
    return NextResponse.json(
      { error: opportunitiesError.message },
      { status: 500 }
    );
  }

  const itemsPayload = (opportunities ?? []).map((opp) => ({
    inventory_id: inventory.id,
    opportunity_id: opp.id,
    decision: "Pending",
  }));

  if (itemsPayload.length) {
    const { error: itemsInsertError } = await supabase
      .from("inventory_items")
      .insert(itemsPayload);

    if (itemsInsertError) {
      return NextResponse.json(
        { error: itemsInsertError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ data: inventory, created: true });
}
