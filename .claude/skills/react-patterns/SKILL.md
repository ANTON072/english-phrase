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

## eval / with 文を使わない（unsupported-syntax）

`eval` や `with` は React Compiler の静的解析を妨げ、最適化が効かなくなる。セキュリティリスクもある。

```tsx
// ❌ アンチパターン
const result = eval(code);
```

動的プロパティアクセスはブラケット記法で代替できる。

```tsx
// ✅ ブラケット記法
const value = props[propName];
```

参考: https://react.dev/reference/eslint-plugin-react-hooks/lints/unsupported-syntax
