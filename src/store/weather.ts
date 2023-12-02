import { CitySummary } from "@/app/api/weather/cities/route";
import { selector, selectorFamily } from "recoil";

import Dataloader from "dataloader";
import { WeatherDetails } from "@/app/api/weather/[ids]/route";

export const cities = selector<CitySummary[]>({
  key: "weather/cities",
  get: async () => {
    const res = await fetch("/api/weather/cities");
    return await res.json();
  },
});

export const cityWeather = selectorFamily<WeatherDetails, { cityId: string }>({
  key: "weather/cityWeather",
  get:
    ({ cityId }) =>
    async () => {
      return await cityWeatherDataLoader.load(cityId);
    },
});

const cityWeatherDataLoader = new Dataloader<string, WeatherDetails>(
  async (cityIds: ReadonlyArray<string>) => {
    const res = await fetch(`/api/weather/${cityIds.join(",")}`).then((r) =>
      r.json()
    );

    return cityIds.map((cityId) => res[cityId]);
  }
);
