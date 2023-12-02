import { NextResponse } from "next/server";
import { WeatherAPIParams } from "../_param";

export async function GET(_request: Request, { params }: WeatherAPIParams) {
  const { ids } = params;

  const res = Object.fromEntries(
    await Promise.all(
      ids.split(",").map((id) =>
        fetch("https://weather.tsukumijima.net/api/forecast/city/" + id)
          .then((r) => r.json())
          .then((r) => [id, r])
      )
    )
  );

  return NextResponse.json(res);
}

export type WeatherDetails = {
  description: {
    text: string;
  };
  forecasts: {
    date: string;
    dateLabel: string;
    telop: string;
    detail: {
      weather: string;
      wind: string;
      wave: string;
    };
    temperature: {
      min: {
        celsius: string | null;
        fahrenheit: string | null;
      };
      max: {
        celsius: string;
        fahrenheit: string;
      };
    };
    chanceOfRain: {
      T00_06: string;
      T06_12: string;
      T12_18: string;
      T18_24: string;
    };
    image: {
      title: string;
      url: string;
      width: number;
      height: number;
    };
  }[];

  location: {
    area: string;
    prefecture: string;
    district: string;
    city: string;
  };
};
