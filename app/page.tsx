"use client";

import { cities } from "@/src/store/weather";
import { useRecoilValueLoadable } from "recoil";

import styles from "./page.module.css";
import List from "@/src/components/List";
import WeatherInfo from "@/app/_components/WeatherInfo";
import { Suspense } from "react";

export default function Home() {
  const citiesLoadable = useRecoilValueLoadable(cities);

  return (
    <div>
      <header className={styles.copyright}>
        Powered by{" "}
        <a
          href="https://weather.tsukumijima.net/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline" }}
        >
          © 2020 - 2023 天気予報 API（livedoor 天気互換）
        </a>
      </header>

      <main className={styles.main}>
        <h2>お天気デモアプリ</h2>
        {citiesLoadable.state === "hasValue" ? (
          <List
            data={citiesLoadable.contents}
            columns={{
              地点: {
                key: "id",
                r: (value) => (
                  <Suspense fallback="...">
                    <WeatherInfo.City cityId={value} />
                  </Suspense>
                ),
                w: "200px",
              },
              都市: {
                key: "title",
                r: (value) => value,
              },
              天気: {
                key: "id",
                r: (value) => (
                  <Suspense fallback="...">
                    <WeatherInfo.Icon cityId={value} />
                  </Suspense>
                ),
                w: "100px",
              },
              詳細: {
                key: "id",
                r: (value) => (
                  <Suspense fallback="...">
                    <WeatherInfo.Description cityId={value} />
                  </Suspense>
                ),
                w: "500px",
              },
            }}
          />
        ) : (
          <div>Loading...</div>
        )}
      </main>
    </div>
  );
}
