import { NextResponse } from "next/server";
import { parseString } from "xml2js";

import fetch from "node-fetch";
import parseXML from "@/src/util/parseXML";

export type CitySummary = {
  title: string;
  id: string;
};

export async function GET() {
  const res = await fetch(
    "https://weather.tsukumijima.net/primary_area.xml"
  ).then((r) => r.text());

  const parsed = await parseXML(res);

  const response = parsed["rss"]["channel"][0]["ldWeather:source"][0]["pref"]
    .flatMap((r: any) => r.city)
    .map((city: any) => ({
      title: city["$"]["title"],
      id: city["$"]["id"],
    }));

  return NextResponse.json(response);
}
