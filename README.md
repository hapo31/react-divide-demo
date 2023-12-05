この記事は [**LipersInSlums Advent Calendar 2023** _スラム社会実装の理論と実践〜もうみんな苦しんでる。苦しんでないのはおまえだけ〜_](https://adventar.org/calendars/9461) の 6 日目の記事です。

昨日の記事は meloviliju さんの [アークナイツじゃない方の用語集](https://lipersinslums.github.io/posts/slum-glossary) です。

皆さんは2023年もReactで苦しんだわけですが、一番苦しんだことといえばやっぱり非同期処理ではないでしょうか？

優秀なJSON色付け係である皆さんは当然ウェブフロントエンドを作成する際、APIから何かを取ってきて画面に表示するという処理を無限回（高々有限）書かされるわけですが、今日は[そんな皆様のために～](https://www.nicovideo.jp/watch/sm9720246)、  
**React 上でいい感じに非同期処理と付き合い、そして和解するためのテクニック** を紹介します。

# React と非同期処理のつらみ

なぜ React 上で非同期処理を扱うのはつらいのでしょうか？

それは React の設計思想との相性の悪さにあります。

React は、データから ReactNode を返す **関数** のような存在であるにも関わらず、ここに非同期処理が絡まってくると突然**副作用を考慮しなければならなくなるからです。**

例えば、JSON色付け係の嗜みである WebAPI からのデータを表示するような処理では

データフェッチ開始 → 待機 → 表示 (エラーが発生した場合はエラー表示)

と、1つのデータを表示するために3つ（エラー表示も含めれば4つ！）もの状態を考える必要があるのです。

しかし考えてみてください、JavaScript にはもともと Promise という、非同期処理のための便利な概念が存在しているはずです。

にもかかわらず、これを React 上で表現しようとすると、これらをわざわざ分解して表現する苦行を強いられることになります。  
加えて実際には単体のコンポーネントで処理が完結することはなく、取得したデータを更に以下のように props で渡したりしているうちに以下のようなコードになるのではないでしょうか。

```tsx

function FxxkingUserContainer() {
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
    <FuxxkingUserProfile user={data} />
  );
}

```

具合が悪くなってきましたか？なってきたと思います。僕も書いていて手が震えてきました。  
ただでさえ非同期処理で嫌な気持ちになっているところにさらに **propsバケツリレー** をさせられるわけです。  
propsバケツリレーは **データがどこから来ているか、誰がどのデータに依存しているかが分からなくなるため、以後の開発体験を急速に悪化させます。**

とても人間的な所業とは思えません。

出来れば **同期処理と同じように** 以下のような形で、 **欲しいデータはコンポーネント自身で取得するように** 書きたいと思いませんか？

```tsx
function FxxkingUser() {
  const [data] = useSomethingAsyncStore(...);

  return <div>...</div>
}

```

見ているだけで吐き気を催す邪悪な先程のコードと比べ、こちらはいくらか見慣れた形になりました。

この形であれば先程の「非同期処理を意識した条件分岐」と「コンポーネントへデータをバケツリレーする」という邪悪な点を滅ぼすことが出来ます。

(なお、React hooks 自体がキモいと感じる人類は2020年までに絶滅し、一説には Svelte や Vue.js などに移ったと言われています)(妥当だと思います)(ちなみに冗談です)

しかし、果たしてこんなことが可能なのでしょうか？

安心してください、こういった **Render-as-You-Fetch** パターンと呼ばれるスタイルを実現可能にするライブラリは意外とたくさんあります。やはり人類はみんな React でJSONに色付けさせられているんだなぁと思わざるを得ません。  
そして、それらは React 本体の `Suspense` との組み合わせで絶大な効果を発揮します。

なお、Suspense が React 本体に入ってから実はもう3年以上経つ(エビデンスは調べるのがめんどいので各自で調べて)ので、そろそろ「知らない人のために～」なんていう解説は省略します。

というわけで以上の点を前提として、この記事ではこの点をさらに深掘りしていきます。

# \<Suspense\> と Recoil を使って非同期処理と和解せよ

本来であれば **そういうことをするライブラリを作ってみたｗ！** というのがアドカレにおける正しい仕草なのでしょうが、残念ながら執筆時間の都合で本記事では既存のライブラリを扱います。

というわけで今回の記事で使っていく Recoil の紹介です。

https://recoiljs.org/

Recoil はいわゆる「状態管理ライブラリ」の一種ですが、非同期処理もある程度上手く扱える非常に柔軟なライブラリです。

また、このライブラリの特徴である「グローバルなデータを小さく扱うことが出来る」という点が、「コンポーネント自身で必要なデータを取得させる」という目的とよくマッチします。（こちらの使い方については後述します）

何にせよ、まずは recoil の仕組みに非同期処理を乗せるためのコードを示します。

```ts

const userSelector = selector<User>({
  key: "user/userSelector",
  get: async () => {
    const res = fetch("...");
    return await res.json();
  }
});
```

selector は、値を加工して返す Store を定義するための機能です。  
recoil 公式では、 selector を **atom から取得したデータを何か加工して返す** というだけの存在としてかなりぞんざいに扱われている印象がありますが、実は以下のように非同期処理を行って何らかのデータを fetch するような例が紹介されています。

https://recoiljs.org/docs/guides/asynchronous-data-queries/#asynchronous-example

要はこの機能を存分に使っていこうということですが、これは実はかなり強力な仕組みです。

いちおう軽く紹介ですが、この selector は以下のように使うことが出来ます。(詳細は上記公式ドキュメントを見ましょう)

```tsx

function FxxkingUser() {
  const user = useSelector(userSelector);

  return <div>...</div>
}

```

このとき、 `userSelecotr` は **非同期セレクター** として動作するため、非同期処理が解決されるまでの間このコンポーネントは Suspend (中断)されます。  

なので、このコンポーネントは以下のように `<Suspense>` で囲い、レンダリングが **中断** された場合は `fallback` が表示されるようにします。

```tsx
<Suspense fallback={<div>loading...</div>}>
  <FxxkingUser />
</Suspense>
```

`<Suspense>` の話はここでは深掘りしないので、詳細は各自で調べてください。

しかし、このように書けたからといって根本的な解決には一見なっていませんし、ついでに言えばこれだけでは Render-as-You-Fetch パターンでもありません。  
なぜなら、先ほど定義した `userSelector` は、結局 selector をただ単に **簡単に `<Suspense />` が使えるラッパー** として利用してデータを集約しただけに過ぎないからです。  
これだけでは、結局ここで取得したデータを props で各コンポーネントに振り分ける羽目になってしまいます。  

では、Render-as-You-Fetch パターンとは果たしてどのようなものか、また、このパターンに適したデータ設計とはどのような形になるのでしょうか。

# Render-as-You-Fetch パターンでデータを分割統治せよ

分割統治という言葉でもしかしたらピンと来た人もいるかもしれませんが、重要なのは **表示すべきデータを最小限の単位に分割出来ないか** ということです。  

例えば User データを取得する際、エンドポイントから以下のようなごちゃまぜな JSON を取得する事が多いと思います。  

```json

{
  "userId": "xxxxxxxx-xxxxxxx-xxxx-xxxx",
  "profile": {
    "iconUrl": "path/to/cdn/xxxxxxxxxxxxx.png",
    "name": "xxxxxxxxxxxx",
    "description": "aaaaaaaaaaaaaaa" 
  },
  "posts": [{
    "postId": "yyyyyyy-yyyyyyy-yyyy-yyyy",
    "body": "welcome to heeeeeeeeeeeeeeeeeell"
  }],
  ...
}
```

サーバー側で RDB のリレーションを辿って JOIN したりしながら素直に取得するとこういった形のデータになりがちです。

あなたがサーバーサイドの設計にまで口を出せる立場であればエイヤと直してしまうのも良いかもしれませんが、そうではない可哀想な JSON 色付け戦士の皆さんのために、一旦このデータ構造のままステップアップでデータを Render-as-You-Fetch パターンに適した形に変形していくことにします。

とはいえ、それには一旦フロントエンドをどういう構造にするかを決めないと話が進まないので、ここでは以下のようなコンポーネントとしたいと思います。

```tsx

// ユーザープロフィールを表示するコンポーネント
function UserProfile() {
  return <article>
    <section>
      <img src={data.iconUrl} />
      <span>
        {data.name}
      </span>
      <section>
        {data.description}
      </section>
    </section>
  </article>
}

// ユーザーの投稿したコンテンツを表示するコンポーネント
function UserPosts() {
  return <article>
    {data.map(v => (
      <article>
        {v.body}
      </article>
    ))}
    </article>
}


// 上記2つを集約するコンポーネント
function UserPage() {
  return <main>
      <div>
          <UserProfile />
      </div>
      <div>
          <UserPosts />
      </div>
    </main>
}

```

擬似コードなので未定義の変数があります。

あからさまに先ほど示したごちゃまぜJSONと構造が1対1なので、まあそりゃそうだろと思うかもしれませんがもう少しお付き合いください。

さて、従来までの考え方であれば、`UserPage` にドカンと JSON を取得する処理を書いて、それを props 経由で渡したりしていましたよね。

```tsx
function UserPage() {
  const user = useRecoilValue(userSelector);
  return <main>
      <div>
          <UserProfile profile={user.profile} />
      </div>
      <div>
          <UserPosts posts={user.posts} />
      </div>
    </main>
}
```

しかし、 Render-as-You-Fetch パターンでは以下のようにします。

```tsx

function UserProfile() {
  const data = useRecoilValue(userProfileSelector);
  return <article>
    <section>
      <img src={data.iconUrl} />
      <span>
        {data.name}
      </span>
      <section>
        {data.description}
      </section>
    </section>
  </article>
}

function UserPosts() {
  const data = useRecoilValue(userPostsSelector);
  return <article>
    {data.map(v => (
      <article>
        {v.body}
      </article>
    ))}
  </article>
}

```

よって、これらを集約するコンポーネントは元の見た目のままです。

```tsx
function UserPage() {
  return <main>
      <div>
          <UserProfile />
      </div>
      <div>
          <UserPosts />
      </div>
    </main>
}
```

props 渡しのやり方に慣れていると「え！？子コンポーネントが外部のデータに依存していいの！？」となんとなく違和感を覚えるかもしれません。  
しかし、これが Render-as-You-Fetch パターンなのです。  

**コンポーネントが欲しいデータはコンポーネント自身に取得させる** という考え方の真髄は **コンポーネントをデータの「流れ」の依存から断ち切る** ことが出来るという利点にあります。  

おっと、話を先に進める前に `userProfileSelector` と `userPostsSelector` の定義も一応見ておきましょう。

```ts
const userProfileSelector = selector({
  key: "user/userProfileSelector",
  get: ({get}) => {
    const { profile } = get(userSelector);
    return profile;
  }
});

const userPostsSelector = selector({
  key: "user/userPostsSelector",
  get: ({get}) => {
    const { posts } = get(userSelector);
    return posts;
  }
});
```

selector は他の atom や selector からデータを取得できる、ということを知っている人であれば、この書き方は特に違和感のないものだと思います。  
これは Recoil を使ってステート管理をするときはこのように **なるべく小さい単位で扱う** という原則を守るのが良いやり方であるという発想に基づくものですが、このやり方は  Render-as-You-Fetch パターンと相性のよいものであることが分かるのではないでしょうか。

ちなみに、 `userProfileSelector` と `userPostsSelector` は `get:` に渡されている関数が通常の関数であるため一見非同期セレクターではありませんが、 `userSelector` という非同期セレクターに依存しているため、 **これらのセレクターも非同期セレクターとして扱われる** ことには注意しましょう。  

よって、コンポーネントも以下のように修正しておきます。

```tsx
function UserPage() {
  return <main>
      <div>
        <Suspense fallback={<div>Loading...</div>}>
          <UserProfile />
        </Suspense>
      </div>
      <div>
        <Suspense fallback={<div>Loading...</div>}>
          <UserPosts />
        </Suspense>
      </div>
    </main>
}
```

このように `<Suspense>` で細かく囲うことで、非同期処理中に Suspend される範囲を最小限にすることが出来ます。(さもなければ、一番近くの親コンポーネントにある `<Suspense>` の範囲まで描画の中断が伝播し、画面が大きくガクガクする要因になることがあります)

※ ちなみに `<Suspense>` をどうしても使いたくない人向けに `useRecoilValueLoadable` というのもあります。

# データを分割ロードせよ

さて、ここまででかなりいい感じにコンポーネントを分割統治させることに成功しましたが、まだ甘いところがあります。  
それは `UserPosts` コンポーネントです。


```tsx
function UserPosts() {
  const data = useRecoilValue(userPostsSelector);
  return <article>
    {data.map(v => (
      <article>
        {v.body}
      </article>
    ))}
  </article>
}
```

例えば、 `posts` に入っているデータは「処理負荷等の都合で ID のみが入っており、詳細なデータは個別に取得する」というような設計であった場合どうなるでしょうか。

```json
{
  ...,
  "posts": [
    {
      "postId": "yyyyyyy-yyyyyyy-yyyy-yyyy",
    },
    {
      "postId": "zzzzzzz-zzzzzzz-zzzz-zzzz",
    },
    {
      "postId": "vvvvvvv-vvvvvvv-vvvv-vvvv",
    },
    ...
  ],
}
```

とするとこう書くしかなさそうですかね？

```tsx
const userPostsSelector = selector({
  key: "user/userPostsSelector",
  get: ({get}) => {
    const { posts } = get(userSelector);

    const p = new URLSearchParams();
    posts.forEach(post => p.append("ids", post.postId));

    const res = await fetch(`/user/posts?${p.toString()}`);

    return await res.json();
  }
});
```

あーはいはい、これでもいいじゃんって？  
じゃあさらに「処理負荷の関係で `posts` は一度に全部取らせたくないので、続きが欲しかったら nextToken 突っ込んでページングして」と言われたらどうしますか？  
気合で頑張りますか？お、いいですねぇ。

```tsx
const postsPagingInfoAtom = selector({
  key: "user/postsPagingInfoAtom",
  default: null
});

const userPostsSelector = selector({
  key: "user/userPostsSelector",
  get: ({get}) => {
    const { posts } = get(userSelector);
    const nextToken = get(postsPagingInfoAtom);

    const p = new URLSearchParams();
    posts.forEach(post => p.append("ids", post.postId));

    if (nextToken != null) {
      p.append("next", nextToken);
    }

    const res = await fetch(`/user/posts?ids=${p.toString()}`);
    // ちなみに、get の中で他の atom は更新 **出来ない** ので、ここで帰って来るであろう nextToken の取得と更新についてはちょっと工夫する必要がある
    return await res.json(); 
  }
});
```

さて、かなり **地獄** めいてきました。 ~~JSON 色付け戦士はしめやかに爆発四散！~~  
ちなみにこのコードだと以前取得した分は消失するので、ちゃんとキャッシュ的なのに突っ込んだりする必要があります。ｳﾜｱｱｱｱ!!!

というわけで、そんなみなさんのために `selectorFamily` をご紹介します。  

```ts

const userPostSelector = selectorFamily<UserPost, { postId: string }>({
  key: "user/userPostSelector",
  get: ({ postId }) => () => {
    const res = await fetch(`/user/posts?ids=${p.postId}`);
    return await res.json();
  }
});
```

`selectorFamily` とは、簡単に言えば **Key-Value の形式を取ることが出来る selector** です。  
通常の atom/selector は単一の存在で、そこから取り出せるデータは常に1種類だけでした。

この `selectorAtom/selectorFamily` はキーを取ることが出来、異なるキーを渡した場合は違うデータが格納/取得されるようにすることが出来ます。  

この性質はまさに分割統治の考え方に最適です。  
まだピンと来ないみなさんのために、実際に使用例を見ていきましょう。

```tsx
type Props = {
  postId: string
}

function UserPost({ postId }: Props) {
  const data = useRecoilValue(userPostSelector({ postId }));
  return <article>
    <section>
      {data.body}
    </section>
    <section>
      {data.createdAt}
    </section>
  </article>
}
```

はい、こんな感じです。ピンと来ましたか？ (来ない場合は[公式ドキュメント](https://recoiljs.org/docs/api-reference/utils/selectorFamily/)を見ましょう。)

当然これは UserPosts ではこう使えます。

```tsx
function UserPosts() {
  const data = useRecoilValue(userPostsSelector);
  return <article>
    {data.map(v => (
      <Suspense fallback="...">
        <UserPost key={v.postId} postId={v.postId} />
      </Suspense>
    ))}
  </article>
}
```

なんだかそれっぽくなってきましたね。  
**「あれあれ、 props 渡し使っちゃっていいの？」なんて意地悪を言う人はビンタします。** ~~使っていいに決まってるだろ~~

まあ、こういうような場面では「表示したいデータの一部を親から受けとる」という設計は妥当かなとは思いますね。

(なお、残念ながら nextToken を辿りながら順番に取っていく処理は微妙に selector の性質と相性が悪いので自力でそこそこ頑張る必要があります、悲しいね)

というわけで、これで posts の分割統治も完了したわけですが、何か忘れているような。

・・・

```ts
const userPostSelector = selectorFamily<UserPost, { postId: string }>({
  key: "user/userPostSelector",
  get: ({ postId }) => () => {
    const res = await fetch(`/user/posts?ids=${p.postId}`); // あれ？
    return await res.json();
  }
});
```

**そういえばさっき作ったここ、もしかして UserPost 1個ごとにリクエスト飛んでね？**

というわけで最後にもう一息です。  

# dataloader でリクエストをバッチングせよ

最後はパフォーマンスに関するお話です。

前項で UserPost 1つ1つを分割統治したまではいいのですが、このままでは UserPost を表示しようとした箇所の数だけリクエストが飛んでしまいます。

あなたの財布が無限にあれば無限にサーバーを強化すればいいのですが、大抵の場合そういうわけには行かないとは思うのでここは対策を考えましょう。

先ほどさらっと出てきたAPIは、 **postId を複数個取ると、指定した postId の UserPost を取得してくる** という地味に親切な設計でした。

```
// API仕様書のようなナニカ

GET /user/post
Query:
   `ids` string[]

Response:
{
  "posts": {
    "id1": {
      ...
    },
    "id2": {
      ...
    },
  }
}

```

であれば、**複数同時に発生したAPIリクエストは1つにまとめたい** というのが自然な欲求です。

というわけで、そういうのを実現してくれるライブラリを使いましょう。

https://github.com/graphql/dataloader

### DataLoader くんです。

graphql ファミリーの一人らしいですが、実は単体でも使えます。  
たぶん複数個の GraphQL クエリを投げつけるときに一つにまとめてくれる的な使い方が想定されているんだと思います(GraphQLで開発したことない(したいなあ))

で、実は GraphQL のリクエスト意外にも使えるように柔軟な設計になっており、以下の様に使うことが出来ます。

```ts
const userPostLoader = new Dataloader(async (ids: ReadonlyArray<string>) => {
    const p = new URLSearchParams();
    posts.forEach(post => p.append("ids", post.postId));
    const res = await fetch(`/user/posts?ids=${p.toString()}`);

    const resJson = await res.json();

    // dataloader は所得したデータを ids の順番通りに並べる必要があり、存在しなかったデータは null を返す必要がある
    return ids.map(id => resJson.posts[id] ?? null);
});
```

中身はだいたい元々書こうとしていた `userPostsSelector` の中身にだいぶ近いものになっているので、さほど難しくはないと思います。

```tsx
const userPostsSelector = selector({
  key: "user/userPostsSelector",
  get: ({get}) => {
    const { posts } = get(userSelector);
    // このへんから
    const p = new URLSearchParams();
    posts.forEach(post => p.append("ids", post.postId));
    const res = await fetch(`/user/posts?${p.toString()}`);
    // このへんまで

    return await res.json();
  }
});
```

そして、この `userPostLoader` を以下の様に使います。

```ts
const userPostSelector = selectorFamily<UserPost, { postId: string }>({
  key: "user/userPostSelector",
  get: ({ postId }) => () => {
    const res = await userPostLoader.load(postId);
    return await res.json();
  }
});
```

こうすることで、一度に発生したリクエストを一定時間ごとにまとめてくれるようになりました、すごい！！！

# まとめ

というわけで、ここまでで Recoil + Suspense + dataloader を使って、React における非同期処理の痛みを少しでも軽くするためのテクニックを紹介してきました。  
それなりに分量の多い記事になっている気がするので、 **アドカレがあるような今みたいな忙しい時期ではなく**、ぜひ冬休み期間に眺めるなどしてじっくり見ていただければ幸いです。

### __JSON 色付け戦士のみなさまの明日に幸あれ・・・__

# あとがき

今回の記事を執筆するにあたり、本リポジトリには **実際に今回の記事で出てきたようなパターンを適用した簡単なウェブアプリ** を置いてあります。

ぜひソースコードを見たり、アプリを触ったり F12 開発者ツールを押して、フロントエンドからのリクエストが実際にまとめられているのを観察してみてください。

https://react-divide-demo.vercel.app/

(なお、今回利用させてもらった API に複数地点の情報をまとめて取得するAPIというのはなかったので、 Next.js の API Route の処理の中では個別に取得するAPIを何回か叩くという設計になっています。 )

明日の記事は xxx さんの yyy です。
