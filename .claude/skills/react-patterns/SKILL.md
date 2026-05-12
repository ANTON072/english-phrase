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
