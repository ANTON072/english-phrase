---
name: react-patterns
description: Reactコンポーネント・フック実装時に参照するパターン集。useEffect・state管理・パフォーマンス最適化などのベストプラクティスを定義する。React実装時に使用する。
allowed-tools: Read, Edit, Write
---

# React パターンスキル

React実装時に守るべきパターンと避けるべきアンチパターンを定義します。

## state の同期に useEffect を使わない

### アンチパターン

props の変更に連動して state をリセットするために `useEffect` を使うのは**禁止**。

```tsx
// ❌ アンチパターン
useEffect(() => {
  setStarred(initialStarred);
}, [phraseId, initialStarred]);
```

**問題点**:
- 余分な再レンダリングが発生する（effect → setState → 再レンダリング）
- `eslint-plugin-react-hooks` の `set-state-in-effect` ルール違反

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect

### 正しいパターン: レンダリング中の state 調整

props（またはその派生値）が変わったタイミングで state をリセットするには、
レンダリング中に直接 setState を呼ぶ。

```tsx
// ✅ 正しいパターン
const [prevId, setPrevId] = useState(id);
const [value, setValue] = useState(initialValue);

if (prevId !== id) {
  setPrevId(id);
  setValue(initialValue);
}
```

これにより同一レンダリング内でリセットが完結し、余分なレンダリングが発生しない。

参考: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes

---

## レンダリング中に無条件で setState を呼ばない（set-state-in-render）

レンダリング中に条件なく `setState` を呼ぶと無限ループが発生する。

```tsx
// ❌ アンチパターン
function Component({ value }) {
  const [count, setCount] = useState(0);
  setCount(value); // 無限ループ
  return <div>{count}</div>;
}
```

制約の適用はイベントハンドラで行う。前回値との比較が必要な場合のみレンダリング中の調整パターンを使う。

```tsx
// ✅ イベントハンドラで制約を適用
function Counter({ max }) {
  const [count, setCount] = useState(0);
  const increment = () => setCount(c => Math.min(c + 1, max));
  return <button onClick={increment}>{count}</button>;
}
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-render

---

## コンポーネント内でコンポーネントを定義しない（static-components）

コンポーネント内でコンポーネントを定義すると、レンダリングのたびに新しい型として扱われ、毎回マウント・アンマウントが発生して state が失われる。

```tsx
// ❌ アンチパターン
function Parent() {
  const Child = () => {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
  };
  return <Child />; // レンダリングのたびに state がリセット
}
```

コンポーネントは必ずモジュールのトップレベルで定義し、必要な値は props で渡す。

```tsx
// ✅ モジュールトップレベルで定義
function Child({ count, onIncrement }) {
  return <button onClick={onIncrement}>{count}</button>;
}

function Parent() {
  const [count, setCount] = useState(0);
  return <Child count={count} onIncrement={() => setCount(count + 1)} />;
}
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/static-components

---

## useMemo のコールバックは必ず値を返す（use-memo）

`useMemo` は計算結果のキャッシュが目的。return がないと常に `undefined` になる。

```tsx
// ❌ アンチパターン
const processed = useMemo(() => {
  data.forEach(item => console.log(item)); // return なし → undefined
}, [data]);
```

副作用が必要なら `useEffect` を使い、`useMemo` は純粋な計算のみに使う。

```tsx
// ✅ 計算結果を返す
const processed = useMemo(() => data.map(item => item * 2), [data]);
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/use-memo

---

## フックの依存配列は網羅的に指定する（exhaustive-deps）

`useEffect` / `useMemo` / `useCallback` 内で参照する値はすべて依存配列に含める。
漏れがあると古い値を参照し続けるバグになる。

```tsx
// ❌ userId が依存配列に含まれていない
useEffect(() => {
  fetchUser(userId);
}, []);

// ✅ すべての参照値を含める
useEffect(() => {
  fetchUser(userId);
}, [userId]);
```

関数が毎レンダリングで再生成されてループになる場合は `useCallback` で安定化する。

```tsx
const logItems = useCallback(() => console.log(items), [items]);
useEffect(() => { logItems(); }, [logItems]);
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps

---

## フックはトップレベルでのみ呼ぶ（rules-of-hooks）

フックを条件分岐・ループ・早期 return 後・コールバック内で呼んではいけない。
React はフックの呼び出し順序で状態を管理しているため、順序が変わるとバグになる。

```tsx
// ❌ 条件分岐内
if (isLoggedIn) {
  const [user, setUser] = useState(null);
}

// ❌ 早期 return 後
if (!data) return <Loading />;
const [processed, setProcessed] = useState(data);
```

条件は必ずフックの内側に入れる。

```tsx
// ✅ 条件をフック内に閉じ込める
useEffect(() => {
  if (isLoggedIn) fetchUserData();
}, [isLoggedIn]);

// ✅ 初期値で条件付け
const [permissions, setPermissions] = useState(
  userType === 'admin' ? adminPerms : userPerms
);
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks

---

## 高階関数内でコンポーネント・フックを定義しない（component-hook-factories）

関数内でコンポーネントやフックを生成すると、呼び出すたびに新しい型として扱われ
コンポーネントが毎回マウント・アンマウントされて state が失われる。

```tsx
// ❌ ファクトリー関数でコンポーネントを生成
function createComponent(defaultValue) {
  return function Component() { /* ... */ };
}

// ❌ フックのファクトリー
function createHook(endpoint) {
  return function useData() { /* ... */ };
}
```

コンポーネントもフックも必ずモジュールのトップレベルで定義し、動的な動作は props で渡す。

```tsx
// ✅ トップレベルで定義、値は props で受け取る
function Component({ defaultValue }) { /* ... */ }
function useData(endpoint) { /* ... */ }
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/component-hook-factories

---

## レンダリング中にグローバル変数を変更しない（globals）

レンダリングは純粋関数であるべきで、グローバル変数への副作用は禁止。

```tsx
// ❌ グローバルを変更
let renderCount = 0;
function Component() {
  renderCount++; // 副作用
  return <div>{renderCount}</div>;
}
```

状態は `useState` / `useContext` で管理し、副作用は `useEffect` 内に閉じ込める。

```tsx
// ✅ useEffect 内で副作用を実行
useEffect(() => {
  document.title = title;
}, [title]);
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/globals

---

## props / state を直接変更しない（immutability）

配列・オブジェクトを直接変更しても React は差分を検知できず再レンダリングされない。
常に新しい参照を作成して setter に渡す。

```tsx
// ❌ 直接変更
items.push(4);
setItems(items);

user.name = 'Bob';
setUser(user);

setItems(items.sort()); // sort() は破壊的
```

```tsx
// ✅ 新しい参照を作成
setItems([...items, 4]);
setUser({ ...user, name: 'Bob' });
setItems([...items].sort());
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/immutability

---

## レンダリング中に不純な関数を呼ばない（purity）

`Math.random()` / `Date.now()` / `crypto.randomUUID()` などをレンダリング中に呼ぶと
毎回異なる値が返されメモ化が破綻し、SSR ではハイドレーション不一致が起きる。

```tsx
// ❌ レンダリング中に呼び出し
function Component() {
  const id = Math.random();
  return <div key={id}>Content</div>;
}
```

`useState` の初期化関数または `useEffect` 内に移動する。

```tsx
// ✅ 初期化関数内（初回のみ実行）
const [id] = useState(() => crypto.randomUUID());

// ✅ useEffect 内で管理
useEffect(() => {
  const interval = setInterval(() => setTime(Date.now()), 1000);
  return () => clearInterval(interval);
}, []);
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/purity

---

## ref はレンダリング中に読み書きしない（refs）

`ref.current` の読み書きはレンダリング外（`useEffect` やイベントハンドラ）で行う。
レンダリング中の ref 操作は React の最適化を破壊する。

```tsx
// ❌ レンダリング中に読み書き
function Component({ value }) {
  const ref = useRef(null);
  ref.current = value; // レンダリング中の書き込み禁止
  return <div>{ref.current}</div>; // レンダリング中の読み取り禁止
}
```

UI に表示する値は `useState` を使う。DOM 操作など副作用は `useEffect` 内で行う。
遅延初期化（`if (ref.current === null)`）は例外的に許可されている。

```tsx
// ✅ useEffect 内で操作
useEffect(() => {
  console.log(ref.current.offsetWidth);
});
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/refs

---

## レンダリング中のエラーは Error Boundary で捕捉する（error-boundaries）

React のレンダリング中に発生するエラーは `try/catch` では捕捉できない。

```tsx
// ❌ try/catch では捕捉不可
function Parent() {
  try {
    return <Child />; // レンダリング中のエラーは catch されない
  } catch (e) {
    return <div>Error</div>;
  }
}
```

`<ErrorBoundary>` コンポーネントでラップする。

```tsx
// ✅
<ErrorBoundary fallback={<div>Failed</div>}>
  <Child />
</ErrorBoundary>
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/error-boundaries

---

## 手動メモ化の依存配列を完全に保つ（preserve-manual-memoization）

`useMemo` / `useCallback` を使う場合、依存配列が不完全だと古い値を参照し続ける。

```tsx
// ❌ filter が依存配列に含まれていない
const filtered = useMemo(() => data.filter(filter), [data]);

// ✅ すべての依存を含める
const filtered = useMemo(() => data.filter(filter), [data, filter]);
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/preserve-manual-memoization
