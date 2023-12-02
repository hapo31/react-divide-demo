import { ReactNode, useMemo, useState } from "react";
import styles from "./list.module.css";

type Column<T, Key extends keyof T> = {
  key: Key;
  r: (value: T[Key], record: T) => ReactNode;
  w?: string;
};

type Props<T> = {
  data: T[];
  columns: { [title: string]: Column<T, keyof T> };
};

export default function List<T>({ columns, data }: Props<T>) {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(5);

  const sliced = useMemo(
    () => data.slice(page * pageSize, (page + 1) * pageSize),
    [data, page, pageSize]
  );

  const colStyle = useMemo(
    () =>
      Object.values(columns)
        .map(({ w }) => `${w ?? "75px"}`)
        .join(" "),
    [columns]
  );

  const headers = useMemo(
    () =>
      Object.keys(columns).map((title, index) => (
        <div className={styles.th} key={`header-${index}`}>
          {title}
        </div>
      )),
    [columns]
  );

  const rows = useMemo(() => {
    const cols = Object.values(columns) as Column<T, keyof T>[];
    return sliced.map((item, index) =>
      cols.map(({ key, r }, colIndex) => (
        <div
          className={styles.td}
          key={`row-${index}-${colIndex}-${key as string}`}
        >
          {r(item[key], item)}
        </div>
      ))
    );
  }, [columns, sliced]);

  return (
    <div>
      <div className={styles.pagination}>
        <button onClick={() => setPage((prev) => (prev > 0 ? prev - 1 : 0))}>
          &lt;
        </button>
        <span>{page + 1}</span>
        <button
          onClick={() =>
            setPage((prev) =>
              prev + 1 < data.length / pageSize ? prev + 1 : prev
            )
          }
        >
          &gt;
        </button>
      </div>
      <div
        className={styles.tableContainer}
        style={{
          gridTemplateColumns: colStyle,
        }}
      >
        {headers}
        {rows}
      </div>
    </div>
  );
}
