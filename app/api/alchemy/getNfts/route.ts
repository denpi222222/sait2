import { NextRequest, NextResponse } from "next/server";
import { apeChain } from "@/config/chains";
import { alchemyFetch } from "@/lib/alchemyFetch";
import { z } from "zod";

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");

    if (!owner) {
      return NextResponse.json({ error: "Missing owner parameter" }, { status: 400 });
    }

    // Zod validation
    const Schema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
    const parseResult = Schema.safeParse(owner);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid owner address" }, { status: 400 });
    }

    const ownerAddr = parseResult.data as `0x${string}`;

    // Filter by our CrazyCube collection only
    const contractAddr = apeChain.contracts.crazyCubeNFT.address;

    const queryPath = `/getNFTsForOwner?owner=${ownerAddr}&withMetadata=true&pageSize=100&contractAddresses[]=${contractAddr}`;

    // Use alchemyFetch with automatic key rotation and retry logic
    const alchemyRes = await alchemyFetch('rpc', queryPath, { 
      method: "GET", 
      headers: { accept: "application/json" } 
    });

    if (!alchemyRes.ok) {
      const text = await alchemyRes.text();
      return NextResponse.json({ error: `Alchemy error: ${text}` }, { status: alchemyRes.status });
    }

    const json = await alchemyRes.json();

    return NextResponse.json(json);
  } catch (e) {
    console.error("Alchemy proxy error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 