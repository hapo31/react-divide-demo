この記事は [**LipersInSlums Advent Calendar 2023** _スラム社会実装の理論と実践〜もうみんな苦しんでる。苦しんでないのはおまえだけ〜_](https://adventar.org/calendars/9461) の xxx 日目の記事です。

前日の記事は yyy さんの xxx です。

皆さんは2023年もReactで苦しんだわけですが、一番苦しんだことといえばやっぱり非同期処理ではないでしょうか？

優秀なJSON色付け係である皆さんは当然ウェブフロントエンドを作成する際、APIから何かを取ってきて画面に表示するという処理を無限回（高々有限）書かされるわけですが、今日は[そんな皆様のために～](https://www.nicovideo.jp/watch/sm9720246)、  
**React 上でいい感じに非同期処理と付き合い、そして和解するためのテクニック** を紹介します。

# React と非同期処理のつらみ

そもそもなぜ React で非同期処理を扱うのはつらいのでしょうか？

それは React の設計思想そのものにあります。

React は、データから ReactNode を返す **関数** のような存在であるにも関わらず、ここに非同期処理が絡まってくると突然**副作用を考慮しなければならなくなるからです。**

例えば、JSON色付け係の嗜みである WebAPI からのデータを表示するような処理では

データフェッチ開始 → 待機 → 表示 (エラーが発生した場合はエラー表示)

と、1つのデータを表示するために3つ（エラー表示も含めれば4つ！）もの状態を考える必要があるのです。

これを React 上で表現しようとすると、 Promise という優秀な概念が存在しているのにもかかわらず、それらを分解して React 上で表現するという苦行を強いられることになります。

```tsx

function FxxkingUser() {
  const [data, setData] = useState<User>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/sit/user");
      setData(await res.json());
    })();
  }, []);


  return data == null ? (
    <div>loading...</div>
  ) : (
    <div>...</div>
  );
}

```

具合が悪くなってきましたか？なってきたと思います。僕も書いていて手が震えてきました。

幸いなことに、この例では ~~ひたすら手を抜いているので~~ 1度読み込んだデータは二度と再フェッチしないので、特に初期状態というものを考慮する必要はないためかなり軽症で済んでいます。

しかし、ここから例えば「一定時間ごとに一覧をリフレッシュするようにしてほしい」などという戯言が客から飛んで来たらどうしますか？

おそらく以下のようなコードになると思います。

```tsx

function FxxkingUser() {
  const [data, setData] = useState<User>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/sit/user");
      setData(await res.json());
    })();
  }, []);


  return data == null ? (
    <div>loading...</div>
  ) : (
    <div>...</div>
  );
}

```

というわけで、以上の点を前提として以下より話を進めます。

